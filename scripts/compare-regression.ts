/** Reproduce the old extraction bug from its actual source commit. */
import assert from "node:assert/strict";
import { modelContradictions, analyzeTermination } from "../packages/shared/termination.ts";
import corpus from "../packages/shared/corpus/termination-2026-11-10/corpus.json" with { type: "json" };
const baseline = "1cb8e39f7a71bcd7627c9df8f68ab3280423c89e";
const source = await new Deno.Command("git", {args: ["show", `${baseline}:supabase/functions/_shared/case-analysis.ts`]}).output();
assert(source.success);
const path = await Deno.makeTempFile({suffix: ".ts"});
try {
  await Deno.writeFile(path, source.stdout);
  const old = await import(`file://${path}`);
  const sentence = "Die Frist endet am 31.11.2026 [1].";
  const extracted = old.fristenAusAntwort(sentence, new Map([["1", {reference: "KSchG", locator: "§ 4", id: "1"}]]));
  assert.equal(extracted[0].due_on, "2026-11-31");
  const fixture = JSON.parse(await Deno.readTextFile("evals/development/dev-01.json"));
  const current = analyzeTermination(fixture.input, fixture.documents, corpus);
  const now = modelContradictions(sentence, current);
  assert(now.length>0);
  assert(modelContradictions("Die Kündigung zum 30.09.2026 ist fristgerecht [1].", current).length>0);
  await Deno.writeTextFile("docs/portfolio/before-after.json", JSON.stringify({baseline_commit:baseline, input:sentence,
    before:{extracted_deadline:extracted[0].due_on, error:"invalid calendar date accepted by cited-text extraction"},
    after:{calculated_notice_end:current.calculations.find(c=>c.kind==="notice_end")?.due_on, unsupported_model_date_blocked:true, contradictory_notice_conclusion_blocked:true},
    limitation:"A deterministic reproduction using the actual old extractor; not a new live baseline model generation."},null,2)+"\n");
  console.log("Actual old extractor reproduced; current calculation and contradiction gates pass.");
} finally {await Deno.remove(path);}
