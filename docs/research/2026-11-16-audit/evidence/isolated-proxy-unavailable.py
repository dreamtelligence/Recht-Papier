"""Real sixth Edge path: explicit unavailable output from model-free search target.

Run only AFTER the parent configures the isolated CPU search URL/key and confirms
that no model credentials/endpoint are available. Uses synthetic public question,
a new temporary account and blank case. No legal answer or secret is recorded.
"""
import argparse
from datetime import datetime, timezone
import importlib.util
import json
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
    proof, error = {}, None
    try:
        user, token = run.user()
        question = {"frage": "Welche gesetzliche Grundfrist nennt § 622 Absatz 1 BGB?"}
        status, _ = run.api.function("recht-nachschlagen", None, question)
        proof["anonymous_proxy_status"] = status
        m.need(status == 401, "anonymous_proxy_denied")
        status, answer = run.api.function("recht-nachschlagen", token, question)
        proof["authenticated_proxy_status"] = status
        m.need(status == 200 and isinstance(answer, dict), "proxy_json_response")
        proof.update(released=answer.get("released") if isinstance(answer.get("released"), bool) else None,
            release_status=answer.get("release_status") if answer.get("release_status") in ("released", "blocked", "unavailable") else "invalid",
            answer_length=len(answer["answer"]) if isinstance(answer.get("answer"), str) else None,
            citations_count=len(answer["citations"]) if isinstance(answer.get("citations"), list) else None,
            audit_status=answer.get("audit", {}).get("status") if answer.get("audit", {}).get("status") in ("pass", "blocked", "unknown", "fail") else "invalid",
            review_required=answer.get("review_required") is True,
            audit_scope="formal_source_checks" if answer.get("audit_scope") == "formal_source_checks" else "invalid")
        m.need(answer.get("released") is False and answer.get("release_status") == "unavailable" and answer.get("answer") == "", "proxy_failed_closed")
        m.need(answer.get("citations") == [] and answer.get("audit", {}).get("status") == "blocked", "proxy_no_false_pass_or_citations")
        m.need(answer.get("review_required") is True and answer.get("audit_scope") == "formal_source_checks", "proxy_review_boundary_visible")
        m.need(set(answer) == {"answer", "released", "release_status", "citations", "model", "rechtsgebiet", "audit", "audit_scope", "review_required"}, "proxy_output_allowlist")
        m.need(set(answer["audit"]) == {"status", "high_severity_count"}, "proxy_audit_details_allowlist")
        status, rows = run.api.call("POST", "/rest/v1/cases", token,
            {"owner_id": user["id"], "title": "Synthetic proxy release probe", "description": "Fictional isolated test. No private facts."})
        m.need(status == 201 and rows, "blank_case_create")
        cid = rows[0]["id"]
        run.state["cases"].append(cid)
        run.save()
        status, _ = run.api.function("dokument-erstellen", token, {"case_id": cid, "kind": "bericht"})
        proof["report_without_analysis_status"] = status
        m.need(status == 404, "unavailable_query_cannot_create_report")
        status, _ = run.api.function("dokument-erstellen", token, {"action": "export", "document_id": "00000000-0000-0000-0000-000000000000"})
        proof["unknown_report_export_status"] = status
        m.need(status == 409, "unavailable_query_cannot_export_report")
        m.need(not run.api.rows("case_analyses", {"case_id": "eq." + cid}, token, select="id"), "no_analysis_persisted")
        m.need(not run.api.rows("generated_documents", {"case_id": "eq." + cid}, token, select="id"), "no_report_persisted")
        proof["no_analysis_or_report_persisted"] = True
    except m.ProbeFailure as exc:
        error = str(exc)
    except (Exception, KeyboardInterrupt):
        error = "unexpected_or_interrupted_proxy_probe"
    finally:
        cleanup = run.cleanup()
        output = {"executed_at": datetime.now(timezone.utc).isoformat(), "project_ref": args.expected_project_ref,
            "isolated": True, "synthetic_only": True, "paid_model_requests": 0, "proof": proof,
            "error": error, "cleanup": cleanup, "passed": error is None and cleanup["complete"],
            "scope": "Real authenticated proxy and safe unavailable output; no successful model answer or legal validation"}
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
