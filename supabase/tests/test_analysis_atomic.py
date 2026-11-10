"""Echte Parallelität, Rollback, veraltete Läufe und nicht fälschbare Freigabe; ohne LLM."""
from concurrent.futures import ThreadPoolExecutor
import uuid

from test_fall_einordnen import Supabase, load_env
from portfolio_fixture import controlled_result


def main():
    sb = Supabase(load_env())
    password = uuid.uuid4().hex + "Aa1!"
    mail = f"atomic-{uuid.uuid4().hex[:8]}@example.com"
    owner = sb.create_user(mail, password)
    try:
        token = sb.sign_in(mail, password)
        status, rows = sb.rest("POST", "cases", token, body={
            "owner_id": owner, "title": "Atomarer Test", "description": "Synthetischer Kündigungsfall."},
            prefer="return=representation")
        assert status == 201, (status, rows)
        case = rows[0]["id"]
        runs = [{"p_case": case, "p_owner": owner, "p_run": str(uuid.uuid4())} for _ in range(2)]
        def rpc(name, body, auth=sb.service):
            return sb.rest("POST", f"rpc/{name}", auth, body=body)
        assert rpc("start_case_analysis", runs[0], token)[0] >= 400
        with ThreadPoolExecutor(2) as pool:
            results = list(pool.map(lambda run: rpc("start_case_analysis", run), runs))
        assert all(status == 200 for status, _ in results), results
        assert sum(body is not None for _, body in results) == 1, results
        winner = next(i for i, (_, body) in enumerate(results) if body is not None)
        run = runs[winner]
        snapshot = results[winner][1]
        payload = {**run, "p_snapshot": snapshot, "p_answer": "Die Kündigung bedarf der Schriftform [1].",
            "p_model": "controlled-termination/1.0", "p_audit": {"status": "pass", "material_claims": 1,"structured_result":controlled_result()},
            "p_source_audit": {"missing_required": []}, "p_deadlines": [], "p_area": "arbeitsrecht",
            "p_sources": [{"kind": "invalid", "reference": "BGB", "locator": "§ 623", "citation_id": "1"}]}
        assert rpc("finish_case_analysis", payload)[0] >= 400
        status, rows = sb.rest("GET", f"case_analyses?case_id=eq.{case}", token)
        assert status == 200 and rows == [], rows
        payload["p_sources"][0]["kind"] = "gesetz"
        status, result = rpc("finish_case_analysis", payload)
        assert status == 200 and result["released"] is True, (status, result)
        assert rpc("finish_case_analysis", payload)[0] >= 400
        assert sb.rest("PATCH", f"cases?id=eq.{case}", token, body={"status": "analysiert"})[0] >= 400
        assert sb.rest("POST", "case_analyses", token, body={"case_id": case, "question": "gefälscht"})[0] >= 400
        new_run = {**run, "p_run": str(uuid.uuid4())}
        status, snapshot = rpc("start_case_analysis", new_run)
        assert status == 200 and snapshot
        # `confirmed` ist seit `20260906060321` nicht mehr beim Anlegen setzbar;
        # der Client bestätigt in einem zweiten Schritt. Beides zählt
        # `input_revision` hoch, und darum geht es hier.
        status, angelegt = sb.rest("POST", "case_facts", token, body={
            "case_id": case, "statement": "Neue Angabe"}, prefer="return=representation")
        assert status == 201, (status, angelegt)
        assert sb.rest("PATCH", f"case_facts?id=eq.{angelegt[0]['id']}", token,
                       body={"confirmed": True})[0] in (200, 204)
        payload.update(new_run)
        payload["p_snapshot"] = snapshot
        assert rpc("finish_case_analysis", payload)[0] >= 400
        rpc("fail_case_analysis", run)  # alter Lauf darf den neuen nicht entsperren
        _, rows = sb.rest("GET", f"cases?id=eq.{case}", token)
        assert rows[0]["active_run"] == new_run["p_run"]
        rpc("fail_case_analysis", new_run)
        print("OK: Parallelität, Rollback, genau ein Abschluss, Manipulationsschutz, Revision und Laufbesitz")
    finally:
        sb.delete_user(owner)


if __name__ == "__main__":
    main()
