"""Bounded six-upload/delete race, synthetic isolated account only.

Complementary hosted probe, not universal concurrency/load validation. Requires
an explicitly bound isolated target. Does not use the retained native session.
All requests join before final absence checks; service cleanup always runs.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import importlib.util
import json
from pathlib import Path
from threading import Barrier

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
    error, proof = None, {}
    try:
        user, token = run.user()
        status, rows = run.api.call("POST", "/rest/v1/cases", token,
            {"owner_id": user["id"], "title": "Synthetic upload/delete race", "description": "Fictional, isolated only."})
        m.need(status == 201 and rows, "create_synthetic_case")
        cid = rows[0]["id"]
        prefix = f"{user['id']}/{cid}"
        run.state["cases"].append(cid)
        paths = [f"{prefix}/race-{i}.pdf" for i in range(6)]
        run.state["uploads"].extend(paths + [prefix + "/before.pdf", prefix + "/late.pdf"])
        run.save()
        blob = b"%PDF-1.4\n% synthetic isolated upload/delete race\n%%EOF\n"
        status, _ = run.api.call("POST", f"/storage/v1/object/{m.BUCKET}/{prefix}/before.pdf", token, blob, content_type="application/pdf")
        m.need(status in (200, 201), "positive_control_upload")
        proof["positive_control_upload_status"] = status
        barrier = Barrier(7, timeout=10)
        def upload(index):
            api = m.API(config)
            barrier.wait()
            status, _ = api.call("POST", f"/storage/v1/object/{m.BUCKET}/{paths[index]}", token, blob, content_type="application/pdf", timeout=60)
            return {"attempt": index, "status": status}
        def delete():
            api = m.API(config)
            barrier.wait()
            status, body = api.function("delete-account", token, {})
            return status, isinstance(body, dict) and body.get("deleted") is True
        with ThreadPoolExecutor(max_workers=7) as pool:
            uploads = [pool.submit(upload, i) for i in range(6)]
            deletion = pool.submit(delete)
            proof["uploads"] = [future.result(timeout=150) for future in uploads]
            first_status, deleted = deletion.result(timeout=150)
        proof["delete_first_status"] = first_status
        proof["all_requests_joined"] = True
        m.need(all(row["status"] in (200, 201, 400, 401, 403) for row in proof["uploads"]), "upload_unexpected_status")
        m.need(first_status in (200, 409, 500), "delete_unexpected_status")
        status, _ = run.api.call("GET", "/auth/v1/admin/users/" + user["id"], admin=True)
        proof["retry_required"] = status == 200
        if status == 200:
            m.need(first_status in (409, 500), "successful_delete_left_live_user")
            final_status, body = run.api.function("delete-account", token, {})
            deleted = isinstance(body, dict) and body.get("deleted") is True
        else:
            m.need(status == 404, "post_race_auth_state_unknown")
            final_status = first_status
        proof["delete_final_status"] = final_status
        m.need(final_status == 200 and deleted, "delete_retry_not_complete")
        run.absent(user)
        proof["after_join_auth_cases_storage_absent"] = True
        status, _ = run.api.call("POST", f"/storage/v1/object/{m.BUCKET}/{prefix}/late.pdf", token, blob, content_type="application/pdf")
        proof["post_delete_old_token_upload_status"] = status
        m.need(status in (400, 401, 403), "post_delete_old_token_upload_allowed")
        m.need(not run.api.storage_files(user["id"]), "post_delete_storage_not_empty")
        proof["post_delete_storage_empty_admin_verified"] = True
    except m.ProbeFailure as exc:
        error = str(exc)
    except (Exception, KeyboardInterrupt):
        error = "unexpected_or_interrupted_race_probe"
    finally:
        cleanup = run.cleanup()
        output = {"executed_at": datetime.now(timezone.utc).isoformat(), "project_ref": args.expected_project_ref,
            "isolated": True, "synthetic_only": True, "analysis_requests": 0, "paid_model_requests": 0,
            "proof": proof, "error": error, "cleanup": cleanup, "passed": error is None and cleanup["complete"],
            "scope": "One synchronized six-upload race; complementary to deterministic PostgreSQL lock test, not general load proof"}
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(output, indent=2) + "\n")
        print(json.dumps({"passed": output["passed"], "error": error, "cleanup": cleanup["complete"], "proof": proof}))
    return 0 if output["passed"] else 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (m.ProbeFailure, OSError, ValueError):
        print("Probe refused: invalid local configuration or target binding.")
        raise SystemExit(2)
