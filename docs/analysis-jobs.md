# Asynchronous case analysis

`fall-einordnen` checks the user's session and case ownership, starts an atomic database run, then dispatches only its opaque UUID to Modal. It returns HTTP 202. The mobile case view reloads the persisted state while the run is active; leaving the screen does not cancel analysis.

The previous synchronous request exceeded Supabase's 150-second Free worker limit. The measured warm retry failed after 151 seconds with `WORKER_RESOURCE_LIMIT`. Increasing the handler's own 170-second timeout could not extend that platform limit. See [Supabase runtime limits](https://supabase.com/docs/guides/functions/limits).

## Data and trust boundaries

- `private.case_analysis_jobs` stores the original input snapshot in Supabase. It has RLS and no client privileges.
- The queue receives a run UUID, without case facts, documents, account identifiers or provider credentials.
- A separate shared secret authenticates the dispatcher and `case-analysis-worker` callback. It is never a mobile environment variable.
- Each worker claims the run with its own UUID. Retrying a lost claim response is idempotent; a second worker cannot claim the same job.
- The controlled callback sends only public corpus/version identifiers; private facts remain in Supabase. The worker returns the versioned 16-statute corpus without resolving Qwen or broad search. Supabase independently rechecks evidence and calculates the dates. The separate Python free-analysis branch uses LegalRAG/Qwen under the shared answer gate; this controlled callback does not enable it.
- Completion reuses the model allowlist, citation mapping, deterministic audits and atomic `finish_case_analysis` RPC. The database decides whether an answer is released.
- A different input revision, expired lease, deleted case or old run cannot overwrite a newer result. Callback retries do not regenerate the answer.
- Completed/failed jobs are removed. A new run replaces an expired job; deleting the case removes its job through the foreign key.

This remains a development deployment for synthetic cases. Pseudonymization and EU compute settings do not establish end-to-end data residency or launch readiness; Modal's storage/routing and the existing product gates still require deployment review.

## Deployment

Apply the complete migration history through the normal CLI process on an explicitly selected target. The original job migration adds jobs and leases. November 16 migrations also make extraction server-owned, invalidate old derived caches, authorize current exports and fence account deletion against remaining Storage tokens. Originals remain stored; invalidated documents must be read again. Deploy compatible functions with these RPCs; the deletion migration must precede its new handler.

Configure server-only values:

| Location | Configuration |
| --- | --- |
| Supabase secrets | `CASE_ANALYSIS_DISPATCH_URL`, `CASE_ANALYSIS_CALLBACK_SECRET`, `LEGAL_ENGINE_API_KEY`; `LEGAL_ENGINE_URL` only for separately verified general search |
| Modal secret `recht-papier-analysis-callback` | `CASE_ANALYSIS_CALLBACK_URL`, the same `CASE_ANALYSIS_CALLBACK_SECRET` |
| Modal secret `legal-engine-key` | Existing credential for the unchanged Qwen endpoint |

The isolated November 16 rollout installs all six repository functions. Gateway JWT verification is enabled for user-facing handlers, including `fall-einordnen`; only the shared-secret callback `case-analysis-worker` disables it. Handlers also validate their own identity or callback credentials. Never push the entire local Supabase configuration to production.

The separate `modal_case_jobs.py` application is in the private Jura repository. Deploy that entry point to `recht-papier-case-analysis`; the existing `legal-rag` and `recht-papier-qwen` applications do not need redeployment. The worker has one active container to match the single Qwen inference slot, a 20-minute task timeout and a 25-minute case lease. An expired run can be retried from the app.

## Checks

```bash
npm --prefix apps/mobile run typecheck
npm --prefix apps/mobile run test:analysis-status
deno check --config supabase/functions/deno.json supabase/functions/fall-einordnen/index.ts supabase/functions/case-analysis-worker/index.ts
deno test --config supabase/functions/deno.json supabase/tests/case_analysis_test.ts
```

`supabase/tests/async_analysis_job.sql` is a self-contained transaction that rolls back its synthetic case. It exercises claim deduplication, client privilege restrictions, atomic write failure, input revisions, late callbacks and lease expiry. It requires an existing test owner, but does not call a model.

The Python lifecycle tests live with the worker in Jura. Use `scripts/verify-isolated-rollout.py` for controlled real integration: it requires explicit isolated credentials/target, rejects the existing project and creates synthetic accounts. The older `supabase/tests/test_fall_einordnen.py` is a separate free-model test with real inference cost, not the isolated rollout command.

## Rollback

Stop new starts before rollback. Restore compatible handlers and RPCs together; do not downgrade the callback independently while jobs are running. Keep extraction/export/deletion security boundaries: reverting code does not restore invalidated derived text or safely remove the deletion fence. Originals remain available for rereading. The original additive job migration and November 16 security migrations have different rollback requirements.

## Isolated verification — 16 November 2026

The [new hosted rollout](research/2026-11-16-isolated-rollout.md) passed 22 API checks and a fresh native Release build: login, Files upload, extraction, eleven evidence confirmations, real Modal callback, 16 sources/two comparison dates, approval and four-page native PDF. Stale-token and concurrent upload checks passed after fixing the deletion fence. Synthetic accounts/files were removed. This does not approve free legal reasoning; the existing project was not migrated.

## Historical live verification — 10 November 2026

The existing fictional dismissal fixture was uploaded and read through the normal document path. With the signed-in user's session, analysis start returned 202 after 2.86 seconds; a duplicate start returned 409 and an unowned case returned 404. The callback and dispatcher rejected anonymous requests with 401.

The background job completed after approximately 419 seconds, persisted one analysis and 11 statute sources, then cleared its private job and active lease. The audit rejected the generated answer: its uncited material claims were not released. Manual inspection also found an impossible calendar date and unsupported conclusions about a works-council hearing. The failed result remains visible with a warning, and no operational deadlines were created. This verifies the asynchronous lifecycle and rejection path, not the quality of the model's legal reasoning.

Local checks passed: mobile type checking and four status assertions, five Deno boundary/persistence tests, eight Python dispatcher/lifecycle tests, 39 existing legal-quality/audit/evaluation tests, and SQL transaction rollback checks. Native iOS loading and the persisted result/source views were inspected in Simulator. GitHub Actions was separately blocked by the account's billing lock; local passing checks do not imply hosted CI success.

### Follow-up quality check

The subsequent quality investigation corrected five false heading findings, added impossible-calendar-date and observed hearing-inference checks, and made the background worker resolve source requirements from the full case. BGB § 174 had been omitted after the 500-character search condensation lost the power-of-attorney detail.

A second real run finished after about 299 seconds and remained unreleased. Its four uncited sentences were not the only problem: manual review found that the model called a one-month interval compliant with its own stated three-month notice rule. The source gate remains active. A citation ID alone does not establish legal correctness.

The investigation also found an XML extraction defect: text after nested lists was absent from the indexed BGB § 622. The parser fix and regression tests are in the private Jura change, but repairing existing data requires a controlled fresh index/re-embedding and consistency check. Existing incremental ingestion skips embeddings for replaced IDs. Typed confirmed dates, deterministic legal deadline calculation and an explicit analysis date remain required work; the screenshot result is still a rejected development answer.
