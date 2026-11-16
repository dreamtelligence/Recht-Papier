"""Secret-free harness checks with isolated HTTP adapters; never opens a target."""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("rollout", Path(__file__).with_name("verify-isolated-rollout.py"))
rollout = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rollout)
OWNER = "00000000-0000-0000-0000-000000000001"
RUN = "0123456789abcdef"


class RolloutTests(unittest.TestCase):
    def test_explicit_target_binding_permissions_and_legacy_ref_refusal(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "credentials.json"
            value = {"isolated": True, "supabase_url": "https://" + "a" * 20 + ".supabase.co", "anon_key": "a" * 40, "service_role_key": "s" * 40}
            rollout.private_json(path, value)
            self.assertEqual(rollout.credentials(path, "a" * 20)["supabase_url"], value["supabase_url"])
            for ref in ("b" * 20, rollout.LEGACY_TARGET):
                with self.assertRaises(rollout.ProbeFailure): rollout.credentials(path, ref)
            path.chmod(0o644)
            with self.assertRaises(rollout.ProbeFailure): rollout.credentials(path, "a" * 20)
            value["isolated"] = False
            rollout.private_json(path, value)
            with self.assertRaises(rollout.ProbeFailure): rollout.credentials(path, "a" * 20)

    def test_storage_listing_reads_all_pages_and_folders(self):
        api = rollout.API({"supabase_url": "https://isolated.invalid", "anon_key": "a", "service_role_key": "s"})
        root = [{"name": "file%04d.pdf" % i, "id": "id"} for i in range(1001)] + [{"name": "nested", "id": None}]
        offsets = []
        def call(method, path, token=None, body=None, **kwargs):
            self.assertTrue(kwargs["admin"])
            offsets.append((body["prefix"], body["offset"]))
            entries = root if body["prefix"] == OWNER else [{"name": "child.pdf", "id": "id"}]
            return 200, entries[body["offset"]:body["offset"] + body["limit"]]
        api.call = call
        self.assertEqual(len(api.storage_files(OWNER)), 1002)
        self.assertIn((OWNER, 1000), offsets)
        self.assertIn((OWNER + "/nested", 0), offsets)

    def test_cleanup_preserves_auth_and_recovery_state_when_storage_delete_fails(self):
        self.cleanup_probe(fail_remove=True)

    def test_cleanup_resumes_and_confirms_all_three_resources_absent(self):
        self.cleanup_probe(fail_remove=False)

    def test_no_redirect_can_forward_keys(self):
        self.assertIsNone(rollout.NoRedirect().redirect_request(None, None, 302, "redirect", {}, "https://foreign.invalid"))

    def test_native_session_is_explicit_private_and_resumable(self):
        with tempfile.TemporaryDirectory() as directory:
            state = Path(directory) / "private.json"
            run = rollout.Run(object(), state, "a" * 20)
            run.state.update(run_id=RUN, users=[{"id": OWNER, "native_session": True}])
            result = run.cleanup(preserve_native=True)
            self.assertTrue(result["passed"])
            self.assertFalse(result["complete"])
            self.assertEqual(result["retained_native_users"], 1)
            self.assertEqual(state.stat().st_mode & 0o777, 0o600)
            resumed = rollout.Run(object(), state, "a" * 20, existing=True)
            self.assertEqual(resumed.state["purpose"], "native_session")
            with self.assertRaises(rollout.ProbeFailure):
                rollout.Run(object(), state, "b" * 20, existing=True)

    def cleanup_probe(self, fail_remove):
        with tempfile.TemporaryDirectory() as directory:
            state = Path(directory) / "private.json"
            files, deleted, calls = [OWNER + "/case/orphan.pdf"], False, []
            user = {"id": OWNER, "email": "rp-isolated-" + RUN + "-0@example.invalid", "password": "private-test-password"}
            class Fake:
                def storage_files(self, owner):
                    self_owner = owner
                    assert self_owner == OWNER
                    return files[:]
                def rows(self, table, filters, **kwargs): return []
                def call(self, method, path, token=None, body=None, **kwargs):
                    nonlocal deleted
                    calls.append((method, path))
                    if method == "GET":
                        return (404, {}) if deleted else (200, {**user, "user_metadata": {"isolated_probe": RUN}})
                    if "/storage/" in path:
                        if fail_remove: return 500, {"private": "never-print"}
                        files.clear();return 200, []
                    if "/auth/" in path: deleted = True
                    return 200, []
            run = rollout.Run(Fake(), state, "a" * 20)
            run.state.update(run_id=RUN, users=[user]);run.save()
            result = run.cleanup()
            self.assertEqual(result["passed"], not fail_remove)
            self.assertEqual(state.exists(), fail_remove)
            self.assertEqual(deleted, not fail_remove)
            if fail_remove:
                self.assertFalse(any(method == "DELETE" and "/auth/" in path for method, path in calls))
                self.assertFalse(any(method == "DELETE" and "/rest/" in path for method, path in calls))
            else:
                deletes = [path for method, path in calls if method == "DELETE"]
                self.assertIn("/storage/", deletes[0]);self.assertIn("/rest/", deletes[1]);self.assertIn("/auth/", deletes[2])


if __name__ == "__main__":
    unittest.main()
