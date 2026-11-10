import type { Input, Result } from "@portfolio/contract";
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
  | "fehlgeschlagen"
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
  /**
   * Der Stand der Eingaben. Jede Änderung an Schilderung, Angaben oder
   * Dokumenten zählt ihn hoch (Trigger in der Datenbank). Eine Analyse mit
   * einem anderen Wert gehört zu einer Akte, die es so nicht mehr gibt — und
   * die Oberfläche muss das sagen, statt ein veraltetes Ergebnis wie ein
   * aktuelles aussehen zu lassen.
   */
  input_revision: number;
  run_expires_at: string | null;
  analysis_error: string | null;
  termination_input: Input | null;
};

export type CaseDocument = {
  id: string;
  file_name: string;
  kind: string;
  mime_type: string | null;
  byte_size: number | null;
  created_at: string;
  // Ohne den Pfad kann die Akte ihr eigenes Dokument nicht öffnen. Er stand
  // lange nicht in der Abfrage, und deshalb war ein hochgeladenes Anschreiben
  // aus der App heraus unerreichbar.
  storage_path: string;
  // Gefüllt von der Edge Function `dokument-lesen`. `null` heißt "noch nicht
  // gelesen", ein gesetztes `processed_at` mit leerem Text heißt "gelesen,
  // aber da war nichts" — meist ein Scan ohne Textebene.
  processed_at: string | null;
  extracted_text: string | null;
  extracted_pages: string[] | null;
  processing_error: string | null;
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
  structured_result: Result | null;
  created_at: string;
  /** Der Eingabestand, auf den sich diese Prüfung bezieht. */
  input_revision: number;
  /**
   * Ob die Quellenprüfung bestanden wurde. Das entscheidet die Datenbank in
   * `finish_case_analysis`, nicht der Client — und nur eine freigegebene
   * Analyse darf ein Schreiben tragen.
   */
  released: boolean;
};

/**
 * Eine Frist, die die Analyse genannt hat.
 *
 * `confirmed` ist der ganze Unterschied zwischen einem Hinweis und einer
 * Zusage. Eine vom Modell aus dem Sachverhalt gerechnete Frist ist ein
 * Vorschlag — dieselbe Regel wie bei `CaseFact`.
 */
export type CaseDeadline = {
  id: string;
  label: string;
  due_on: string;
  basis: string;
  confirmed: boolean;
  origin: string;
  note: string | null;
};

export type CaseSource = {
  id: string;
  kind: string;
  reference: string;
  locator: string | null;
  title: string | null;
  valid_as_of: string | null;
  /** Die Nummer, mit der die Antwort auf diese Fundstelle verweist: „[1]". */
  citation_id: string | null;
};

/**
 * Ein aus der Akte erzeugtes Dokument — Bericht oder Schreibenvorlage.
 *
 * Der Text entsteht serverseitig aus bestätigten Angaben und einer
 * freigegebenen Analyse; die App erzeugt keine Formulierung selbst. `body`
 * kommt fertig aus der Datenbank, damit exportiertes und angezeigtes Dokument
 * nicht auseinanderlaufen können.
 *
 * `approved_at` ist die Freigabe durch den Mandanten. Ohne sie ist das
 * Dokument ein Entwurf — teilen lässt sich nur, was freigegeben wurde.
 * `input_revision` hält fest, auf welchem Stand der Akte es beruht: ändert
 * sich die Akte danach, ist das Dokument veraltet und das muss sichtbar sein.
 */
export type GeneratedDocument = {
  id: string;
  kind: "bericht" | "anschreiben";
  title: string;
  body: string;
  input_revision: number;
  template_version: string;
  created_at: string;
  approved_at: string | null;
};

export const DOKUMENT_TEXT: Record<GeneratedDocument["kind"], string> = {
  bericht: "Bericht zur Fallakte",
  anschreiben: "Schreibenvorlage",
};

export type CaseOverview = {
  fall: CaseDetail;
  dokumente: CaseDocument[];
  fakten: CaseFact[];
  analyse: CaseAnalysis | null;
  quellen: CaseSource[];
  fristen: CaseDeadline[];
  schreiben: GeneratedDocument[];
};

export const STATUS_TEXT: Record<CaseStatus, string> = {
  entwurf: "Entwurf",
  in_pruefung: "Wird geprüft",
  fehlgeschlagen: "Prüfung fehlgeschlagen",
  analysiert: "Analysiert",
  abgeschlossen: "Abgeschlossen",
  archiviert: "Archiviert",
};

export const RECHTSGEBIET_TEXT: Record<LegalArea, string> = {
  arbeitsrecht: "Arbeitsrecht",
  mietrecht: "Mietrecht",
};
