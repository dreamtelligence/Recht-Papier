import type { DocumentPickerAsset } from "expo-document-picker";
import { File } from "expo-file-system";

import { supabase } from "@/lib/supabase";
import type { CaseOverview, CaseSummary } from "./typen";

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
 * Bewusst parallel: die fünf Abfragen hängen nicht voneinander ab, und
 * nacheinander würden sich ihre Laufzeiten auf einer Mobilverbindung addieren.
 */
export async function loadCaseOverview(caseId: string): Promise<CaseOverview> {
  const [caseResult, documents, facts, analyses, sources] = await Promise.all([
    supabase
      .from("cases")
      .select("id,title,status,created_at,updated_at,description,legal_area")
      .eq("id", caseId)
      .maybeSingle(),
    supabase
      .from("case_documents")
      .select("id,file_name,kind,mime_type,byte_size,created_at")
      .eq("case_id", caseId)
      .order("created_at", { ascending: true }),
    supabase
      .from("case_facts")
      .select("id,statement,occurred_on,confirmed,origin")
      .eq("case_id", caseId)
      .order("occurred_on", { ascending: true, nullsFirst: false }),
    supabase
      .from("case_analyses")
      .select("id,question,answer,created_at")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("case_sources")
      .select("id,kind,reference,locator,title,valid_as_of")
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
  };
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

    const { error: documentError } = await supabase.from("case_documents").insert({
      case_id: newCase.id,
      kind: "anschreiben",
      file_name: attachment.name,
      storage_path: storagePath,
      mime_type: attachment.mimeType,
      byte_size: attachment.size,
    });
    if (documentError) throw documentError;

    return newCase as CaseSummary;
  } catch (error) {
    if (uploaded) await supabase.storage.from(BUCKET).remove([storagePath]);
    await supabase.from("cases").delete().eq("id", newCase.id);
    throw error;
  }
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
