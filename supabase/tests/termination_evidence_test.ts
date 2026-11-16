import assert from "node:assert/strict";
import corpus from "../../packages/shared/corpus/termination-2026-11-10/corpus.json" with { type: "json" };
import { analyzeTermination } from "../../packages/shared/termination.ts";

const fixture = (id = "dev-01") => JSON.parse(Deno.readTextFileSync(
  new URL(`../../evals/development/${id}.json`, import.meta.url),
));

Deno.test("a real quote cannot authorize a different date, option or field", () => {
  for (const [key, value] of [["receipt_on", "2026-09-01"], ["probation", "yes"]]) {
    const f = fixture();
    f.input.facts.find((fact: { key: string }) => fact.key === key).value = value;
    assert.throws(() => analyzeTermination(f.input, f.documents, corpus), /Wert.*Beleg/);
  }
  const f = fixture();
  const receipt = f.input.facts.find((fact: { key: string }) => fact.key === "receipt_on");
  receipt.evidence = f.input.facts.find((fact: { key: string }) => fact.key === "employment_started_on").evidence;
  receipt.value = "2017-03-01";
  assert.throws(() => analyzeTermination(f.input, f.documents, corpus), /Wert.*Beleg/);
});

Deno.test("a truncated quote cannot turn a qualified page value into an accepted fact", () => {
  const f = fixture();
  f.documents[0].extracted_pages[0] = f.documents[0].extracted_pages[0].replace("Probezeit: Nein", "Probezeit: Nein, noch ungeklärt");
  assert.throws(() => analyzeTermination(f.input, f.documents, corpus), /Wert.*Beleg/);
});

Deno.test("missing receipt does not hide the other missing calculation prerequisites", () => {
  const f = fixture("dev-11");
  const result = analyzeTermination(f.input, f.documents, corpus);
  const questions = result.uncertainties.join("\n");
  assert.match(questions, /tatsächlich zugegangen/);
  assert.match(questions, /Beschäftigungsbeginn/);
  assert.match(questions, /Vertrags- oder Tarifregel/);
  assert.equal(result.calculations.length, 0);
});
