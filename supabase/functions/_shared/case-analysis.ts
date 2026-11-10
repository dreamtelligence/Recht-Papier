import { timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2.115.0";

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors,
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store",
    },
  });
}
export type Snapshot = {
  description: string;
  revision: number;
  facts: { statement: string; occurred_on?: string }[];
  documents: {
    file_name: string;
    extracted_text?: string;
    processing_error?: string;
  }[];
};
export type AnalysisJob = {
  run_id: string;
  case_id: string;
  owner_id: string;
  snapshot: Snapshot;
  claim_id: string | null;
};
export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ERLAUBTE_MODELLE = ["Qwen/Qwen3.8-27B-FP8"];
const RECHTSGEBIETE: Record<string, string> = {
  arbeitsrecht: "arbeitsrecht",
  mietrecht: "mietrecht",
};

export function pseudonymisieren(text: string): string {
  let n = 0;
  const vergeben = new Map<string, string>();
  const platzhalter = (schluessel: string, art: string) => {
    const bekannt = vergeben.get(schluessel.toLowerCase());
    if (bekannt) return bekannt;
    n += 1;
    const neu = `[${art}_${n}]`;
    vergeben.set(schluessel.toLowerCase(), neu);
    return neu;
  };

  return text
    // Firmen zuerst: "Nordlicht Logistik GmbH" muss als Ganzes fallen, sonst
    // bleibt der Name stehen und nur die Rechtsform verschwindet.
    .replace(
      /\b(?:[A-ZÄÖÜ][\wäöüß.&-]*\s+){1,4}(?:GmbH\s*&\s*Co\.\s*KG|GmbH|gGmbH|mbH|AG|KGaA|KG|OHG|UG(?:\s*\(haftungsbeschränkt\))?|e\.\s?V\.|e\.\s?K\.|SE)\b/g,
      (treffer) => platzhalter(treffer, "FIRMA"),
    )
    // Anrede plus Name: "Frau Marlene Habicht", "Herrn Jonas Petersen".
    .replace(
      /\b(Herrn?|Frau|Fr\.|Hr\.)\s+((?:Dr\.\s+|Prof\.\s+)?[A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+){0,2})/g,
      (_t, anrede, name) => `${anrede} ${platzhalter(name, "PERSON")}`,
    )
    // Unterschriften: "i. A. Tobias Grewe" — juristisch zaehlt das "i. A.",
    // nicht wer dahintersteht, also bleibt es erhalten.
    .replace(
      /\b(i\.\s?[AV]\.|gez\.)\s+((?:Dr\.\s+)?[A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+){0,2})/g,
      (_t, kuerzel, name) => `${kuerzel} ${platzhalter(name, "PERSON")}`,
    )
    // Strassen mit Hausnummer.
    .replace(
      /\b[A-ZÄÖÜ][\wäöüß.-]*(?:straße|strasse|str\.|weg|allee|platz|gasse|ring|damm|ufer)\s+\d+\s*[a-z]?\b/gi,
      (treffer) => platzhalter(treffer, "ADRESSE"),
    )
    // Postleitzahl plus Ort.
    .replace(
      /\b\d{5}\s+[A-ZÄÖÜ][a-zäöüß-]+(?:\s+[A-ZÄÖÜ][a-zäöüß-]+)?\b/g,
      (treffer) => platzhalter(treffer, "ORT"),
    )
    .replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, (t) => platzhalter(t, "EMAIL"))
    .replace(
      /\b(?:Tel\.?|Telefon|Fax)[:\s]*[\d\s/()+-]{6,}/gi,
      (t) => platzhalter(t, "TELEFON"),
    )
    .replace(
      /\b[A-Z]{2}\d{2}[\s]?(?:[\dA-Z]{4}[\s]?){2,7}[\dA-Z]{1,4}\b/g,
      (t) => platzhalter(t, "IBAN"),
    )
    // Personalnummern und Aktenzeichen der Gegenseite.
    .replace(
      /\b(Personalnummer|Kundennummer|Aktenzeichen|Az\.)[:\s]*[\w./-]+/gi,
      (t) => {
        const [kopf] = t.split(/[:\s]/);
        return `${kopf} ${platzhalter(t, "KENNUNG")}`;
      },
    );
}

