"""Von bestätigten Angaben zum freigegebenen Dokument — und was dabei nicht geht.

Der Test geht die Strecke aus Schritt 5 des Umsetzungsplans einmal ganz durch:
Angabe bestätigen, Analyse abschließen, Bericht erstellen, freigeben. Danach
prüft er die Sperren, auf denen diese Strecke beruht — jede einzeln, und jede
über denselben Weg, den auch die App nimmt.

Der Modellaufruf wird bewusst umgangen. `start_case_analysis` und
`finish_case_analysis` werden mit `service_role` direkt gerufen, so wie
`fall-einordnen` es tut. Was hier geprüft wird, sind die Regeln der Datenbank
und der Edge Function, nicht die Qualität einer Einordnung — und ein echter
Lauf würde am Tageskontingent von `gemini-2.5-flash-lite` scheitern, ohne über
diese Regeln irgendetwas auszusagen.

Aufruf:
    python3 supabase/tests/test_dokument_freigabe.py
"""

from __future__ import annotations

import sys
import uuid

from test_fall_einordnen import Supabase, load_env
from portfolio_fixture import controlled_result

ANGABE = "Die Kündigung ist mir am 31.08.2026 zugegangen."
ZWEITE_ANGABE = "Im Betrieb arbeiten 62 Personen."


