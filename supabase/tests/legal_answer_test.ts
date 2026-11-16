import assert from "node:assert/strict";
import { legalAnswer } from "../functions/_shared/legal-answer.ts";
const valid = () => ({
  answer: "Synthetic source-backed answer [1]", released: true, release_status: "released",
  citations: [{ id: "[1]", text_preview: "Synthetic source" }],
  answer_audit: { status: "pass", high_severity_count: 0, material_claims: 1, score: 100, cited_claims: 1, missing_required_in_answer: [], retrieval_missing_required: [], issues: [], issue_count: 0, medium_severity_count: 0 },
  source_audit: { accepted_count: 1, missing_required: [] },
  retrieval_plan: { required_norms: [] },
});
Deno.test("Edge releases only explicit complete technical source passes", () => {
  assert.equal(legalAnswer(valid()).released, true);
  const mutations = [
    (v: any) => delete v.released, (v: any) => v.release_status = "blocked",
    (v: any) => v.answer_audit.status = "unknown", (v: any) => v.answer_audit.status = "fail",
    (v: any) => v.answer_audit.high_severity_count = "0", (v: any) => v.answer_audit.material_claims = 0,
    (v: any) => delete v.answer_audit.missing_required_in_answer,
    (v: any) => v.answer_audit.retrieval_missing_required = ["BGB 622"],
    (v: any) => v.source_audit.missing_required = ["BGB 622"],
    (v: any) => v.source_audit.accepted_count = "1", (v: any) => v.source_audit.status = "error",
    (v: any) => v.answer_audit.issues = null,
    (v: any) => v.answer_audit.issues = [{ severity: "high", detail: "private" }],
    (v: any) => v.answer_audit.medium_severity_count = 1,
    (v: any) => v.answer_audit.issue_count = "0",
    (v: any) => v.retrieval_plan.required_norms = [{}],
    (v: any) => v.citations = [{}],
    (v: any) => v.answer_audit.score = "100",
    (v: any) => v.answer_audit.cited_claims = 0,
    (v: any) => delete v.source_audit, (v: any) => delete v.retrieval_plan,
    (v: any) => v.citations = [], (v: any) => v.answer = "",
  ];
  for (const mutate of mutations) {
    const value = valid(); mutate(value);
    const result = legalAnswer(value);
    assert.equal(result.released, false); assert.equal(result.answer, ""); assert.deepEqual(result.citations, []);
  }
  for (const value of [null, "wrong", [], { release_status: "unavailable", answer: "provider secret" }]) {
    assert.equal(legalAnswer(value).answer, "");
  }
});
