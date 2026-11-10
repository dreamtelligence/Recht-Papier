/** Deterministic reference evaluation. This is not a model benchmark or lawyer review. */
import assert from "node:assert/strict";
import corpus from "../packages/shared/corpus/termination-2026-11-10/corpus.json" with {
  type: "json",
};
import { analyzeTermination } from "../packages/shared/termination.ts";
import {
  validateInput,
  validateResult,
} from "../supabase/functions/_shared/portfolio-validation.ts";

const digest = async (path: string) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", await Deno.readFile(path)))].map((n) =>
    n.toString(16).padStart(2, "0")
  ).join("");
const frozenRules = await digest("packages/shared/termination.ts");
const rows = [];
for (const group of ["development", "acceptance"]) {
  const entries = [...Deno.readDirSync(`evals/${group}`)].filter((e) => e.name.endsWith(".json"))
    .sort((a, b) => a.name.localeCompare(b.name));
  assert.equal(entries.length, group === "development" ? 16 : 8);
  for (const entry of entries) {
    for (let repetition = 1; repetition <= (group === "acceptance" ? 3 : 1); repetition++) {
      const fixture = JSON.parse(await Deno.readTextFile(`evals/${group}/${entry.name}`));
      const started = performance.now();
      let error: unknown = null;
      let result;
      try {
        validateInput(fixture.input);
        result = analyzeTermination(fixture.input, fixture.documents, corpus);
        validateResult(result);
      } catch (caught) {
        error = caught;
      }
      assert.equal(!!error, fixture.expected.invalid, fixture.id);
      if (result) {
        for (const kind of ["notice_end", "claim_deadline"] as const) {
          assert.equal(
            result.calculations.find((c) => c.kind === kind)?.due_on ?? null,
            fixture.expected[kind],
            `${fixture.id}/${kind}`,
          );
        }
      }
      rows.push({
        id: fixture.id,
        group,
        repetition,
        reference_match: true,
        invalid_input_rejected: !!error,
        latency_ms: Number((performance.now() - started).toFixed(3)),
        calculation_count: result?.calculations.length ?? 0,
        uncertainty_count: result?.uncertainties.length ?? 0,
      });
    }
  }
}
assert.equal(await digest("packages/shared/termination.ts"), frozenRules);
const report = {
  kind: "deterministic_reference_evaluation",
  executed_at: new Date().toISOString(),
  corpus_version: corpus.version,
  rules_sha256: frozenRules,
  unique_cases: 24,
  executions: rows.length,
  reference_mismatches: 0,
  model_calls: 0,
  model_cost_eur: 0,
  limitation:
    "Repository reference fixtures, not an independent legal validation. Acceptance fixtures are separate and repeated three times; not used to tune a model. Model benchmark and professional review remain separate.",
  rows,
};
await Deno.writeTextFile(
  "docs/portfolio/deterministic-evaluation.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log({ cases: report.unique_cases, executions: report.executions, reference_mismatches: 0 });
