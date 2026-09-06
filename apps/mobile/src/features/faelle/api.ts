import type { DocumentPickerAsset } from "expo-document-picker";
import { File } from "expo-file-system";

import { supabase } from "@/lib/supabase";
import type { CaseOverview, CaseSummary, GeneratedDocument } from "./typen";

/**
 * Der Zugriff auf die Fallakte. Nur Datenbank, keine Oberfläche.
 *
 * Kein Bildschirm spricht direkt mit `supabase.from(...)`. Das ist nicht
 * Ordnungsliebe: sobald ein Screen seine Abfrage selbst schreibt, wandert die
 * Kenntnis über Tabellen und Spalten in die Oberfläche, und eine Migration
 * bricht dann an Stellen, die niemand sucht.
 *
 * Die Trennung der Mandanten macht Row Level Security in der Datenbank, nicht
 * dieser Code. Die Fall-ID allein gibt niemandem Zugriff.
 */

const BUCKET = "case-documents";

export const MAX_DOKUMENT_BYTES = 20 * 1024 * 1024;

/** Alle Fälle eines Kontos, neueste zuerst. */
export async function loadCases(userId: string): Promise<CaseSummary[]> {
  const { data, error } = await supabase
    .from("cases")
    .select("id,title,status,created_at")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as CaseSummary[];
}

/**
 * Alles, was die Fallübersicht zeigt, in einem Rutsch.
 *
 * Bewusst parallel: die sechs Abfragen hängen nicht voneinander ab, und
 * nacheinander würden sich ihre Laufzeiten auf einer Mobilverbindung addieren.
 */
export async function loadCaseOverview(caseId: string): Promise<CaseOverview> {
  const [caseResult, documents, facts, analyses, sources, deadlines, schreiben] = await Promise.all([
    supabase
      .from("cases")
      .select("id,title,status,created_at,updated_at,description,legal_area,input_revision")
      .eq("id", caseId)
      .maybeSingle(),
    supabase
      .from("case_documents")
      .select("id,file_name,kind,mime_type,byte_size,created_at,storage_path,processed_at,processing_error")
      .eq("case_id", caseId)
      .order("created_at", { ascending: true }),
    supabase
      .from("case_facts")
      .select("id,statement,occurred_on,confirmed,origin")
      .eq("case_id", caseId)
      .order("occurred_on", { ascending: true, nullsFirst: false }),
    supabase
      .from("case_analyses")
      .select("id,question,answer,created_at,released,input_revision")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("case_sources")
      .select("id,kind,reference,locator,title,valid_as_of,citation_id")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false }),
    supabase
      .from("case_deadlines")
      .select("id,label,due_on,basis,confirmed,origin,note")
      .eq("case_id", caseId)
      // Die nächste zuerst. Eine Frist, die schon abgelaufen ist, steht unten,
      // aber sie verschwindet nicht — dass sie verstrichen ist, ist selbst
      // eine Auskunft.
      .order("due_on", { ascending: true }),
    supabase
      .from("generated_documents")
      .select("id,kind,title,body,input_revision,template_version,created_at,approved_at")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false }),
  ]);

  if (caseResult.error) throw caseResult.error;
  if (!caseResult.data) throw new Error("Fall nicht gefunden");

  return {
    fall: caseResult.data as CaseOverview["fall"],
    dokumente: (documents.data ?? []) as CaseOverview["dokumente"],
    fakten: (facts.data ?? []) as CaseOverview["fakten"],
    analyse: ((analyses.data ?? [])[0] ?? null) as CaseOverview["analyse"],
    quellen: (sources.data ?? []) as CaseOverview["quellen"],
    fristen: (deadlines.data ?? []) as CaseOverview["fristen"],
    schreiben: (schreiben.data ?? []) as CaseOverview["schreiben"],
  };
}

/**
 * Eine Angabe bestätigen oder die Bestätigung zurücknehmen.
 *
 * Das ist der Schritt, an dem aus einer aus dem Schreiben gezogenen Aussage
 * eine Grundlage wird: nur bestätigte Angaben gehen in ein Dokument. Er ist
 * bewusst umkehrbar — wer etwas versehentlich bestätigt, muss das zurücknehmen
 * können, bevor es in einem Schreiben steht.
 *
 * Jede Änderung hier zählt `cases.input_revision` hoch (Trigger in der
 * Datenbank). Eine bereits vorliegende Analyse wird damit veraltet, und ein
 * daraus erzeugtes Dokument lässt sich nicht mehr freigeben. Das ist gewollt:
 * die Akte hat sich geändert, also gilt die alte Prüfung nicht mehr.
 */