// ---------------------------------------------------------------------------
// Fristen aus der Antwort heben
// ---------------------------------------------------------------------------

const DATUM = /\b(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{4})\b/;
const PARAGRAPH =
  /§+\s?\d+[a-z]?(?:\s+Abs\.\s?\d+)?(?:\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß]*)?/;
const ZITAT = /\[(\d+)\]/g;

// Von einer Frist muss ausdruecklich die Rede sein, und sie muss ablaufen.
// Nachgemessen am 05.09.2026 an echten Antworten: ein Datum neben einem
// Fristbegriff ist sonst meistens etwas anderes — der Zugang des Schreibens,
// das Ende des Arbeitsverhaeltnisses, die Dauer der Betriebszugehoerigkeit.
const FRIST_WORT = /\bfrist(?:en)?\b/i;
const FRISTABLAUF =
  /(?:endet|läuft\b[^.]{0,40}\bab\b|abläuft|abgelaufen|spätestens|bis\s+zum|ablauf)/i;

type Fundstelle = { reference: string; locator: string | null; id?: string };

/**
 * Fristen einsammeln — nur solche, die die Analyse selbst genannt hat.
 *
 * Bewusst streng, in drei Stufen: der Satz muss ein konkretes Datum tragen, er
 * muss von einem Fristablauf sprechen, und er muss belegt sein — entweder mit
 * einem Paragraphen im Klartext oder mit einer Quellen-ID. Fehlt eines davon,
 * waere das Rechnen auf eigene Faust, und eine selbst ausgedachte Frist ist
 * schlimmer als gar keine.
 *
 * Die Quellen-ID ist der haeufigere Fall: das Modell schreibt „Die Frist endet
 * am 21.09.2026 [3]" und nicht „§ 4 KSchG". Ueber `[3]` findet die Frist
 * trotzdem zu ihrer Fundstelle — und zu der Zeile in `case_sources`, an der
 * sie dann haengt.
 *
 * Was hier entsteht, ist ein Vorschlag: `confirmed` bleibt `false`, und ohne
 * Bestaetigung darf daraus keine Erinnerung werden. Dieselbe Regel wie bei
 * `case_facts` — unbestaetigte Angaben tragen keine Schreiben.
 */
