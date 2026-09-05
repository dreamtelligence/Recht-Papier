import type { DocumentPickerAsset } from "expo-document-picker";
import { File } from "expo-file-system";

import { supabase } from "./supabase";

const BUCKET = "case-documents";

export type CaseSummary = {
  id: string;
  title: string;
  status: string;
  created_at: string;
};

export async function loadLatestCase(userId: string): Promise<CaseSummary | null> {
  const { data, error } = await supabase
    .from("cases")
    .select("id,title,status,created_at")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

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

    return newCase;
  } catch (error) {
    if (uploaded) await supabase.storage.from(BUCKET).remove([storagePath]);
    await supabase.from("cases").delete().eq("id", newCase.id);
    throw error;
  }
}
