import corpus from "../../../packages/shared/corpus/termination-2026-11-10/corpus.json" with {
  type: "json",
};
import { analyzeTermination, modelContradictions } from "../../../packages/shared/termination.ts";
import { reportText } from "../../../packages/shared/report.ts";
import type { Input, Result } from "../../../packages/shared/contract.ts";
import { validateInput, validateResult } from "./portfolio-validation.ts";
import { timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2.115.0";

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
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
  termination_input?: Input | null;
  facts: { statement: string; occurred_on?: string }[];
  documents: {
    id?: string;
    extracted_pages?: string[];
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
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ERLAUBTE_MODELLE = ["Qwen/Qwen3.8-27B-FP8", "controlled-termination/1.0"];
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

export function buildAnalysisInput(snapshot: Snapshot): string {
  if (
    snapshot.documents.some((d) => !d.extracted_text?.trim() || d.processing_error)
  ) {
    throw new Error(
      "Mindestens ein Dokument wurde noch nicht vollständig gelesen. Bitte prüfen Sie die Dokumente.",
    );
  }
  const sections = [snapshot.description.trim()];
  for (const fact of snapshot.facts) {
    sections.push(
      fact.occurred_on ? `${fact.occurred_on}: ${fact.statement}` : fact.statement,
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

export function buildPortfolioResult(snapshot: Snapshot): Result {
  validateInput(snapshot.termination_input);
  const result = analyzeTermination(
    snapshot.termination_input,
    snapshot.documents.map((d) => ({
      id: d.id ?? "",
      extracted_text: d.extracted_text ?? "",
      extracted_pages: d.extracted_pages,
    })),
    corpus,
  );
  validateResult(result);
  return result;
}

export function buildWorkerInput(snapshot: Snapshot): Record<string, unknown> {
  if (!snapshot.termination_input) {
    throw new Error("Bitte zuerst die berechnungsrelevanten Angaben mit Dokumentbelegen erfassen.");
  }
  buildPortfolioResult(snapshot);
  // Only a public corpus version goes to the controlled Python worker, no private facts.
  return { portfolio_version: "1.0", corpus_version: corpus.version };
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

  let structured: Result | null = null;
  if (modell === "controlled-termination/1.0") {
    try {
      structured = buildPortfolioResult(snapshot);
      if (JSON.stringify(daten.corpus) !== JSON.stringify(corpus)) {
        throw new Error("Corpus mismatch");
      }
    } catch {
      return await gescheitert(
        "Quellenstand oder bestätigte Belegstellen stimmen nicht mit dem Auftrag überein.",
        422,
      );
    }
  }
  const antworttext = structured ? reportText(structured) : String(daten.answer ?? "").trim();
  if (!antworttext) return await gescheitert("Die Einordnung kam ohne Text zurück.");
  const quellen = structured
    ? structured.sources.map((source, i) => ({
      kind: "gesetz",
      citation_id: String(i + 1),
      reference: source.reference,
      locator: null,
      title: null,
      url: source.url,
      valid_as_of: `abgerufen ${source.retrieved_on}`,
      excerpt: source.text,
      relevance: null,
    }))
    : [];
  const fristen = structured
    ? structured.calculations.map((calculation) => ({
      label: calculation.kind === "notice_end"
        ? "Gesetzlicher Vergleichstermin"
        : "Klagefrist im unterstützten Grundfall",
      due_on: calculation.due_on,
      basis: structured!.sources.filter(source => calculation.source_ids.includes(source.id)).map(source => source.reference).join("; "),
      note: calculation.method,
      citation_id: String(
        structured!.sources.findIndex((source) => source.id === calculation.source_ids[0]) + 1,
      ),
    }))
    : [];
  const audit: {
    status: string;
    material_claims: number;
    issues: { code: string; severity: string }[];
    structured_result?: Result;
  } = structured
    ? {
      status: "pass",
      material_claims: structured.checks.length,
      issues: [],
      structured_result: structured,
    }
    : {
      status: "fail",
      material_claims: 0,
      issues: [{ code: "uncontrolled_model_result", severity: "high" }],
    };
  if (!structured && snapshot.termination_input) {
    try {
      const controlled = buildPortfolioResult(snapshot);
      audit.issues.push(
        ...modelContradictions(antworttext, controlled).map((code) => ({ code, severity: "high" })),
      );
    } catch { /* No calculation is used without confirmed evidence. */ }
  }
  const erkannt = String(daten.rechtsgebiet ?? "").trim().toLowerCase();
  const { data: gespeichert, error: speicherFehler } = await worker.rpc(
    "finish_case_analysis",
    {
      ...lauf,
      p_snapshot: snapshot,
      p_answer: antworttext,
      p_model: modell,
      p_audit: audit,
      p_source_audit: structured ? { missing_required: [] } : daten.source_audit ?? null,
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
        "Die technischen Prüfungen wurden nicht bestanden. Das Ergebnis kann nicht exportiert werden.",
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
    skipped_citations: 0,
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
