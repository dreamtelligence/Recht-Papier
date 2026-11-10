import { createClient } from "jsr:@supabase/supabase-js@2.115.0";
import {
  type AnalysisJob,
  authorized,
  buildWorkerInput,
  failJob,
  json,
  persistAnalysis,
  UUID,
} from "../_shared/case-analysis.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Nur POST." }, 405);
  if (
    !authorized(
      Deno.env.get("CASE_ANALYSIS_CALLBACK_SECRET"),
      req.headers.get("X-Analysis-Key"),
    )
  ) return json({ error: "Nicht berechtigt." }, 401);
  const raw = await req.text();
  if (raw.length > 1000000) return json({ error: "Anfrage zu groß." }, 413);
  let body: {
    action?: string;
    run_id?: string;
    claim_id?: string;
    result?: Record<string, unknown>;
  };
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return json({ error: "Ungültige Anfrage." }, 400);
    }
    body = parsed;
  } catch {
    return json({ error: "Ungültige Anfrage." }, 400);
  }
  if (
    !UUID.test(body.run_id ?? "") || !UUID.test(body.claim_id ?? "") ||
    !["load", "complete", "fail"].includes(body.action ?? "")
  ) return json({ error: "Ungültiger Auftrag." }, 400);
  const run = body.run_id!;
  const worker = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await worker.rpc("get_case_analysis_job", {
    p_run: run,
    p_claim: body.action === "load" ? body.claim_id : null,
  });
  if (error) {
    return json({ error: "Auftrag konnte nicht geladen werden." }, 500);
  }
  if (!data) {
    return json({ status: "not_active" }, body.action === "load" ? 404 : 200);
  }
  const job = data as AnalysisJob;
  if (job.claim_id !== body.claim_id) {
    return json({ error: "Auftrag nicht übernommen." }, 409);
  }
  if (body.action === "load") {
    try {
      return json({
        ...buildWorkerInput(job.snapshot),
      });
    } catch {
      return await failJob(
        worker,
        run,
        "Die Eingaben konnten nicht verarbeitet werden.",
        422,
      );
    }
  }
  if (body.action === "fail") {
    return await failJob(
      worker,
      run,
      "Die Rechtsdatenbank konnte die Prüfung nicht abschließen. Bitte erneut versuchen.",
    );
  }
  if (
    !body.result || typeof body.result !== "object" ||
    Array.isArray(body.result)
  ) return json({ error: "Ergebnis fehlt." }, 400);
  return await persistAnalysis(worker, job, body.result);
});
