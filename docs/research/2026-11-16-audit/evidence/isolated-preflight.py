"""Replay the bounded seven-check hosted preflight using the guarded rollout API.

No analysis/worker/model request. Explicit new isolated target and mode-600
credentials/state required. Keep the original isolated-preflight.json unchanged;
pass a fresh --output path for a repeat. All synthetic resources are cleaned.
"""
import argparse
import hashlib
import importlib.util
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
spec = importlib.util.spec_from_file_location("probe", ROOT / "scripts/verify-isolated-rollout.py")
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--credentials-file", type=Path, required=True)
    parser.add_argument("--expected-project-ref", required=True)
    parser.add_argument("--state-file", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    config = m.credentials(args.credentials_file, args.expected_project_ref)
    m.need(not args.output.exists(), "output_exists_choose_new_path")
    m.need(ROOT not in args.state_file.resolve().parents, "private_state_must_be_outside_repository")
    run = m.Run(m.API(config), args.state_file, args.expected_project_ref)
    error = None
    try:
        user, token = run.user()
        foreign, other = run.user()
        run.passed("two_synthetic_auth_users_created_and_authenticated")
        pdf = (ROOT / "apps/mobile/public/portfolio/dev-01-document.pdf").read_bytes()
        cid, did, path, _ = run.case(user, token, pdf)
        run.passed("synthetic_case_original_and_metadata_uploaded")
        doc = run.extract(token, did)
        run.passed("real_server_extraction_persisted", pages=len(doc["extracted_pages"]))
        status, body = run.api.call("GET", f"/storage/v1/object/{m.BUCKET}/{path}", token)
        m.need(status == 200 and body == pdf, "owner_download_byteexact")
        run.passed("owner_download_byteexact", sha256=hashlib.sha256(body).hexdigest())
        status, _ = run.api.call("PATCH", "/rest/v1/case_documents?id=eq." + did, token,
            {"extracted_text": "Forged synthetic cache", "extracted_pages": ["Forged synthetic cache"]})
        m.need(status in (400, 401, 403), "client_extraction_update_denied")
        run.passed("client_extraction_update_denied", status=status)
        m.need(run.extract(token, did)["extracted_pages"] == doc["extracted_pages"], "server_extraction_unchanged")
        for actor, expected in ((token, True), (other, False)):
            status, owned = run.api.call("POST", "/rest/v1/rpc/owns_case", actor, {"target_case": cid})
            m.need(status == 200 and owned is expected, "ownership_helper_scope")
        status, _ = run.api.call("POST", "/rest/v1/rpc/owns_case", body={"target_case": cid})
        m.need(status in (401, 403), "ownership_helper_anonymous_denied")
        run.passed("ownership_helper_boolean_scoped_and_anonymous_denied")
        for actor in (None, other):
            for table, field, value in (("cases", "id", cid), ("case_documents", "id", did)):
                status, rows = run.api.call("GET", f"/rest/v1/{table}?{field}=eq.{value}&select=id", actor)
                m.need((status == 200 and rows == []) or status in (401, 403), "foreign_or_anonymous_private_rows_denied")
            status, _ = run.api.call("GET", f"/storage/v1/object/{m.BUCKET}/{path}", actor)
            m.need(status in (400, 401, 403, 404), "foreign_or_anonymous_blob_denied")
            status, _ = run.api.function("dokument-lesen", actor, {"document_id": did})
            m.need(status == (401 if actor is None else 404), "foreign_or_anonymous_reader_denied")
        run.passed("anonymous_and_foreign_case_document_storage_reader_access_denied")
    except m.ProbeFailure as exc:
        error = str(exc)
    except (Exception, KeyboardInterrupt):
        error = "unexpected_or_interrupted_preflight"
    finally:
        cleanup = run.cleanup()
        output = {"executed_at": datetime.now(timezone.utc).isoformat(), "project_ref": args.expected_project_ref,
            "isolated": True, "synthetic_only": True, "analysis_requests": 0, "paid_model_requests": 0,
            "checks": run.proof, "error": error, "cleanup": cleanup, "passed": error is None and cleanup["complete"]}
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(output, indent=2) + "\n")
        print(json.dumps({"passed": output["passed"], "error": error, "checks": len(run.proof), "cleanup": cleanup["complete"]}))
    return 0 if output["passed"] else 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (m.ProbeFailure, OSError, ValueError):
        print("Preflight refused: invalid local configuration or target binding.")
        raise SystemExit(2)
