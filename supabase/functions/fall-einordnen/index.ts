// Die rechtliche Einordnung eines Falls.
//
// Der Client schickt nur die Fall-ID. Alles Weitere passiert hier: Token
// pruefen, Eigentuemerschaft aufloesen, Falltext zusammenstellen und
// pseudonymisieren, die Engine befragen, Analyse, Fundstellen und Fristen in
// die Akte schreiben. Die Antwort dieser Funktion ist fuer den Client fast
// bedeutungslos — er laedt danach die Fallakte neu und liest dort, was
// entstanden ist.
//
// Warum ueberhaupt serverseitig: Die Engine verlangt einen Schluessel, und ein
// Schluessel in einem Mobile-Bundle ist keiner. Ausserdem darf der Sachverhalt
// den Weg zur Engine nur ueber eine Stelle nehmen, an der er vorher
// pseudonymisiert wird.
//
// service_role kommt hier nicht vor. `cases`, `case_analyses`, `case_sources`
// und `case_deadlines` haben alle eine Owner-Policy ueber `owns_case()`; mit
// dem Nutzertoken zieht die Datenbank dieselbe Grenze wie sonst.

import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

// Kaltstart der Engine: gemessen 48-120 s, weil Einbettungsmodell und ein
// 211 MB grosser Index erst geladen werden. Darunter zu bleiben hiesse, den
// ersten Aufruf des Tages zuverlaessig abzuschneiden.
const ZEITLIMIT_MS = 170_000;

// Der Sachverhalt, den die Engine annimmt. Darueber schneidet sie selbst ab.
const MAX_SACHVERHALT = 8000;

// Welches Modell antworten darf. Die Engine kann technisch auf einen anderen
// Anbieter wechseln; eine Einwilligung nennt aber einen konkreten Empfaenger,
// und was nicht offengelegt ist, darf hier nicht in die Akte. Zweite
// Verteidigungslinie hinter `provider_order()` in Jura.
const ERLAUBTE_MODELLE = ["Qwen/Qwen3.8-27B-FP8"];

// Die Engine kennt ein gutes Dutzend Rechtsgebiete, `legal_area` genau zwei.
// Alles andere bleibt `null` — lieber kein Etikett als ein falsches.
const RECHTSGEBIETE: Record<string, string> = {
  arbeitsrecht: "arbeitsrecht",
  mietrecht: "mietrecht",
};

// ---------------------------------------------------------------------------
// Pseudonymisierung
// ---------------------------------------------------------------------------

/**
 * Namen, Firmen, Anschriften und Kontaktdaten durch Platzhalter ersetzen.
 *
 * Die Zuordnung lebt nur in dieser einen Ausfuehrung und wird nirgends
 * gespeichert. Das ist Absicht: ein Mapping in der Datenbank waere genau die
 * Verknuepfung, die die Pseudonymisierung aufheben soll. Spaetere Schreiben
 * greifen auf die Originaldaten in der Akte zurueck, nicht auf die Analyse.
 *
 * Was ausdruecklich stehen bleibt: Datumsangaben, Betraege, Fristen,
 * Beschaeftigtenzahlen, Paragraphen. Daran haengt die rechtliche Bewertung.
 * Ein Ersetzen waere hier nicht vorsichtig, sondern falsch.
 */
function pseudonymisieren(text: string): string {
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
    .replace(/\b(?:Tel\.?|Telefon|Fax)[:\s]*[\d\s/()+-]{6,}/gi, (t) => platzhalter(t, "TELEFON"))
    .replace(/\b[A-Z]{2}\d{2}[\s]?(?:[\dA-Z]{4}[\s]?){2,7}[\dA-Z]{1,4}\b/g, (t) => platzhalter(t, "IBAN"))
    // Personalnummern und Aktenzeichen der Gegenseite.
    .replace(/\b(Personalnummer|Kundennummer|Aktenzeichen|Az\.)[:\s]*[\w./-]+/gi, (t) => {
      const [kopf] = t.split(/[:\s]/);
      return `${kopf} ${platzhalter(t, "KENNUNG")}`;
    });
}

// ---------------------------------------------------------------------------
// Fristen aus der Antwort heben
// ---------------------------------------------------------------------------

const DATUM = /\b(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{4})\b/;
const PARAGRAPH = /§+\s?\d+[a-z]?(?:\s+Abs\.\s?\d+)?(?:\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß]*)?/;
const ZITAT = /\[(\d+)\]/g;

