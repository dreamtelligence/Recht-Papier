"""Real synthetic Auth → Storage → Edge → controlled worker → report/export probe.

No target defaults, key discovery, production access, paid model calls or demo rewrites.
Credentials JSON (mode 600): isolated=true, supabase_url, anon_key, service_role_key.
Bind the URL explicitly using --expected-project-ref. --cleanup resumes interrupted
cleanup from the private --state-file; normal runs always clean up, even on failure. --keep-session retains a separate
synthetic login for the authorized native test; --cleanup removes it afterward.
The export check covers server authorization/exact text, not native PDF printing.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import os
import re
import secrets
import stat
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUCKET = "case-documents"
LEGACY_TARGET = "xmbyrsfaygwdzalkwbts"  # Explicitly forbidden; never a default.
UUID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")


class ProbeFailure(Exception):
    """Only controlled step codes leave the harness; response bodies stay private."""


def need(condition, step):
    if not condition:
        raise ProbeFailure(step)


def private_json(path, value):
    path = Path(path)
    temporary = path.with_name(path.name + "." + secrets.token_hex(4) + ".tmp")
    fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        with os.fdopen(fd, "w") as stream:
            json.dump(value, stream)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def credentials(path, expected):
    path = Path(path)
    need(path.is_file() and not path.is_symlink(), "credentials_file_required")
    need(stat.S_IMODE(path.stat().st_mode) & 0o077 == 0, "credentials_permissions_must_be_600")
    value = json.loads(path.read_text())
    need(isinstance(value, dict) and isinstance(value.get("supabase_url"), str), "credentials_object_invalid")
    need(value.get("isolated") is True, "isolated_target_marker_required")
    url = urllib.parse.urlsplit(value.get("supabase_url", ""))
    need(not url.username and not url.password and not url.query and not url.fragment and url.path in ("", "/"), "target_url_invalid")
    if expected == "local":
        need(url.scheme == "http" and url.hostname in ("127.0.0.1", "localhost") and url.port, "local_target_mismatch")
    else:
        need(bool(re.fullmatch(r"[a-z]{20}", expected)) and expected != LEGACY_TARGET, "existing_target_forbidden")
        need(url.scheme == "https" and url.netloc == expected + ".supabase.co", "target_ref_mismatch")
    need(all(isinstance(value.get(key), str) and len(value[key]) > 20 for key in ("anon_key", "service_role_key")), "keys_missing")
    return {**value, "supabase_url": urllib.parse.urlunsplit((url.scheme, url.netloc, "", "", ""))}


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None  # Never forward credentials to another host.


class API:
    def __init__(self, config):
        self.url = config["supabase_url"]
        self.anon = config["anon_key"]
        self.service = config["service_role_key"]
        self.opener = urllib.request.build_opener(NoRedirect)

    def call(self, method, path, token=None, body=None, *, admin=False, content_type="application/json", timeout=120):
        need(path.startswith("/") and not path.startswith("//"), "relative_api_path_required")
        key = self.service if admin else self.anon
        headers = {"apikey": key, "Content-Type": content_type, "Prefer": "return=representation"}
        if token or admin:
            headers["Authorization"] = "Bearer " + (token or key)
        raw = body if isinstance(body, bytes) else json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(self.url + path, data=raw, method=method, headers=headers)
        try:
            with self.opener.open(req, timeout=timeout) as response:
                status, raw = response.status, response.read()
        except urllib.error.HTTPError as error:
            status, raw = error.code, error.read()
        except (urllib.error.URLError, TimeoutError):
            return 0, None
        try:
            return status, json.loads(raw) if raw else None
        except (ValueError, UnicodeDecodeError):
            return status, raw

    def function(self, name, token, body):
        return self.call("POST", "/functions/v1/" + name, token, body)

    def rows(self, table, filters, token=None, *, admin=False, select="*"):
        query = urllib.parse.urlencode({**filters, "select": select})
        status, rows = self.call("GET", f"/rest/v1/{table}?{query}", token, admin=admin)
        need(status == 200 and isinstance(rows, list), "read_" + table)
        return rows

    def storage_files(self, owner):
        """Read every page before deleting; no offset skips during mutation."""
        need(bool(UUID.fullmatch(owner)), "cleanup_owner_invalid")
        stack, result = [owner], []
        while stack:
            prefix, offset = stack.pop(), 0
            while True:
                status, entries = self.call("POST", f"/storage/v1/object/list/{BUCKET}", body={
                    "prefix": prefix, "limit": 1000, "offset": offset, "sortBy": {"column": "name", "order": "asc"}}, admin=True)
                need(status == 200 and isinstance(entries, list), "cleanup_storage_list")
                for entry in entries:
                    name = entry.get("name", "")
                    need(isinstance(name, str) and "/" not in name and name not in ("", ".", ".."), "cleanup_storage_entry_invalid")
                    path = prefix + "/" + name
                    if entry.get("id") is None:
                        stack.append(path)
                    else:
                        result.append(path)
                if len(entries) < 1000:
                    break
                offset += 1000
        return result


class Run:
    def __init__(self, api, state_path, project_ref, *, existing=False, deadline=900):
        self.api, self.state_path, self.project_ref = api, Path(state_path), project_ref
        self.deadline = deadline
        if existing:
            need(self.state_path.is_file() and not self.state_path.is_symlink(), "resume_state_missing")
            need(stat.S_IMODE(self.state_path.stat().st_mode) & 0o077 == 0, "resume_state_permissions")
            self.state = json.loads(self.state_path.read_text())
            need(self.state.get("project_ref") == project_ref, "resume_target_mismatch")
            need(bool(re.fullmatch(r"[0-9a-f]{16}", self.state.get("run_id", ""))), "resume_run_invalid")
        else:
            need(not self.state_path.exists(), "state_already_exists_use_cleanup")
            self.state = {"run_id": secrets.token_hex(8), "project_ref": project_ref, "supabase_url": getattr(api, "url", None), "users": [], "cases": [], "uploads": []}
            self.save()
        self.proof = []

    def save(self):
        private_json(self.state_path, self.state)

    def passed(self, step, **details):
        self.proof.append({"check": step, "passed": True, **details})
        print("PASS " + step, flush=True)

    def user(self):
        user = {"email": f"rp-isolated-{self.state['run_id']}-{len(self.state['users'])}@example.invalid", "password": secrets.token_urlsafe(32)}
        self.state["users"].append(user)
        self.save()  # Recovery can find a created user even if its response is lost.
        status, created = self.api.call("POST", "/auth/v1/admin/users", body={**user, "email_confirm": True,
            "user_metadata": {"isolated_probe": self.state["run_id"]}}, admin=True)
        need(status in (200, 201) and isinstance(created, dict) and UUID.fullmatch(created.get("id", "")), "auth_create_synthetic_user")
        user["id"] = created["id"]
        self.save()
        return user, self.login(user)

    def login(self, user):
        status, data = self.api.call("POST", "/auth/v1/token?grant_type=password", body={"email": user["email"], "password": user["password"]})
        need(status == 200 and isinstance(data, dict) and data.get("access_token"), "auth_password_login")
        return data["access_token"]

    def case(self, user, token, pdf, *, typed=True):
        status, rows = self.api.call("POST", "/rest/v1/cases", token, {
            "owner_id": user["id"], "title": "Synthetic isolated dismissal", "description": "Fiktiver isolierter Test. Keine echten Personen oder Mandate."})
        need(status == 201 and rows, "case_create")
        cid = rows[0]["id"]
        self.state["cases"].append(cid)
        self.save()
        did, path = self.document(user, token, cid, pdf, "synthetic.pdf")
        if typed:
            fixture = json.loads((ROOT / "docs/portfolio/cases/dev-01.json").read_text())
            data = copy.deepcopy(fixture["input"])
            for fact in data["facts"]:
                fact["evidence"]["document_id"] = did
            return cid, did, path, data
        return cid, did, path, None

    def document(self, user, token, cid, pdf, filename):
        path = f"{user['id']}/{cid}/{filename}"
        self.state["uploads"].append(path)
        self.save()
        status, _ = self.api.call("POST", f"/storage/v1/object/{BUCKET}/{path}", token, pdf, content_type="application/pdf")
        need(status in (200, 201), "storage_upload_original")
        status, rows = self.api.call("POST", "/rest/v1/case_documents", token, {"case_id": cid, "kind": "anschreiben", "file_name": filename,
            "storage_path": path, "mime_type": "application/pdf", "byte_size": len(pdf)})
        need(status == 201 and rows, "document_metadata_insert")
        return rows[0]["id"], path

    def extract(self, token, did):
        status, data = self.api.function("dokument-lesen", token, {"document_id": did})
        need(status == 200 and data.get("status") in ("gelesen", "bereits_gelesen"), "server_pdf_extraction")
        rows = self.api.rows("case_documents", {"id": "eq." + did}, token, select="id,extracted_text,extracted_pages,processing_error,processed_at")
        need(rows and rows[0].get("extracted_text") and rows[0].get("extracted_pages") and not rows[0].get("processing_error"), "persisted_pdf_extraction")
        return rows[0]

    def typed(self, cid, token, data):
        status, _ = self.api.call("PATCH", "/rest/v1/cases?id=eq." + cid, token, {"termination_input": data})
        need(status == 200, "typed_input_save")

    def analyze(self, cid, token, *, resume_user=None):
        started = time.monotonic()
        status, data = self.api.function("fall-einordnen", token, {"case_id": cid})
        need(status == 202 and isinstance(data, dict) and data.get("request_id"), "async_analysis_accepted")
        start_latency = round(time.monotonic() - started, 3)
        if resume_user:
            token = self.login(resume_user)
            self.passed("new_auth_session_resumes_accepted_background_job")
        limit = time.monotonic() + self.deadline
        while time.monotonic() < limit:
            rows = self.api.rows("cases", {"id": "eq." + cid}, token, select="status,analysis_error,active_run")
            need(rows, "case_resume_read")
            if rows[0]["status"] == "fehlgeschlagen":
                raise ProbeFailure("async_analysis_failed")
            if rows[0]["status"] == "analysiert" and rows[0]["active_run"] is None:
                result = self.api.rows("case_analyses", {"case_id": "eq." + cid, "request_id": "eq." + data["request_id"]}, token,
                    select="id,released,structured_result,model,input_revision")
                need(len(result) == 1 and result[0]["released"] is True and result[0]["model"] == "controlled-termination/1.0", "controlled_analysis_release")
                need(result[0].get("structured_result"), "structured_result_required")
                self.passed("real_controlled_worker_completion", model=result[0]["model"], source_count=len(result[0]["structured_result"].get("sources", [])), calculation_count=len(result[0]["structured_result"].get("calculations", [])), start_status=202, start_latency_seconds=start_latency, total_seconds=round(time.monotonic() - started, 3))
                return result[0]
            time.sleep(2)
        raise ProbeFailure("async_analysis_deadline")

    def report(self, cid, token):
        status, data = self.api.function("dokument-erstellen", token, {"case_id": cid, "kind": "bericht"})
        need(status == 200 and data.get("id"), "report_create")
        did = data["id"]
        status, _ = self.api.function("dokument-erstellen", token, {"action": "export", "document_id": did})
        need(status == 409, "unapproved_export_denied")
        status, data = self.api.function("dokument-erstellen", token, {"action": "approve", "document_id": did})
        need(status == 200 and data.get("approved_at") and isinstance(data.get("body"), str), "report_approve")
        body = data["body"]
        status, data = self.api.function("dokument-erstellen", token, {"action": "export", "document_id": did})
        need(status == 200 and data.get("body") == body and data.get("approved_at"), "approved_current_export")
        self.passed("approved_report_export_exact_text", unapproved_status=409, approved_export_status=200, body_sha256=hashlib.sha256(body.encode()).hexdigest())
        return did

    def absent(self, user):
        status, _ = self.api.call("GET", "/auth/v1/admin/users/" + user["id"], admin=True)
        need(status == 404, "deleted_auth_user_absent")
        need(not self.api.storage_files(user["id"]), "deleted_user_storage_empty")
        need(not self.api.rows("cases", {"owner_id": "eq." + user["id"]}, admin=True, select="id"), "deleted_user_cases_empty")

    def cleanup(self, *, preserve_native=False):
        failures, retained = [], []
        for user in self.state["users"]:
            if preserve_native and user.get("native_session"):
                retained.append(user)
                continue
            try:
                need(user["email"].startswith("rp-isolated-" + self.state["run_id"] + "-"), "cleanup_user_marker")
                if not user.get("id"):
                    # Ambiguous create response: recover through this run's random login only.
                    status, data = self.api.call("POST", "/auth/v1/token?grant_type=password", body={"email": user["email"], "password": user["password"]})
                    need(status == 200 and data.get("user", {}).get("id"), "cleanup_ambiguous_user_creation")
                    user["id"] = data["user"]["id"]
                    self.save()
                need(bool(UUID.fullmatch(user["id"])), "cleanup_user_id_invalid")
                status, data = self.api.call("GET", "/auth/v1/admin/users/" + user["id"], admin=True)
                if status != 404:
                    need(status == 200 and data.get("email") == user["email"] and data.get("user_metadata", {}).get("isolated_probe") == self.state["run_id"], "cleanup_user_identity")
                files = self.api.storage_files(user["id"])
                for index in range(0, len(files), 1000):
                    status, _ = self.api.call("DELETE", f"/storage/v1/object/{BUCKET}", body={"prefixes": files[index:index+1000]}, admin=True)
                    need(status in (200, 201), "cleanup_storage_remove")
                need(not self.api.storage_files(user["id"]), "cleanup_storage_not_empty")
                status, _ = self.api.call("DELETE", "/rest/v1/cases?owner_id=eq." + user["id"], admin=True)
                need(status in (200, 204), "cleanup_cases_remove")
                if status != 404:
                    status, _ = self.api.call("DELETE", "/auth/v1/admin/users/" + user["id"], admin=True)
                    need(status in (200, 404), "cleanup_auth_remove")
                self.absent(user)
            except Exception:
                failures.append("synthetic_user_cleanup_incomplete")
        tracked = len(self.state["users"])
        if not failures:
            if retained:
                self.state.update(users=retained, cases=[], uploads=[], purpose="native_session")
                self.save()
            else:
                self.state_path.unlink(missing_ok=True)
        return {"passed": not failures, "complete": not failures and not retained,
            "synthetic_users_tracked": tracked, "retained_native_users": len(retained), "errors": failures}

    def exercise(self):
        user, token = self.user()
        foreign, other = self.user()
        self.passed("synthetic_auth_create_and_login")
        pdf = (ROOT / "apps/mobile/public/portfolio/dev-01-document.pdf").read_bytes()
        cid, did, path, data = self.case(user, token, pdf)
        for actor, expected in ((token, True), (other, False)):
            status, owned = self.api.call("POST", "/rest/v1/rpc/owns_case", actor, {"target_case": cid})
            need(status == 200 and owned is expected, "owns_case_caller_scope")
        status, _ = self.api.call("POST", "/rest/v1/rpc/owns_case", body={"target_case": cid})
        need(status in (401, 403), "owns_case_anonymous_execute_denied")
        self.passed("ownership_helper_is_caller_scoped_and_anonymous_denied")
        document = self.extract(token, did)
        need(all(" ".join(f["evidence"]["quote"].split()) in " ".join(document["extracted_pages"][0].split()) for f in data["facts"]), "original_quote_fixture_consistency")
        status, downloaded = self.api.call("GET", f"/storage/v1/object/{BUCKET}/{path}", token)
        need(status == 200 and downloaded == pdf, "owner_original_download_exact_bytes")
        status, signed = self.api.call("POST", f"/storage/v1/object/sign/{BUCKET}/{path}", token, {"expiresIn": 60})
        need(status == 200 and isinstance(signed, dict) and isinstance(signed.get("signedURL"), str), "owner_signed_url_create")
        signed_path = signed["signedURL"]
        need(signed_path.startswith("/object/sign/") and "token=" in signed_path, "signed_url_shape")
        status, downloaded = self.api.call("GET", "/storage/v1" + signed_path)
        need(status == 200 and downloaded == pdf, "owner_short_lived_signed_url_download")
        self.passed("original_private_pdf_uploaded_and_server_extracted", owner_download_status=200, signed_url_download_status=200)
        status, _ = self.api.call("PATCH", "/rest/v1/case_documents?id=eq." + did, token, {"extracted_text": "Forged synthetic cache", "extracted_pages": ["Forged synthetic cache"]})
        need(status in (400, 401, 403), "client_extraction_write_denied")
        need(self.extract(token, did)["extracted_pages"] == document["extracted_pages"], "server_extraction_not_overwritten")
        self.passed("server_owned_extraction_permissions", client_write_status=status)
        for actor in (None, other):
            for table in ("cases", "case_documents", "case_analyses", "generated_documents"):
                status, rows = self.api.call("GET", f"/rest/v1/{table}?{'id' if table == 'cases' else 'case_id'}=eq.{cid}&select=id", actor)
                need((status == 200 and rows == []) or status in (401, 403), "private_row_read_denied")
            status, _ = self.api.call("GET", f"/storage/v1/object/{BUCKET}/{path}", actor)
            need(status in (400, 401, 403, 404), "private_storage_read_denied")
            status, _ = self.api.call("POST", f"/storage/v1/object/sign/{BUCKET}/{path}", actor, {"expiresIn": 60})
            need(status in (400, 401, 403, 404), "foreign_signed_url_denied")
            for name, body in (("dokument-lesen", {"document_id": did}), ("fall-einordnen", {"case_id": cid})):
                status, _ = self.api.function(name, actor, body)
                need(status == (401 if actor is None else 404), "foreign_or_anonymous_function_denied")
        self.passed("anonymous_and_foreign_case_document_storage_access_denied")
        bad = copy.deepcopy(data)
        next(f for f in bad["facts"] if f["key"] == "receipt_on")["value"] = "2026-11-09"
        self.typed(cid, token, bad)
        status, _ = self.api.function("fall-einordnen", token, {"case_id": cid})
        need(status == 422, "mismatched_fact_value_denied")
        need(not self.api.rows("case_analyses", {"case_id": "eq." + cid}, token), "invalid_facts_no_analysis")
        need(not self.api.rows("case_deadlines", {"case_id": "eq." + cid}, token), "invalid_facts_no_dates")
        self.passed("invalid_fact_value_cannot_create_analysis_or_dates", start_status=422)
        self.typed(cid, token, data)
        extra, _ = self.document(user, token, cid, pdf, "additional-unread.pdf")
        status, _ = self.api.function("fall-einordnen", token, {"case_id": cid})
        need(status == 422, "unread_additional_document_denied")
        self.extract(token, extra)
        self.passed("additional_unread_document_blocks_until_read", blocked_start_status=422)
        analysis = self.analyze(cid, token, resume_user=user)
        expected = {"claim_deadline": "2026-12-01", "notice_end": "2027-02-28"}
        need({c["kind"]: c["due_on"] for c in analysis["structured_result"]["calculations"]} == expected, "synthetic_calculation_fixture")
        self.passed("failed_case_resumed_in_new_login_with_expected_fixture_dates")
        report = self.report(cid, token)
        for table in ("case_analyses", "case_sources", "case_deadlines", "generated_documents"):
            need(self.api.rows(table, {"case_id": "eq." + cid}, token, select="id"), "populated_owned_children_required")
            for actor in (None, other):
                status, rows = self.api.call("GET", f"/rest/v1/{table}?case_id=eq.{cid}&select=id", actor)
                need((status == 200 and rows == []) or status in (401, 403), "populated_private_children_read_denied")
        self.passed("populated_analysis_sources_deadlines_reports_private_to_owner")
        for actor in (None, other):
            status, rows = self.api.call("GET", f"/rest/v1/generated_documents?id=eq.{report}&select=id", actor)
            need((status == 200 and rows == []) or status in (401, 403), "private_report_read_denied")
            for action in ("approve", "export"):
                status, _ = self.api.function("dokument-erstellen", actor, {"action": action, "document_id": report, "owner_id": user["id"]})
                need(status == (401 if actor is None else 409), "foreign_report_action_denied")
        self.passed("anonymous_and_foreign_report_actions_denied")
        revised = copy.deepcopy(data)
        revised["as_of"] = "2026-11-11"
        self.typed(cid, token, revised)
        status, _ = self.api.function("dokument-erstellen", token, {"action": "export", "document_id": report})
        need(status == 409, "previously_approved_stale_export_denied")
        self.passed("input_revision_invalidates_prior_approved_export", export_status=409)
        self.analyze(cid, token, resume_user=user)
        self.report(cid, token)
        self.passed("reanalysis_and_current_report_resume_after_revision")
        self.case(foreign, other, pdf, typed=False)
        status, body = self.api.function("delete-account", other, {"owner_id": user["id"]})
        need(status == 200 and body.get("deleted") is True, "delete_account_token_identity")
        self.absent(foreign)
        need(self.api.rows("cases", {"id": "eq." + cid}, token, select="id"), "foreign_delete_keeps_other_account")
        self.passed("account_deletion_uses_token_identity_and_removes_originals")
        status, body = self.api.function("delete-account", token, {})
        need(status == 200 and body.get("deleted") is True, "owner_account_delete")
        self.absent(user)
        self.passed("owner_account_auth_storage_and_cases_removed")
        status, _ = self.api.call("GET", "/auth/v1/user", token)
        need(status in (401, 403), "deleted_user_auth_rejected")
        status, _ = self.api.function("dokument-lesen", token, {"document_id": did})
        need(status == 401, "deleted_user_edge_rejected")
        stale = f"{user['id']}/{cid}/stale-jwt-upload.pdf"
        self.state["uploads"].append(stale)
        self.save()
        status, _ = self.api.call("POST", f"/storage/v1/object/{BUCKET}/{stale}", token, pdf, content_type="application/pdf")
        need(status in (400, 401, 403) and not self.api.storage_files(user["id"]), "deleted_user_storage_upload_rejected")
        self.passed("deleted_account_old_jwt_cannot_authenticate_call_edge_or_upload", storage_status=status)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--credentials-file", type=Path, required=True)
    parser.add_argument("--expected-project-ref", required=True)
    parser.add_argument("--state-file", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--cleanup", action="store_true")
    parser.add_argument("--keep-session", action="store_true", help="Retain a dedicated synthetic native-login user in the private state file after success")
    parser.add_argument("--analysis-deadline-seconds", type=int, default=900)
    args = parser.parse_args()
    config = credentials(args.credentials_file, args.expected_project_ref)
    need(10 <= args.analysis_deadline_seconds <= 1500, "analysis_deadline_invalid")
    need(not (args.cleanup and args.keep_session), "cleanup_cannot_keep_session")
    state_path = args.state_file
    need(args.output.resolve() not in (args.credentials_file.resolve(), state_path.resolve()), "output_must_not_overwrite_credentials_or_state")
    need(ROOT not in state_path.resolve().parents, "private_state_must_be_outside_repository")
    run = Run(API(config), state_path, args.expected_project_ref, existing=args.cleanup, deadline=args.analysis_deadline_seconds)
    error = None
    try:
        if not args.cleanup:
            run.exercise()
            if args.keep_session:
                native, _ = run.user()
                native["native_session"] = True
                run.save()
                run.passed("dedicated_synthetic_native_session_retained_privately")
    except KeyboardInterrupt:
        error = "interrupted"
    except ProbeFailure as exc:
        error = str(exc)
    except Exception:
        error = "unexpected_probe_failure"  # Never print response bodies, credentials or tracebacks.
    finally:
        cleanup = run.cleanup(preserve_native=bool(args.keep_session and error is None))
        output = {"executed_at": datetime.now(timezone.utc).isoformat(), "project_ref": args.expected_project_ref,
            "isolated": True, "synthetic_only": True, "paid_model_requests": 0, "expected_model": "controlled-termination/1.0", "passed": error is None and cleanup["passed"],
            "checks": run.proof, "error": error, "cleanup": cleanup, "native_pdf_print_tested": False,
            "scope": "Auth/Storage/Edge/controlled-worker/server-export; no legal, production or native release"}
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(output, indent=2) + "\n")
        print(json.dumps({"passed": output["passed"], "checks": len(run.proof), "error": error, "cleanup": cleanup["passed"]}), flush=True)
        if not cleanup["passed"]:
            print("Cleanup incomplete. Resume with --cleanup and the same private --state-file.", file=sys.stderr)
    return 0 if output["passed"] else 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except ProbeFailure as error:
        print("Probe refused: " + str(error), file=sys.stderr)
        raise SystemExit(2)
    except (OSError, ValueError):
        print("Probe refused: invalid local configuration.", file=sys.stderr)
        raise SystemExit(2)
