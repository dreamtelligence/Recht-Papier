import { createClient } from "jsr:@supabase/supabase-js@2.115.0";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info" };
const json = (body: unknown, status=200) => new Response(JSON.stringify(body), {
  status, headers: {...cors, "Content-Type":"application/json"},
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", {headers:cors});
  if (req.method !== "POST") return json({error:"Nur POST."},405);
  const url=Deno.env.get("SUPABASE_URL")!;
  const asUser=createClient(url,Deno.env.get("SUPABASE_ANON_KEY")!, {
    global:{headers:{Authorization:req.headers.get("Authorization") ?? ""}},
  });
  const {data:auth,error:authError}=await asUser.auth.getUser();
  if (authError || !auth.user) return json({error:"Nicht angemeldet."},401);
  let input;
  try { input=await req.json(); } catch { return json({error:"Ungültige Anfrage."},400); }
  if (!input || typeof input !== "object") return json({error:"Ungültige Anfrage."},400);
  const worker=createClient(url,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  if (input.action === "approve" && /^[0-9a-f-]{36}$/i.test(input.document_id ?? "")) {
    const {data,error}=await worker.rpc("approve_case_document", {
      p_document:input.document_id,p_owner:auth.user.id,
    });
    return error ? json({error:"Das Dokument ist nicht verfügbar oder die Fallakte wurde verändert."},409) : json(data);
  }
  if (!/^[0-9a-f-]{36}$/i.test(input.case_id ?? "") || !["bericht","anschreiben"].includes(input.kind)) {
    return json({error:"Fall und Dokumenttyp fehlen."},400);
  }
  const {data:analysis,error}=await asUser.from("case_analyses")
    .select("id,answer,model,input_snapshot,released,created_at")
    .eq("case_id",input.case_id).order("created_at",{ascending:false}).limit(1).maybeSingle();
  if (error) return json({error:"Die Einordnung konnte nicht geladen werden."},500);
  if (!analysis) return json({error:"Keine Einordnung verfügbar."},404);
  if (!analysis.released) return json({error:"Die Einordnung hat die Quellenprüfung noch nicht bestanden."},422);
  const facts=analysis.input_snapshot?.facts ?? [];
  if (!facts.length) return json({error:"Bitte zuerst Angaben bestätigen und den Fall erneut einordnen."},422);
  const {data:sources,error:sourceError}=await asUser.from("case_sources").select("*").eq("analysis_id",analysis.id);
  if (sourceError || !sources?.length) return json({error:"Die Quellen sind nicht vollständig verfügbar."},422);
  const statements=facts.map((f: {statement:string;occurred_on?:string}) =>
    `• ${f.occurred_on ? f.occurred_on+": " : ""}${f.statement}`).join("\n");
  const title=input.kind === "bericht" ? "Bericht zur Fallakte" : "Bitte um Stellungnahme";
  // Die Schreiben-Vorlage behauptet keine neue Rechtsfolge. Namen/Adressen
  // werden nicht aus dem Chat geraten; persönliche Angaben stehen in den Fakten.
  const body=input.kind === "bericht"
    ? `${title}\n\nBestätigte Angaben\n${statements}\n\nEinordnung\n${analysis.answer}\n\nQuellen\n${sources.map(s =>
      `[${s.citation_id}] ${s.reference} ${s.locator ?? ""}${s.valid_as_of ? " · "+s.valid_as_of : ""}${s.url ? "\n"+s.url : ""}`).join("\n\n")}\n\nErstellt aus Analyse ${analysis.id} vom ${analysis.created_at}. Modell: ${analysis.model}. Vorlagenversion 1.\nKeine fachanwaltliche Freigabe.`
    : `${title}\n\nSehr geehrte Damen und Herren,\n\nzu folgendem Sachverhalt bitte ich um Ihre schriftliche Stellungnahme:\n\n${statements}\n\nBitte erläutern Sie Ihre Sicht und übersenden Sie die dazugehörigen Unterlagen.\n\nMit freundlichen Grüßen`;
  const {data:id,error:saveError}=await worker.rpc("save_case_document",{
    p_case:input.case_id,p_owner:auth.user.id,p_analysis:analysis.id,
    p_kind:input.kind,p_title:title,p_body:body,
  });
  if (saveError) return json({error:"Die Fallakte wurde geändert. Bitte erneut einordnen, bevor Sie ein Dokument erstellen."},409);
  return json({id});
});