export async function faktBestaetigen(faktId: string, bestaetigt: boolean): Promise<void> {
  const { error } = await supabase
    .from("case_facts")
    .update({ confirmed: bestaetigt })
    .eq("id", faktId);
  if (error) throw error;
}

/**
 * Bericht oder Schreibenvorlage erzeugen lassen.
 *
 * Serverseitig, und nicht aus Bequemlichkeit: die Function prüft, dass die
 * Analyse freigegeben ist, dass sie zum aktuellen Stand der Akte gehört und
 * dass bestätigte Angaben vorliegen. Würde die App den Text zusammenbauen,
 * wären das drei Prüfungen, die ein manipulierter Client überspringt.
 *
 * Der Client bekommt nur die ID zurück und lädt die Akte neu — der Text steht
 * dann genau einmal, in der Datenbank.
 */
export async function dokumentErstellen(
  caseId: string,
  kind: GeneratedDocument["kind"],
): Promise<void> {
  const { error } = await supabase.functions.invoke("dokument-erstellen", {
    body: { case_id: caseId, kind },
  });
  if (error) throw uebersetzeDokumentFehler(error);
}

/**
 * Das Dokument freigeben.
 *
 * Die Freigabe ist die Stelle, an der der Mandant die Verantwortung für den
 * Text übernimmt. Sie schlägt fehl, wenn sich die Akte seit dem Erzeugen
 * geändert hat — sonst gäbe jemand einen Text frei, den er in dieser Fassung
 * nicht gelesen hat.
 */
export async function dokumentFreigeben(dokumentId: string): Promise<void> {
  const { error } = await supabase.functions.invoke("dokument-erstellen", {
    body: { action: "approve", document_id: dokumentId },
  });
  if (error) throw uebersetzeDokumentFehler(error);
}

/**
 * Ein einzelnes erzeugtes Dokument, für die Vorschau.
 *
 * Die Vorschau lädt neu statt den Text aus der Übersicht mitzunehmen. Der
 * Grund ist die Freigabe: sie darf nur auf genau der Fassung erteilt werden,
 * die auf dem Bildschirm steht, und eine mitgereichte Kopie aus einem älteren
 * Ladevorgang wäre eine andere.
 */
