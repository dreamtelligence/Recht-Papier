/**
 * Die Antwortformen der Legal-Engine `dreamtelligence/Jura`.
 *
 * Von Hand nachgezeichnet aus `modal_deploy.py` und `src/api/answering.py` im
 * Jura-Repository, Stand 05.09.2026. Das ist ausdrücklich der Zwischenschritt,
 * nicht das Ziel: sobald die Serving-Schicht aus `modal_deploy.py` in eine
 * eigenständige FastAPI-App gelöst ist (siehe Entscheidung `32399c8c`), wird
 * dieser Client aus dem OpenAPI-Schema generiert und diese Datei ersetzt.
 * Solange sie handgeschrieben ist, gilt: **jede Änderung an Juras Routen muss
 * hier nachgezogen werden** — der Compiler merkt es nicht.
 *
 * Die deutschen Feldnamen sind Juras Namen, nicht unsere Wahl.
 */

/**
 * Ein Beleg. Ohne ihn darf keine rechtliche Aussage in der Oberfläche stehen —
 * das ist eine Invariante aus `architecture:recht-und-papier-core`, keine
 * Gestaltungsfrage.
 */
export type Citation = {
  /** Die Marke im Antworttext, etwa `[1]`. */
  id: string;
  /** Abkürzung des Gesetzes, etwa `BGB`. */
  gesetz: string;
  paragraph: string;
  titel: string;
  url: string;
  score: number;
  text_preview: string;
  /** `primary`, `neighbor`, `citation` oder `citation_kg`. */
  context_type: string;
  /** Rechtsstand als ISO-Datum. Gehört sichtbar an die Fundstelle. */
  stand: string;
};

export type AuditIssue = {
  issue: string;
  severity: "high" | "medium" | "low" | string;
  claim: string;
  detail: string;
  citation_ids: string[];
};

/**
 * Juras Selbstprüfung der erzeugten Antwort.
 *
 * Der Grund, warum sie nicht ignoriert werden darf: sie zählt, wie viele
 * materielle Aussagen ohne Beleg im Text stehen. Eine Antwort mit
 * `high_severity_count > 0` ist keine, die ein Verbraucher zu sehen bekommen
 * sollte.
 */
export type AnswerAudit = {
  status: string;
  score: number | null;
  material_claims?: number;
  cited_claims?: number;
  issue_count: number;
  high_severity_count?: number;
  medium_severity_count?: number;
  issues: AuditIssue[];
  missing_required_in_answer?: string[];
  retrieval_missing_required?: string[];
};

export type SearchHit = {
  doc_id?: string;
  abkürzung?: string;
  paragraph?: string;
  paragraph_titel?: string;
  inhalt?: string;
  leitsatz?: string;
  stand?: string;
  url?: string;
  score?: number;
  rerank_score?: number;
  context_type?: string;
};

export type SearchResponse = {
  query: string;
  results: SearchHit[];
  count: number;
};

export type AskResponse = {
  answer: string;
  citations: Citation[];
  model?: string;
  citation_warnings?: string[];
  answer_audit?: AnswerAudit;
};

export type EnhancedAskResponse = AskResponse & {
  rewritten_queries: string[];
  rechtsgebiet: string | null;
  retrieval_method: string;
  retrieval_plan?: unknown;
  source_audit?: unknown;
};

export type EngineStats = Record<string, unknown>;
