import { createClient } from "jsr:@supabase/supabase-js@2.115.0";
import {
  buildWorkerInput,
  cors,
  failJob,
  json,
  UUID,
} from "../_shared/case-analysis.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Nur POST." }, 405);
  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const dispatchUrl = Deno.env.get("CASE_ANALYSIS_DISPATCH_URL");
  const dispatchKey = Deno.env.get("CASE_ANALYSIS_CALLBACK_SECRET");
  if (!dispatchUrl?.startsWith("https://") || !dispatchKey) {
    return json({ error: "Die Analyse ist nicht konfiguriert." }, 503);
  }
  const asUser = createClient(url, anonKey, {
    global: {
      headers: { Authorization: req.headers.get("Authorization") ?? "" },
    },
  });
  const { data: userData, error: userError } = await asUser.auth.getUser();
  if (userError || !userData?.user) {
    return json({ error: "Nicht angemeldet." }, 401);
  }

  let caseId = "";
  try {
    const body = await req.json();
    caseId = String(body?.case_id ?? "").trim();
  } catch {
    return json({ error: "Ungueltige Anfrage." }, 400);
  }
  if (!caseId) return json({ error: "case_id fehlt." }, 400);
  if (!UUID.test(caseId)) return json({ error: "Ungueltige Fall-ID." }, 400);

  // Row Level Security beantwortet die Eigentumsfrage.
  const { data: fall, error: fallFehler } = await asUser
    .from("cases")
    .select("id,title,description,status,legal_area")
    .eq("id", caseId)
    .maybeSingle();

  if (fallFehler) {
    return json({ error: "Der Fall konnte nicht geladen werden." }, 500);
  }
  if (!fall) return json({ error: "Fall nicht gefunden." }, 404);

  // Jeder Lauf ist ein kostenpflichtiger Modellaufruf. Ein Doppeltipp darf
  // keinen zweiten ausloesen, und zwei parallele Laeufe wuerden zwei Analysen
  // an dieselbe Akte haengen.
  const worker = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const requestId = crypto.randomUUID();
  const lauf = { p_case: caseId, p_owner: userData.user.id, p_run: requestId };
  const { data: snapshot, error: startFehler } = await worker.rpc(
    "start_case_analysis",
    lauf,
  );
  if (startFehler) {
    return json({ error: "Die Prüfung konnte nicht gestartet werden." }, 500);
  }
  if (!snapshot) {
    return json({ status: "laeuft_bereits", case_id: caseId }, 409);
  }

  try {
    buildWorkerInput(snapshot);
  } catch (error) {
    return await failJob(
      worker,
      requestId,
      error instanceof Error ? error.message : "Ungültiger Fall.",
      422,
    );
  }
  try {
    const response = await fetch(dispatchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Analysis-Key": dispatchKey,
      },
      body: JSON.stringify({ run_id: requestId }),
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
    if (response.status !== 202) throw new Error("Dispatch rejected");
  } catch {
    return await failJob(
      worker,
      requestId,
      "Die Prüfung konnte nicht eingeplant werden. Bitte erneut versuchen.",
      503,
    );
  }
  return json(
    { status: "in_pruefung", case_id: caseId, request_id: requestId },
    202,
  );
});