export async function loadSchreiben(dokumentId: string): Promise<GeneratedDocument> {
  const { data, error } = await supabase
    .from("generated_documents")
    .select("id,kind,title,body,input_revision,template_version,created_at,approved_at")
    .eq("id", dokumentId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Dieses Dokument ist nicht verfügbar.");
  return data as GeneratedDocument;
}

/**
 * Der Statuscode der Function in einen Satz, den man jemandem zeigen kann.
 *
 * 422 heißt „die Akte ist noch nicht so weit", 409 heißt „sie hat sich
 * geändert". Das sind zwei verschiedene nächste Schritte, und ein gemeinsamer
 * Satz würde beide verschweigen.
 */
function uebersetzeDokumentFehler(error: unknown): Error {
  const status = (error as { context?: { status?: number } }).context?.status;
  if (status === 404 || status === 422) {
    return new Error(
      "Dafür fehlt noch eine bestandene Einordnung mit bestätigten Angaben. " +
        "Bitte Angaben bestätigen und den Fall erneut einordnen.",
    );
  }
  if (status === 409) {
    return new Error(
      "Die Akte hat sich seit der Einordnung geändert. Bitte erneut einordnen.",
    );
  }
  return new Error("Das Dokument lässt sich gerade nicht erstellen.");
}

/**
 * Fall anlegen — Zeile, Datei und Dokumenteintrag gehören zusammen.
 *
 * Postgres kennt hier keine Transaktion über die Storage-Grenze hinweg,
 * deshalb räumt der Fehlerpfad von Hand auf. Ein Fall ohne sein Anschreiben
 * wäre eine Akte, die etwas verspricht, das sie nicht hat.
 */
export async function createCase(
  userId: string,
  description: string,
  attachment: DocumentPickerAsset,
): Promise<CaseSummary> {
  const title = description.trim().replace(/\s+/g, " ").slice(0, 80);
  const { data: newCase, error: caseError } = await supabase
    .from("cases")
    .insert({ owner_id: userId, title, description })
    .select("id,title,status,created_at")
    .single();

  if (caseError) throw caseError;

  const safeName = attachment.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${userId}/${newCase.id}/${safeName}`;
  let uploaded = false;

  try {
    const bytes = await new File(attachment.uri).arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, bytes, {
        contentType: attachment.mimeType,
        upsert: false,
      });
    if (uploadError) throw uploadError;
    uploaded = true;

    const { data: dokument, error: documentError } = await supabase
      .from("case_documents")
      .insert({
        case_id: newCase.id,
        kind: "anschreiben",
        file_name: attachment.name,
        storage_path: storagePath,
        mime_type: attachment.mimeType,
        byte_size: attachment.size,
      })
      .select("id")
      .single();
    if (documentError) throw documentError;

    // Das Anschreiben lesen lassen, aber nicht darauf warten. Ein Scan ohne
    // Textebene oder eine zickige Datei darf das Anlegen des Falls nicht
    // aufhalten — die Akte steht auch ohne gelesenen Text. Was dabei
    // herauskommt, holt sich die Fallakte beim nächsten Laden.
    void dokumentLesen(dokument.id).catch(() => {});

    return newCase as CaseSummary;
  } catch (error) {
    if (uploaded) await supabase.storage.from(BUCKET).remove([storagePath]);
    await supabase.from("cases").delete().eq("id", newCase.id);
    throw error;
  }
}

/**
 * Das Anschreiben lesen lassen.
 *
 * Serverseitig, weil die Datei den privaten Bucket nicht verlassen muss, um
 * gelesen zu werden — und weil ein PDF-Parser im Bundle das Gerät für etwas
 * zahlen ließe, das einmal pro Dokument anfällt.
 */
export async function dokumentLesen(documentId: string): Promise<void> {
  const { error } = await supabase.functions.invoke("dokument-lesen", {
    body: { document_id: documentId },
  });
  if (error) throw error;
}

/**
 * Eine kurzlebige Adresse, unter der das Dokument sich ansehen lässt.
 *
 * Kurzlebig ist hier keine Vorsicht, sondern Vorgabe: ein Falldokument in
 * einer dauerhaft gültigen URL wäre eine Fallakte, die jeder mit dem Link
 * öffnet. Fünf Minuten reichen zum Anschauen und überleben kein Teilen.
 */
export async function dokumentAdresse(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 300);
  if (error || !data?.signedUrl) throw error ?? new Error("Keine Adresse erhalten");
  return data.signedUrl;
}

/**
 * Fall löschen — erst die Dateien, dann die Zeile.
 *
 * Die Reihenfolge ist dieselbe wie bei der Kontolöschung und aus demselben
 * Grund: `storage.objects` hängt an keinem Fremdschlüssel und überlebt jede
 * Cascade. Fällt die Zeile zuerst, bleiben die Originaldokumente im Bucket
 * liegen — und sind dann niemandem mehr zuzuordnen, weil der Fall, zu dem sie
 * gehörten, weg ist.
 *
 * Deshalb wird bei einem Storage-Fehler abgebrochen, bevor die Zeile fällt.
 * Ein noch bestehender Fall ist das kleinere Übel gegenüber verwaisten
 * Falldokumenten.
 *
 * Alles Übrige — Dokumenteinträge, Fakten, Analysen, Quellen — nimmt die
 * Datenbank per `on delete cascade` mit.
 */
export async function deleteCase(caseId: string): Promise<void> {
  const { data: documents, error: documentError } = await supabase
    .from("case_documents")
    .select("storage_path")
    .eq("case_id", caseId);

  if (documentError) throw documentError;

  const pfade = (documents ?? []).map((eintrag) => eintrag.storage_path);
  if (pfade.length) {
    const { error: storageError } = await supabase.storage.from(BUCKET).remove(pfade);
    if (storageError) throw storageError;
  }

  const { error } = await supabase.from("cases").delete().eq("id", caseId);
  if (error) throw error;
}
