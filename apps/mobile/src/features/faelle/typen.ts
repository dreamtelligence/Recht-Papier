/**
 * Die Fallakte, wie der Client sie sieht.
 *
 * Die Namen sind die Spaltennamen aus `supabase/migrations/` — bewusst
 * unübersetzt. Eine deutsche Umbenennung an dieser Grenze würde bei jedem
 * Blick in die Datenbank eine Übersetzung im Kopf verlangen, und genau dort
 * entstehen die Fehler, die niemand mehr findet.
 *
 * Leitsatz aus dem Domänenmodell: **die Fallakte ist die Datenstruktur, der
 * Chat wäre nur eine Oberfläche darauf.** Deshalb steht hier alles einzeln
 * adressierbar und nicht als Gesprächsverlauf.
 */

export type CaseStatus =
  | "entwurf"
  | "in_pruefung"
  | "analysiert"
  | "abgeschlossen"
  | "archiviert";

/** MVP 1 ist bewusst auf zwei Rechtsgebiete begrenzt. */
export type LegalArea = "arbeitsrecht" | "mietrecht";

export type CaseSummary = {
  id: string;
  title: string;
  status: CaseStatus;
  created_at: string;
};

export type CaseDetail = CaseSummary & {
  description: string;
  legal_area: LegalArea | null;
  updated_at: string;
};

export type CaseDocument = {
  id: string;
  file_name: string;
  kind: string;
  mime_type: string | null;
  byte_size: number | null;
  created_at: string;
};

export type CaseFact = {
  id: string;
  statement: string;
  occurred_on: string | null;
  confirmed: boolean;
  origin: string;
};

export type CaseAnalysis = {
  id: string;
  question: string;
  answer: string | null;
  created_at: string;
};

export type CaseSource = {
  id: string;
  kind: string;
  reference: string;
  locator: string | null;
  title: string | null;
  valid_as_of: string | null;
};

export type CaseOverview = {
  fall: CaseDetail;
  dokumente: CaseDocument[];
  fakten: CaseFact[];
  analyse: CaseAnalysis | null;
  quellen: CaseSource[];
};

export const STATUS_TEXT: Record<CaseStatus, string> = {
  entwurf: "Entwurf",
  in_pruefung: "Wird geprüft",
  analysiert: "Analysiert",
  abgeschlossen: "Abgeschlossen",
  archiviert: "Archiviert",
};

export const RECHTSGEBIET_TEXT: Record<LegalArea, string> = {
  arbeitsrecht: "Arbeitsrecht",
  mietrecht: "Mietrecht",
};
