"""Reproduce deleted-user JWT Storage behavior on an explicitly isolated target.

Uses a new synthetic user and tiny synthetic PDF. Does not call analysis/models.
The historical JSON is a confirmed negative result. Replays require a fresh
--output file and always remove this run's exact owner prefix using service access.
"""
import argparse
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
    error, proof = None, {}
    try:
        user, token = run.user()
        status, rows = run.api.call("POST", "/rest/v1/cases", token,
            {"owner_id": user["id"], "title": "Synthetic stale-token probe", "description": "Fictional, isolated only."})
        m.need(status == 201 and rows, "create_synthetic_case")
        cid = rows[0]["id"]
        run.state["cases"].append(cid)
        run.save()
        path = f"{user['id']}/{cid}/before-delete.pdf"
        run.state["uploads"].append(path)
        run.save()
        blob = b"%PDF-1.4\n% synthetic isolated stale-token probe\n%%EOF\n"
        status, _ = run.api.call("POST", f"/storage/v1/object/{m.BUCKET}/{path}", token, blob, content_type="application/pdf")
        m.need(status in (200, 201), "live_user_storage_positive_control")
        proof["live_user_storage_upload_status"] = status
        status, data = run.api.function("delete-account", token, {})
        m.need(status == 200 and data.get("deleted") is True, "real_delete_account")
        proof["delete_account_status"] = status
        run.absent(user)
        proof["initial_auth_cases_storage_absence_confirmed"] = True
        status, _ = run.api.call("GET", "/auth/v1/user", token)
        proof["old_jwt_get_user_status"] = status
        m.need(status in (401, 403), "deleted_user_auth_rejected")
        status, _ = run.api.function("dokument-lesen", token, {"document_id": cid})
        proof["old_jwt_edge_status"] = status
        m.need(status in (401, 403), "deleted_user_edge_rejected")
        path = f"{user['id']}/{cid}/after-delete.pdf"
        run.state["uploads"].append(path)
        run.save()
        status, _ = run.api.call("POST", f"/storage/v1/object/{m.BUCKET}/{path}", token, blob, content_type="application/pdf")
        proof["old_jwt_storage_upload_status"] = status
        proof["post_delete_object_exists_admin_verified"] = path in run.api.storage_files(user["id"])
        proof["stale_jwt_upload_accepted"] = status in (200, 201) and proof["post_delete_object_exists_admin_verified"]
    except m.ProbeFailure as exc:
        error = str(exc)
    except (Exception, KeyboardInterrupt):
        error = "unexpected_or_interrupted_stale_jwt_probe"
    finally:
        cleanup = run.cleanup()
        output = {"executed_at": datetime.now(timezone.utc).isoformat(), "project_ref": args.expected_project_ref,
            "isolated": True, "synthetic_only": True, "analysis_requests": 0, "paid_model_requests": 0,
            "proof": proof, "error": error, "cleanup": cleanup,
            "passed": error is None and proof.get("old_jwt_storage_upload_status") in (400, 401, 403) and not proof.get("stale_jwt_upload_accepted", True) and cleanup["complete"]}
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(output, indent=2) + "\n")
        print(json.dumps({"passed": output["passed"], "error": error, "cleanup": cleanup["complete"], "stale_upload_accepted": proof.get("stale_jwt_upload_accepted")}))
    return 0 if output["passed"] else 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (m.ProbeFailure, OSError, ValueError):
        print("Probe refused: invalid local configuration or target binding.")
        raise SystemExit(2)