def main() -> int:
    sb = Supabase(load_env())
    failures: list[str] = []

    def check(label: str, condition: bool, detail: str = "") -> None:
        print(f"  {'ok  ' if condition else 'FEHL'}  {label}"
              f"{'  -> ' + str(detail)[:300] if detail and not condition else ''}")
        if not condition:
            failures.append(label)

    password = uuid.uuid4().hex + "Aa1!"
    mail = f"dokument-{uuid.uuid4().hex[:8]}@example.com"
    owner = sb.create_user(mail, password)
    fremd_mail = f"fremd-{uuid.uuid4().hex[:8]}@example.com"
    fremd = sb.create_user(fremd_mail, password)

    try:
        token = sb.sign_in(mail, password)
        fremd_token = sb.sign_in(fremd_mail, password)

        def rpc(name: str, body: dict):
            return sb.rest("POST", f"rpc/{name}", sb.service, body=body)

        # --- Akte anlegen -------------------------------------------------
        print("1. Akte mit einer bestätigten Angabe")
        status, rows = sb.rest(
            "POST", "cases", token,
            body={"owner_id": owner, "title": "Dokumentstrecke",
                  "description": "Synthetischer Kündigungsfall."},
            prefer="return=representation",
        )
        if status != 201:
            sys.exit(f"Fall nicht angelegt: {status} {rows}")
        case = rows[0]["id"]

        status, fakt_rows = sb.rest(
            "POST", "case_facts", token,
            body={"case_id": case, "statement": ANGABE},
            prefer="return=representation",
        )
        check("Angabe angelegt", status == 201, f"{status} {fakt_rows}")
        fakt = fakt_rows[0]["id"]
        check("Angabe ist zunächst unbestätigt", fakt_rows[0]["confirmed"] is False)
        # Die Herkunft gehört dem Server. Ein Client, der sie setzen darf,
        # kann eine aus dem Schreiben gezogene Aussage als eigene ausgeben.
        check("Herkunft nicht fälschbar",
              sb.rest("PATCH", f"case_facts?id=eq.{fakt}", token,
                      body={"origin": "extraktion"})[0] >= 400)
        check("Angabe bestätigen geht",
              sb.rest("PATCH", f"case_facts?id=eq.{fakt}", token,
                      body={"confirmed": True})[0] in (200, 204))

        # --- Ohne bestandene Analyse kein Dokument ------------------------
        print("2. Ohne bestandene Einordnung entsteht nichts")
        status, body = sb.function("dokument-erstellen", token,
                                   {"case_id": case, "kind": "bericht"})
        check("Bericht ohne Analyse abgelehnt", status in (404, 422), f"{status} {body}")

        def analyse_abschliessen(released: bool) -> tuple[int, object]:
            run = {"p_case": case, "p_owner": owner, "p_run": str(uuid.uuid4())}
            status, snapshot = rpc("start_case_analysis", run)
            if status != 200 or not snapshot:
                sys.exit(f"Lauf nicht gestartet: {status} {snapshot}")
            return rpc("finish_case_analysis", {
                **run, "p_snapshot": snapshot,
                "p_answer": "Die Kündigung bedarf der Schriftform [1].",
                "p_model": "controlled-termination/1.0",
                # `released` entscheidet die Datenbank aus Audit und
                # Quellenlage. Ein nicht bestandenes Audit ist deshalb der
                # einzige Weg, eine gesperrte Analyse zu erzeugen.
                "p_audit": {"status": "pass" if released else "fail", "material_claims": 1, "structured_result":controlled_result([ANGABE])},
                "p_source_audit": {"missing_required": [] if released else ["BGB § 623"]},
                "p_deadlines": [], "p_area": "arbeitsrecht",
                "p_sources": [{"kind": "gesetz", "reference": "BGB", "locator": "§ 623",
                               "citation_id": "1", "title": "Schriftform der Kündigung"}],
            })

        print("3. Eine durchgefallene Einordnung trägt kein Dokument")
        status, ergebnis = analyse_abschliessen(released=False)
        check("Analyse gespeichert, aber gesperrt",
              status == 200 and ergebnis["released"] is False, f"{status} {ergebnis}")
        status, body = sb.function("dokument-erstellen", token,
                                   {"case_id": case, "kind": "bericht"})
        check("Bericht aus gesperrter Analyse abgelehnt", status == 422, f"{status} {body}")

        # --- Der Weg, der funktionieren muss ------------------------------
        print("4. Bestandene Einordnung, Bericht, Freigabe")
        status, ergebnis = analyse_abschliessen(released=True)
        check("Analyse freigegeben",
              status == 200 and ergebnis["released"] is True, f"{status} {ergebnis}")

        status, body = sb.function("dokument-erstellen", token,
                                   {"case_id": case, "kind": "bericht"})
        check("Bericht erstellt", status == 200 and body.get("id"), f"{status} {body}")
        dokument = body["id"]

        status, rows = sb.rest("GET", f"generated_documents?id=eq.{dokument}", token)
        check("Bericht lesbar", status == 200 and len(rows) == 1, f"{status} {rows}")
        text = rows[0]["body"]
        check("Bestätigte Angabe steht im Bericht", ANGABE in text)
        check("Quelle steht mit Fundstelle im Bericht", "§ 623 BGB" in text)
        check("Bericht ist zunächst Entwurf", rows[0]["approved_at"] is None)

        print("5. Was der Client nicht selbst darf")
        check("Kein eigenes Dokument einfügen",
              sb.rest("POST", "generated_documents", token,
                      body={"case_id": case, "analysis_id": ergebnis["analysis_id"],
                            "kind": "bericht", "title": "Gefälscht", "body": "Text",
                            "input_revision": 0})[0] >= 400)
        check("Freigabe nicht selbst eintragen",
              sb.rest("PATCH", f"generated_documents?id=eq.{dokument}", token,
                      body={"approved_at": "2026-09-06T00:00:00Z"})[0] >= 400)
        check("Fremder sieht das Dokument nicht",
              sb.rest("GET", f"generated_documents?id=eq.{dokument}", fremd_token)[1] == [])
        check("Fremder kann es nicht freigeben",
              sb.function("dokument-erstellen", fremd_token,
                          {"action": "approve", "document_id": dokument})[0] >= 400)

        print("6. Freigabe")
        status, body = sb.function("dokument-erstellen", token,
                                   {"action": "approve", "document_id": dokument})
        check("Freigegeben", status == 200 and body.get("approved_at"), f"{status} {body}")

        # --- Ab hier ist die Akte eine andere ------------------------------
        print("7. Eine geänderte Akte macht Einordnung und Entwurf ungültig")
        status, zweite = sb.rest("POST", "case_facts", token,
                                 body={"case_id": case, "statement": ZWEITE_ANGABE},
                                 prefer="return=representation")
        check("Zweite Angabe angelegt", status == 201, f"{status} {zweite}")
        sb.rest("PATCH", f"case_facts?id=eq.{zweite[0]['id']}", token, body={"confirmed": True})

        status, body = sb.function("dokument-erstellen", token,
                                   {"case_id": case, "kind": "bericht"})
        check("Kein neues Dokument aus veralteter Analyse", status == 409, f"{status} {body}")

        status, rows = sb.rest("GET", f"cases?id=eq.{case}&select=input_revision", token)
        status2, analysen = sb.rest(
            "GET", f"case_analyses?case_id=eq.{case}&select=input_revision&order=created_at.desc",
            token)
        check("Eingabestand ist weitergezählt",
              rows[0]["input_revision"] != analysen[0]["input_revision"],
              f"{rows} {analysen}")

        # Ein zweites Mal freigeben würde einen Text erneut bestätigen, den
        # die Akte nicht mehr trägt.
        check("Veralteter Entwurf nicht erneut freigebbar",
              sb.function("dokument-erstellen", token,
                          {"action": "approve", "document_id": dokument})[0] >= 400)

        print()
        if failures:
            print(f"FEHLGESCHLAGEN: {len(failures)} — {', '.join(failures)}")
            return 1
        print("OK: bestätigte Angaben, Freigabe der Analyse, Bericht, Freigabe, "
              "Manipulationsschutz und Veralten")
        return 0
    finally:
        sb.delete_user(owner)
        sb.delete_user(fremd)


if __name__ == "__main__":
    raise SystemExit(main())
