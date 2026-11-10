import assert from "node:assert/strict";
import {
  type AnalysisJob,
  authorized,
  buildAnalysisInput,
  persistAnalysis,
} from "../functions/_shared/case-analysis.ts";

Deno.test("callback authentication fails closed", () => {
  for (
    const [expected, supplied] of [
      [undefined, null],
      ["secret", null],
      ["", ""],
      ["secret", "wrong"],
      ["secret", "secreu"],
    ] as const
  ) assert(!authorized(expected, supplied));
  assert(authorized("secret", "secret"));
});
Deno.test("input preserves facts and rejects unread/oversized documents", () => {
  const snapshot = {
    description: "Frau Marlene Habicht bekam die Kündigung am 31.08.2026.",
    revision: 1,
    facts: [],
    documents: [{
      file_name: "brief.pdf",
      extracted_text: "Nordlicht Logistik GmbH, 62 Beschäftigte, § 622 BGB",
    }],
  };
  const text = buildAnalysisInput(snapshot);
  assert(!text.includes("Marlene"));
  assert(!text.includes("Nordlicht"));
  assert(text.includes("31.08.2026"));
  assert(text.includes("§ 622 BGB"));
  assert(text.includes("62"));
  assert.throws(() =>
    buildAnalysisInput({ ...snapshot, documents: [{ file_name: "scan.pdf" }] })
  );
  assert.throws(() =>
    buildAnalysisInput({ ...snapshot, description: "x".repeat(8001) })
  );
});
Deno.test("unapproved models never reach the persistence RPC", async () => {
  const calls: string[] = [];
  const worker = {
    rpc: (name: string) => {
      calls.push(name);
      return Promise.resolve({ error: null, data: null });
    },
  };
  const response = await persistAnalysis(
    worker as never,
    { run_id: "run" } as AnalysisJob,
    { model: "other-provider", answer: "untrusted" },
  );
  assert.equal(response.status, 502);
  assert.deepEqual(calls, ["fail_case_analysis_job"]);
});
Deno.test("legacy model result is blocked and creates no operational dates", async () => {
  let payload: Record<string, unknown> = {};
  const worker = {
    rpc: (_name: string, args: Record<string, unknown>) => {
      payload = args;
      return Promise.resolve({
        error: null,
        data: { analysis_id: "analysis", released: false },
      });
    },
  };
  const audit = {
    status: "fail",
    material_claims: 1,
    issues: [{ severity: "high" }],
  };
  const result = {
    model: "Qwen/Qwen3.8-27B-FP8",
    answer: "Die Frist endet am 21.09.2026 [1].",
    answer_audit: audit,
    source_audit: { missing_required: [] },
    citations: [{
      id: "1",
      reference: "KSchG",
      locator: "§ 4",
      stand: "2026-11-10",
    }],
  };
  const job = {
    run_id: "run",
    case_id: "case",
    owner_id: "owner",
    snapshot: { description: "demo", revision: 1, facts: [], documents: [] },
    claim_id: "claim",
  };
  const response = await persistAnalysis(worker as never, job, result);
  assert.equal(response.status, 422);
  assert.equal((payload.p_audit as { status: string }).status, "fail");
  assert.deepEqual(payload.p_source_audit, result.source_audit);
  assert.equal((payload.p_deadlines as unknown[]).length, 0);
});
Deno.test("legacy result remains rejected without the versioned contract", async () => {
  const worker = {
    rpc: () =>
      Promise.resolve({
        error: null,
        data: { analysis_id: "actual-id", released: false },
      }),
  };
  const response = await persistAnalysis(
    worker as never,
    {
      run_id: "run",
      case_id: "case",
      owner_id: "owner",
      snapshot: {},
    } as AnalysisJob,
    {
      model: "Qwen/Qwen3.8-27B-FP8",
      answer: "Antwort [1].",
      citations: [{ id: "1", reference: "BGB", locator: "§ 622" }],
    },
  );
  assert.equal(response.status, 422);
});