// Von einer Frist muss ausdruecklich die Rede sein, und sie muss ablaufen.
// Nachgemessen am 05.09.2026 an echten Antworten: ein Datum neben einem
// Fristbegriff ist sonst meistens etwas anderes — der Zugang des Schreibens,
// das Ende des Arbeitsverhaeltnisses, die Dauer der Betriebszugehoerigkeit.
const FRIST_WORT = /\bfrist(?:en)?\b/i;
const FRISTABLAUF = /(?:endet|läuft\b[^.]{0,40}\bab\b|abläuft|abgelaufen|spätestens|bis\s+zum|ablauf)/i;

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
function fristenAusAntwort(
  antwort: string,
  belege: Map<string, Fundstelle>,
): { label: string; due_on: string; basis: string; note: string; source_id: string | null }[] {
  const gefunden: { label: string; due_on: string; basis: string; note: string; source_id: string | null }[] = [];
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
        beleg = [...davor.matchAll(ZITAT)].map((t) => belege.get(t[1])).find(Boolean);
      }
      if (!paragraph && !beleg) continue;

      const basis = paragraph
        ? paragraph[0].trim()
        : `${beleg!.reference}${beleg!.locator ? ` ${beleg!.locator}` : ""}`.trim();

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

// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Nur POST." }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const engineUrl = (Deno.env.get("LEGAL_ENGINE_URL") ?? "").replace(/\/+$/, "");
  const engineKey = Deno.env.get("LEGAL_ENGINE_API_KEY") ?? "";

  if (!engineUrl) return json({ error: "Die Rechtsdatenbank ist nicht konfiguriert." }, 503);

  const asUser = createClient(url, anonKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: userData, error: userError } = await asUser.auth.getUser();
  if (userError || !userData?.user) return json({ error: "Nicht angemeldet." }, 401);

  let caseId = "";
  try {
    const body = await req.json();
    caseId = String(body?.case_id ?? "").trim();
  } catch {
    return json({ error: "Ungueltige Anfrage." }, 400);
  }
  if (!caseId) return json({ error: "case_id fehlt." }, 400);
  if (!/^[0-9a-f-]{36}$/i.test(caseId)) return json({ error: "Ungueltige Fall-ID." }, 400);

  // Row Level Security beantwortet die Eigentumsfrage.
  const { data: fall, error: fallFehler } = await asUser
    .from("cases")
    .select("id,title,description,status,legal_area")
    .eq("id", caseId)
    .maybeSingle();

  if (fallFehler) return json({ error: "Der Fall konnte nicht geladen werden." }, 500);
  if (!fall) return json({ error: "Fall nicht gefunden." }, 404);

  // Jeder Lauf ist ein kostenpflichtiger Modellaufruf. Ein Doppeltipp darf
  // keinen zweiten ausloesen, und zwei parallele Laeufe wuerden zwei Analysen
  // an dieselbe Akte haengen.
  const worker = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const requestId = crypto.randomUUID();
  const lauf = { p_case: caseId, p_owner: userData.user.id, p_run: requestId };
  const { data: snapshot, error: startFehler } = await worker.rpc("start_case_analysis", lauf);
  if (startFehler) return json({ error: "Die Prüfung konnte nicht gestartet werden." }, 500);
  if (!snapshot) return json({ status: "laeuft_bereits", case_id: caseId }, 409);

  async function gescheitert(grund: string, status = 502) {
    await worker.rpc("fail_case_analysis", lauf);
    return json({ error: grund, request_id: requestId }, status);
  }

  const dokumente = snapshot.documents ?? [];
  const fakten = snapshot.facts ?? [];
  if (dokumente.some((d: { extracted_text?: string; processing_error?: string }) =>
    !d.extracted_text?.trim() || d.processing_error)) {
    return await gescheitert("Mindestens ein Dokument wurde noch nicht vollständig gelesen. Bitte prüfen Sie die Dokumente.", 422);
  }
  const abschnitte = [snapshot.description.trim()];
  for (const fakt of fakten ?? []) {
    abschnitte.push(fakt.occurred_on ? `${fakt.occurred_on}: ${fakt.statement}` : fakt.statement);
  }
  for (const dokument of dokumente ?? []) {
    if (dokument.extracted_text) {
      abschnitte.push(`Aus dem Dokument "${dokument.file_name}":\n${dokument.extracted_text}`);
    }
  }

  const sachverhalt = pseudonymisieren(abschnitte.join("\n\n"));
  if (sachverhalt.length > MAX_SACHVERHALT) {
    return await gescheitert(`Der Fall umfasst mehr als ${MAX_SACHVERHALT} Zeichen. Es wurde nichts abgeschnitten. Bitte grenzen Sie die Unterlagen ein.`, 413);
  }

  const abbruch = new AbortController();
  const wecker = setTimeout(() => abbruch.abort(), ZEITLIMIT_MS);

  let daten: Record<string, unknown>;
  try {
    const antwort = await fetch(`${engineUrl}/api/legal/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Request-ID": requestId,
        ...(engineKey ? { "X-Engine-Key": engineKey } : {}),
      },
      // Modal beantwortet langlaufende Anfragen mit `303 See Other` auf
      // dieselbe URL plus `__modal_attempt_token`. Ohne Folgen kommt ein
      // leerer Rumpf zurueck — kein Fehler, nur nichts.
      redirect: "follow",
      signal: abbruch.signal,
      body: JSON.stringify({ sachverhalt, frage: null, top_k: 8 }),
    });

    const rumpf = await antwort.text();
    if (!antwort.ok) {
      return await gescheitert(
        antwort.status === 401
          ? "Die Rechtsdatenbank weist uns ab."
          : "Die Rechtsdatenbank hat nicht geantwortet.",
      );
    }
    if (!rumpf.trim()) {
      return await gescheitert("Die Rechtsdatenbank hat leer geantwortet.");
    }

    daten = JSON.parse(rumpf);
  } catch (fehler) {
    clearTimeout(wecker);
    if (fehler instanceof Error && fehler.name === "AbortError") {
      return await gescheitert(
        "Die Rechtsdatenbank brauchte zu lange. Beim naechsten Versuch ist sie meist warm.",
        504,
      );
    }
    return await gescheitert("Die Rechtsdatenbank ist nicht erreichbar.");
  } finally {
    clearTimeout(wecker);
  }

  // Modal serialisiert Validierungsfehler als HTTP 200 mit `error` im Rumpf.
  // Der Statuscode allein reicht als Pruefung deshalb nicht.
  if (typeof daten?.error === "string" && !daten?.answer) {
    return await gescheitert("Die Anfrage wurde von der Rechtsdatenbank abgelehnt.");
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
      return await gescheitert("Die Rechtsdatenbank konnte keine Einordnung erzeugen.");
    }
    if (modell === "none") {
      return await gescheitert("Zu diesem Sachverhalt wurden keine Rechtsgrundlagen gefunden.");
    }
    return await gescheitert("Die Einordnung kam von einem nicht freigegebenen Modell und wurde verworfen.");
  }

  const antworttext = String(daten.answer ?? "").trim();
  if (!antworttext) return await gescheitert("Die Einordnung kam ohne Text zurueck.");

  const zitate = Array.isArray(daten.citations) ? (daten.citations as Record<string, unknown>[]) : [];
  const belegbar = zitate.filter((z) => String(z.reference ?? z.gesetz ?? "").trim());
  if (belegbar.length !== zitate.length) {
    return await gescheitert("Mindestens eine Fundstelle ist unvollständig. Die Analyse wurde nicht übernommen.", 422);
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
  quellen.forEach((q) => belege.set(q.citation_id, {
    reference: q.reference, locator: q.locator, id: q.citation_id,
  }));

  const fristen = fristenAusAntwort(antworttext, belege).map((frist) => ({
    ...frist,
    citation_id: frist.source_id,
  }));
  const erkannt = String(daten.rechtsgebiet ?? "").trim().toLowerCase();
  const { data: gespeichert, error: speicherFehler } = await worker.rpc("finish_case_analysis", {
    ...lauf, p_snapshot: snapshot, p_answer: antworttext, p_model: modell,
    p_audit: daten.answer_audit ?? null, p_source_audit: daten.source_audit ?? null,
    p_sources: quellen, p_deadlines: fristen, p_area: RECHTSGEBIETE[erkannt] ?? null,
  });
  if (speicherFehler) return await gescheitert("Die Analyse konnte nicht vollständig gespeichert werden oder der Fall wurde zwischenzeitlich geändert.", 409);
  if (!gespeichert?.released) return json({
    error: "Die Einordnung hat die Quellenprüfung nicht bestanden. Sie bleibt ungeprüft und kann nicht exportiert werden.",
    request_id: requestId,
  }, 422);

  return json({
    status: "analysiert",
    case_id: caseId,
    analysis_id: analyse.id,
    request_id: requestId,
    sources: quellen.length,
    deadlines: fristen.length,
    skipped_citations: zitate.length - quellen.length,
  });
});