export function fristenAusAntwort(
  antwort: string,
  belege: Map<string, Fundstelle>,
): {
  label: string;
  due_on: string;
  basis: string;
  note: string;
  source_id: string | null;
}[] {
  const gefunden: {
    label: string;
    due_on: string;
    basis: string;
    note: string;
    source_id: string | null;
  }[] = [];
  const gesehen = new Set<string>();

  // Absatzweise, damit ein Beleg nur von einem Nachbarsatz geerbt wird, der
  // wirklich danebensteht.
  for (const absatz of antwort.split(/\n{2,}/)) {
    const saetze = absatz.split(/(?<=[.!?])\s+|\n+/);

    for (let i = 0; i < saetze.length; i++) {
      const satz = saetze[i].replace(/[*_`#]/g, "").trim();
      if (!satz) continue;

      if (!FRIST_WORT.test(satz) || !FRISTABLAUF.test(satz)) continue;

      // Das Datum muss **hinter** dem letzten Wort "Frist" stehen. Sonst
      // greift der Satz "Da Ihnen die Kuendigung am 31.08.2026 zugegangen
      // ist, laeuft die Frist am 21.09.2026 ab" das Zugangsdatum ab — und
      // eine um drei Wochen zu frueh gespeicherte Klagefrist waere schlimmer
      // als gar keine.
      const abFrist = satz.slice(satz.toLowerCase().lastIndexOf("frist"));
      const datum = abFrist.match(DATUM);
      if (!datum) continue;

      const paragraph = satz.match(PARAGRAPH);
      const zitiert = [...satz.matchAll(ZITAT)].map((t) => t[1]);
      let beleg = zitiert.map((id) => belege.get(id)).find(Boolean);

      // Das Modell schreibt die Fundstelle oft in den Satz davor ("… Klage
      // beim Arbeitsgericht einzureichen [3]. Da Ihnen die Kuendigung … ist,
      // laeuft die Frist am 21.09.2026 ab."). Ein Beleg aus dem unmittelbar
      // vorangehenden Satz desselben Absatzes zaehlt deshalb mit — weiter
      // zurueck nicht, das waere Zuordnen auf Verdacht.
      if (!paragraph && !beleg && i > 0) {
        const davor = saetze[i - 1].replace(/[*_`#]/g, "");
        beleg = [...davor.matchAll(ZITAT)].map((t) => belege.get(t[1])).find(
          Boolean,
        );
      }
      if (!paragraph && !beleg) continue;

      const basis = paragraph
        ? paragraph[0].trim()
        : `${beleg!.reference}${beleg!.locator ? ` ${beleg!.locator}` : ""}`
          .trim();

      const [, tag, monat, jahr] = datum;
      const iso = `${jahr}-${monat.padStart(2, "0")}-${tag.padStart(2, "0")}`;
      const schluessel = `${iso}|${basis}`;
      if (gesehen.has(schluessel)) continue;
      gesehen.add(schluessel);

      gefunden.push({
        label: satz.length > 120 ? `${satz.slice(0, 117)}…` : satz,
        due_on: iso,
        basis,
        note: satz,
        source_id: beleg?.id ?? null,
      });
    }
  }
  return gefunden;
}

export function buildAnalysisInput(snapshot: Snapshot): string {
  if (
    snapshot.documents.some((d) =>
      !d.extracted_text?.trim() || d.processing_error
    )
  ) {
    throw new Error(
      "Mindestens ein Dokument wurde noch nicht vollständig gelesen. Bitte prüfen Sie die Dokumente.",
    );
  }
  const sections = [snapshot.description.trim()];
  for (const fact of snapshot.facts) {
    sections.push(
      fact.occurred_on
        ? `${fact.occurred_on}: ${fact.statement}`
        : fact.statement,
    );
  }
  for (const doc of snapshot.documents) {
    if (doc.extracted_text) {
      sections.push(
        `Aus dem Dokument "${doc.file_name}":\n${doc.extracted_text}`,
      );
    }
  }
  const text = pseudonymisieren(sections.join("\n\n"));
  if (text.length > 8000) {
    throw new Error(
      "Der Fall umfasst mehr als 8000 Zeichen. Bitte grenzen Sie die Unterlagen ein.",
    );
  }
  return text;
}

export async function failJob(
  worker: Pick<SupabaseClient, "rpc">,
  run: string,
  message: string,
  status = 502,
) {
  const { error } = await worker.rpc("fail_case_analysis_job", {
    p_run: run,
    p_error: message,
  });
  if (error) {
    return json({
      error: "Der Auftragsstatus konnte nicht gespeichert werden.",
    }, 500);
  }
  return json({ error: message, request_id: run }, status);
}

export async function persistAnalysis(
  worker: Pick<SupabaseClient, "rpc">,
  job: AnalysisJob,
  daten: Record<string, unknown>,
): Promise<Response> {
  const lauf = {
    p_case: job.case_id,
    p_owner: job.owner_id,
    p_run: job.run_id,
  };
  const requestId = job.run_id;
  const snapshot = job.snapshot;
  const gescheitert = (message: string, status = 502) =>
    failJob(worker, requestId, message, status);
  // Modal serialisiert Validierungsfehler als HTTP 200 mit `error` im Rumpf.
  // Der Statuscode allein reicht als Pruefung deshalb nicht.
  if (typeof daten?.error === "string" && !daten?.answer) {
    return await gescheitert(
      "Die Anfrage wurde von der Rechtsdatenbank abgelehnt.",
    );
  }

  const modell = String(daten.model ?? "");
  if (!ERLAUBTE_MODELLE.includes(modell)) {
    // Nichts speichern. Eine Antwort von einem nicht offengelegten Anbieter
    // gehoert nicht in eine Fallakte, auch keine richtige.
    if (modell === "error") {
      // Die Engine legt den Grund in `answer`. Er darf nicht nach draussen —
      // aber "aufgebrauchtes Kontingent" ist etwas anderes als "kaputt", und
      // wer das nicht unterscheidet, sucht den Fehler an der falschen Stelle.
      // Nachgemessen am 05.09.2026: der Gratis-Tarif von gemini-2.5-flash-lite
      // deckelt bei 20 Anfragen pro Tag und Projekt.
      const grund = String(daten.answer ?? "");
      if (/429|RESOURCE_EXHAUSTED|quota/i.test(grund)) {
        return await gescheitert(
          "Die Einordnung ist zurzeit ausgelastet. Bitte spaeter erneut versuchen.",
          503,
        );
      }
      return await gescheitert(
        "Die Rechtsdatenbank konnte keine Einordnung erzeugen.",
      );
    }
    if (modell === "none") {
      return await gescheitert(
        "Zu diesem Sachverhalt wurden keine Rechtsgrundlagen gefunden.",
      );
    }
    return await gescheitert(
      "Die Einordnung kam von einem nicht freigegebenen Modell und wurde verworfen.",
    );
  }

  const antworttext = String(daten.answer ?? "").trim();
  if (!antworttext) {
    return await gescheitert("Die Einordnung kam ohne Text zurueck.");
  }

  const zitate = Array.isArray(daten.citations)
    ? (daten.citations as Record<string, unknown>[])
    : [];
  const belegbar = zitate.filter((z) =>
    String(z.reference ?? z.gesetz ?? "").trim()
  );
  if (belegbar.length !== zitate.length) {
    return await gescheitert(
      "Mindestens eine Fundstelle ist unvollständig. Die Analyse wurde nicht übernommen.",
      422,
    );
  }
  const quellen = belegbar.map((z) => ({
    kind: z.kind === "urteil" ? "urteil" : "gesetz",
    citation_id: String(z.id ?? "").replace(/[^\d]/g, ""),
    reference: String(z.reference ?? z.gesetz).trim(),
    locator: String(z.locator ?? z.paragraph ?? "").trim() || null,
    title: String(z.titel ?? "").trim() || null,
    url: String(z.url ?? "").trim() || null,
    valid_as_of: String(z.stand ?? "").trim() || null,
    excerpt: String(z.text_preview ?? "").trim() || null,
    relevance: typeof z.score === "number" ? z.score : null,
  }));

  // Die IDs kommen zurueck, damit eine Frist auf die Zeile zeigen kann, die sie
  // belegt. `insert` liefert sie in der Reihenfolge der Eingabe.
  const belege = new Map<string, Fundstelle>();
  quellen.forEach((q) =>
    belege.set(q.citation_id, {
      reference: q.reference,
      locator: q.locator,
      id: q.citation_id,
    })
  );

  const fristen = fristenAusAntwort(antworttext, belege).map((frist) => ({
    ...frist,
    citation_id: frist.source_id,
  }));
  const erkannt = String(daten.rechtsgebiet ?? "").trim().toLowerCase();
  const { data: gespeichert, error: speicherFehler } = await worker.rpc(
    "finish_case_analysis",
    {
      ...lauf,
      p_snapshot: snapshot,
      p_answer: antworttext,
      p_model: modell,
      p_audit: daten.answer_audit ?? null,
      p_source_audit: daten.source_audit ?? null,
      p_sources: quellen,
      p_deadlines: fristen,
      p_area: RECHTSGEBIETE[erkannt] ?? null,
    },
  );
  if (speicherFehler) {
    return await gescheitert(
      "Die Analyse konnte nicht vollständig gespeichert werden oder der Fall wurde zwischenzeitlich geändert.",
      409,
    );
  }
  if (!gespeichert?.released) {
    return json({
      error:
        "Die Einordnung hat die Quellenprüfung nicht bestanden. Sie bleibt ungeprüft und kann nicht exportiert werden.",
      request_id: requestId,
    }, 422);
  }

  return json({
    status: "analysiert",
    case_id: job.case_id,
    analysis_id: gespeichert.analysis_id,
    request_id: requestId,
    sources: quellen.length,
    deadlines: fristen.length,
    skipped_citations: zitate.length - quellen.length,
  });
}

export function authorized(
  expected: string | undefined,
  supplied: string | null,
): boolean {
  if (!expected || !supplied) return false;
  const a = new TextEncoder().encode(expected),
    b = new TextEncoder().encode(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}
