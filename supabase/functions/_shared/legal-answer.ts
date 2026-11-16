/** Fail closed at the engine/consumer boundary; this is a technical source gate, not legal approval. */
export function legalAnswer(raw: unknown) {
  const object = (v: unknown): Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
  const data = object(raw), audit = object(data.answer_audit), source = object(data.source_audit), plan = object(data.retrieval_plan);
  const empty = (v: unknown) => Array.isArray(v) && v.length === 0;
  const strings = (v: unknown) => Array.isArray(v) && v.every(item => typeof item === "string" && item.trim().length > 0);
  const positive = (v: unknown) => Number.isInteger(v) && Number(v) > 0;
  const released = data.released === true && data.release_status === "released" &&
    typeof data.answer === "string" && data.answer.trim().length > 0 &&
    audit.status === "pass" && audit.high_severity_count === 0 && positive(audit.material_claims) &&
    audit.score === 100 && Number.isInteger(audit.cited_claims) && audit.cited_claims === audit.material_claims &&
    empty(audit.missing_required_in_answer) && empty(audit.retrieval_missing_required) &&
    empty(audit.issues) && audit.issue_count === 0 && audit.medium_severity_count === 0 &&
    positive(source.accepted_count) && empty(source.missing_required) &&
    (source.status == null || source.status === "pass") && strings(plan.required_norms) &&
    Array.isArray(data.citations) && data.citations.length > 0 && data.citations.every(item => {
      const citation = object(item);
      return typeof citation.id === "string" && /^\[[1-9]\d*\]$/.test(citation.id) &&
        typeof citation.text_preview === "string" && citation.text_preview.trim().length > 0;
    });
  return {
    answer: released ? data.answer as string : "",
    released,
    release_status: released ? "released" : data.release_status === "unavailable" ? "unavailable" : "blocked",
    citations: released ? data.citations as unknown[] : [],
    model: typeof data.model === "string" ? data.model : "",
    rechtsgebiet: typeof data.rechtsgebiet === "string" ? data.rechtsgebiet : null,
    audit: { status: released ? "pass" : "blocked", high_severity_count: Number.isInteger(audit.high_severity_count) ? audit.high_severity_count as number : 0 },
    audit_scope: "formal_source_checks",
    review_required: true,
  };
}
