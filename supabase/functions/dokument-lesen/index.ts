// Das Anschreiben lesbar machen.
//
// `case_documents.extracted_text` gibt es seit der ersten Migration und
// gefuellt hat es nie jemand. Das ist keine Kleinigkeit: bei einer Kuendigung
// stehen die Formfehler im Schreiben, nicht in der Schilderung. Ohne diesen
// Schritt sieht jede Einordnung nur, was der Mandant selbst getippt hat, und
// das Dokument liegt als reine Ablage im Bucket.
//
// Warum das eine eigene Funktion ist und nicht Teil von `fall-einordnen`:
// ein PDF ohne Textebene ist ein alltaeglicher Fall, und er darf die Analyse
// nicht mitreissen. Getrennt scheitert das Lesen sichtbar, waehrend die
// Einordnung mit dem laeuft, was da ist.
//
// service_role kommt hier bewusst nicht vor. Der Bucket hat eine
// Select-Policy auf den UID-Praefix und `case_documents` eine Owner-Policy;
// mit dem Nutzertoken erzwingt die Datenbank dieselbe Grenze wie sonst auch.
// Eine Vollmacht, die man nicht braucht, holt man sich nicht.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { extractText, getDocumentProxy } from "npm:unpdf@0.12.1";

const BUCKET = "case-documents";

// Groesser als das kommt hier nicht an: der Bucket selbst deckelt bei 20 MB.
// Die Grenze steht trotzdem, weil eine Edge Function ein Speicherlimit hat und
// ein zerlegtes PDF ein Vielfaches seiner Dateigroesse belegt.
const MAX_BYTES = 20 * 1024 * 1024;

// Mehr braucht keine Einordnung, und mehr passt auch nicht sinnvoll in einen
// Prompt. Ein abgeschnittener Text ist ehrlicher als ein abgelehntes Dokument.
const MAX_TEXT = 40_000;

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

/** Seitenumbrueche und Bindestrich-Trennungen aufloesen, Leerraum normalisieren. */
function aufraeumen(roh: string): string {
  return roh
    // Trennstrich am Zeilenende: "Kuendi-\ngung" -> "Kuendigung".
    .replace(/(\p{Ll})-\s*\n\s*(\p{Ll})/gu, "$1$2")
    // Einfacher Umbruch mitten im Satz ist Satzspiegel, kein Absatz.
    .replace(/([^\n])\n(?!\n)/g, "$1 ")
    .replace(/[ \t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Nur POST." }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";

  const asUser = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await asUser.auth.getUser();
  if (userError || !userData?.user) return json({ error: "Nicht angemeldet." }, 401);

  let documentId = "";
  try {
    const body = await req.json();
    documentId = String(body?.document_id ?? "").trim();
  } catch {
    return json({ error: "Ungueltige Anfrage." }, 400);
  }
  if (!documentId) return json({ error: "document_id fehlt." }, 400);

  // Row Level Security beantwortet die Eigentumsfrage. Ein fremdes Dokument
  // kommt hier als "nicht gefunden" an, und genau das meldet die Funktion —
  // ob es existiert, geht den Fragenden nichts an.
  const { data: dokument, error: leseFehler } = await asUser
    .from("case_documents")
    .select("id,case_id,file_name,storage_path,mime_type,byte_size,processed_at,extracted_pages")
    .eq("id", documentId)
    .maybeSingle();

  if (leseFehler) return json({ error: "Das Dokument konnte nicht geladen werden." }, 500);
  if (!dokument) return json({ error: "Dokument nicht gefunden." }, 404);

  if (dokument.processed_at && dokument.extracted_pages) {
    // Schon gelesen. Ein zweiter Lauf kostet nur Zeit und wuerde denselben Text
    // erzeugen; das Dokument im Bucket aendert sich nicht (es gibt keine
    // Update-Policy darauf).
    return json({ status: "bereits_gelesen", document_id: dokument.id });
  }

  async function vermerke(felder: Record<string, unknown>) {
    await asUser
      .from("case_documents")
      .update({ processed_at: new Date().toISOString(), ...felder })
      .eq("id", dokument!.id);
  }

  const typ = (dokument.mime_type ?? "").toLowerCase();
  if (!typ.includes("pdf")) {
    // DOCX und Bilder liegen laengst im Bucket, gelesen werden sie nicht.
    // Bilder braeuchten OCR, DOCX einen eigenen Entpacker. Beides ist eigene
    // Arbeit — hier wird es benannt statt stillschweigend uebergangen.
    await vermerke({ processing_error: `Format wird noch nicht gelesen: ${typ || "unbekannt"}` });
    return json({ status: "format_nicht_unterstuetzt", mime_type: typ }, 200);
  }

  if ((dokument.byte_size ?? 0) > MAX_BYTES) {
    await vermerke({ processing_error: "Datei zu gross zum Lesen." });
    return json({ status: "zu_gross" }, 200);
  }

  const { data: datei, error: ladeFehler } = await asUser.storage
    .from(BUCKET)
    .download(dokument.storage_path);

  if (ladeFehler || !datei) {
    await vermerke({ processing_error: "Datei nicht abrufbar." });
    return json({ error: "Die Datei konnte nicht geladen werden." }, 502);
  }

  let text = "";
  let seiten = 0;
  let pages: string[] = [];
  try {
    const bytes = new Uint8Array(await datei.arrayBuffer());
    const pdf = await getDocumentProxy(bytes);
    seiten = pdf.numPages;
    const { text: roh } = await extractText(pdf, { mergePages: false });
    pages = (typeof roh === "string" ? [roh] : roh).map(aufraeumen);
    text = pages.join("\n\n");
  } catch (fehler) {
    await vermerke({ processing_error: `PDF nicht lesbar: ${fehler}` });
    return json({ status: "nicht_lesbar" }, 200);
  }

  if (!text) {
    // Ein Scan ohne Textebene. Kein Fehler des Dokuments und keiner unserer —
    // aber die Akte muss wissen, dass hier nichts zu holen ist, sonst sucht
    // die Einordnung den Grund bei sich.
    await vermerke({ processing_error: "Kein Text im PDF (vermutlich ein Scan ohne Textebene)." });
    return json({ status: "kein_text", pages: seiten }, 200);
  }

  if (text.length > MAX_TEXT) {
    await vermerke({ extracted_text: null, processing_error: `Dokument überschreitet ${MAX_TEXT} Zeichen; es wurde nichts gekürzt.` });
    return json({ error: "Das Dokument ist für die vollständige Verarbeitung zu lang." }, 413);
  }
  const { error: schreibFehler } = await asUser
    .from("case_documents")
    .update({
      extracted_text: text,
      extracted_pages: pages,
      processed_at: new Date().toISOString(),
      processing_error: null,
    })
    .eq("id", dokument.id);

  if (schreibFehler) return json({ error: "Der Text konnte nicht gespeichert werden." }, 500);

  return json({
    status: "gelesen",
    document_id: dokument.id,
    pages: seiten,
    characters: text.length,
    truncated: false,
  });
});
