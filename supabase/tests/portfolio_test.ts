import assert from "node:assert/strict";
import corpus from "../../packages/shared/corpus/termination-2026-11-10/corpus.json" with {
  type: "json",
};
import { analyzeTermination, extractTerminationFacts, modelContradictions } from "../../packages/shared/termination.ts";
import { reportHtml } from "../../packages/shared/report.ts";
import { validateInput, validateResult } from "../functions/_shared/portfolio-validation.ts";
import {
  type AnalysisJob,
  buildPortfolioResult,
  buildWorkerInput,
  persistAnalysis,
} from "../functions/_shared/case-analysis.ts";

const fixture = (id: string, group = "development") =>
  JSON.parse(Deno.readTextFileSync(new URL(`../../evals/${group}/${id}.json`, import.meta.url)));

for (const entry of Deno.readDirSync(new URL("../../evals/development/", import.meta.url))) {
  Deno.test(`reference ${entry.name}`, () => {
    const f = fixture(entry.name.replace(".json", ""));
    validateInput(f.input);
    const result = analyzeTermination(f.input, f.documents, corpus);
    validateResult(result);
    for (const kind of ["notice_end", "claim_deadline"] as const) {
      assert.equal(
        result.calculations.find((c) => c.kind === kind)?.due_on ?? null,
        f.expected[kind],
      );
    }
  });
}

Deno.test("unconfirmed facts, forged evidence and missing sources cannot create dates", () => {
  const f = fixture("dev-01");
  f.input.facts.forEach((fact: { confirmed: boolean }) => fact.confirmed = false);
  assert.equal(analyzeTermination(f.input, f.documents, corpus).calculations.length, 0);
  f.input.facts[0].confirmed = true;
  f.input.facts[0].evidence.quote = "Invented evidence";
  assert.throws(() => analyzeTermination(f.input, f.documents, corpus), /Belegstelle/);
  assert.throws(
    () =>
      analyzeTermination({ version: "1.0", as_of: "2026-11-10", facts: [] }, [], {
        version: "broken",
        sources: [],
      }),
    /Rechtsbestand/,
  );
});

Deno.test("runtime schema and calendar reject unsupported versions, keys and impossible dates", () => {
  const f = fixture("dev-01");
  assert.throws(() => validateInput({ ...f.input, version: "2.0" }));
  assert.throws(() =>
    validateInput({ ...f.input, facts: [{ ...f.input.facts[0], key: "other" }] })
  );
  f.input.facts.find((fact: { key: string }) => fact.key === "receipt_on").value = "2026-11-31";
  assert.throws(() => analyzeTermination(f.input, f.documents, corpus), /Kalenderdatum/);
});

Deno.test("citation does not authorize the observed wrong notice conclusion", () => {
  const f = fixture("dev-01");
  const result = analyzeTermination(f.input, f.documents, corpus);
  assert(
    modelContradictions("Die Kündigung zum 30.09.2026 ist fristgerecht [1].", result).length > 0,
  );
  assert(modelContradictions("Die Klagefrist endet am 31.11.2026 [1].", result).length > 0);
});

Deno.test("worker receives only a public version; callback rechecks the corpus and stores code dates", async () => {
  const f = fixture("dev-01");
  const snapshot = {
    description: "fictional",
    revision: 1,
    facts: [],
    documents: f.documents,
    termination_input: f.input,
  };
  assert.deepEqual(buildWorkerInput(snapshot), {
    portfolio_version: "1.0",
    corpus_version: corpus.version,
  });
  const job = {
    run_id: "run",
    case_id: "case",
    owner_id: "owner",
    claim_id: "claim",
    snapshot,
  } as AnalysisJob;
  let payload: Record<string, unknown> = {};
  const worker = {
    rpc: (_: string, args: Record<string, unknown>) => {
      payload = args;
      return Promise.resolve({ error: null, data: { analysis_id: "real-id", released: true } });
    },
  };
  const response = await persistAnalysis(worker as never, job, {
    model: "controlled-termination/1.0",
    corpus,
  });
  assert.equal(response.status, 200);
  assert.deepEqual((payload.p_deadlines as { due_on: string }[]).map((d) => d.due_on), [
    "2026-09-21",
    "2026-11-30",
  ]);
  const audit = payload.p_audit as { structured_result: unknown };
  validateResult(audit.structured_result);
  assert.equal(
    (await persistAnalysis(worker as never, job, {
      model: "controlled-termination/1.0",
      corpus: { version: "wrong" },
    })).status,
    422,
  );
});

Deno.test("report escapes document text and separates technical checks from legal review", () => {
  const f = fixture("dev-01");
  f.input.facts[0].evidence.quote = "<script>alert(1)</script>";
  f.documents[0].extracted_pages[0] += "\n<script>alert(1)</script>";
  const result = buildPortfolioResult({
    description: "fictional",
    revision: 1,
    facts: [],
    documents: f.documents,
    termination_input: f.input,
  });
  const html = reportHtml(result);
  assert(!html.includes("<script>"));
  assert(html.includes("Technische Prüfungen") && html.includes("keine anwaltliche Freigabe"));
});

Deno.test("curated PDF labels also extract from flattened page text, without confirming them", () => {
  const f = fixture("dev-01");
  f.documents[0].extracted_pages[0] = f.documents[0].extracted_pages[0].replace(/\s+/g, " ");
  const facts = extractTerminationFacts(f.documents);
  assert.equal(facts.length, f.input.facts.length);
  assert(facts.every(fact => !fact.confirmed));
  assert.deepEqual(facts.map(fact => [fact.key, fact.value]), f.input.facts.map((fact: {key:string;value:string}) => [fact.key, fact.value]));
});
