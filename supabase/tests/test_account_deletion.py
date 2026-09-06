"""Beweist, dass die Kontoloeschung wirklich alles entfernt.

Apple verlangt sie in der App, sobald Konten angelegt werden koennen
(Guideline 5.1.1(v)). Entscheidend ist dabei nicht der Knopf, sondern was
danach uebrig bleibt. Zwei Dinge sind hier leicht zu uebersehen:

* Die Dateien im Storage haengen an keinem Fremdschluessel. Sie ueberleben
  jede Cascade und muessen ausdruecklich entfernt werden.
* Das Loeschen des Auth-Kontos braucht den service_role-Schluessel. Der darf
  nie auf ein Geraet, deshalb laeuft es ueber eine Edge Function, die die
  Identitaet aus dem Nutzertoken aufloest.

Der Test legt ein Wegwerfkonto samt Fall und Dokument an, loescht es ueber
denselben Weg wie die App und prueft anschliessend jede Spur einzeln nach -
mit dem service_role-Schluessel, der Row Level Security umgeht. Was er dann
noch findet, ist wirklich noch da.

Aufruf:
    python3 supabase/tests/test_account_deletion.py

Erwartet SUPABASE_URL, SUPABASE_ANON_KEY und SUPABASE_SERVICE_ROLE_KEY in .env.
"""

from __future__ import annotations

import json
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from test_rls_isolation import Supabase, load_env, request  # noqa: E402

BUCKET = "case-documents"

failures: list[str] = []


def check(label: str, ok: bool, detail: str = "") -> None:
    print(f"  {'ok  ' if ok else 'FAIL'}  {label}")
    if not ok:
        if detail:
            print(f"        {detail}")
        failures.append(label)


def main() -> int:
    env = load_env()
    sb = Supabase(env)
    base = sb.url
    service_headers = {"apikey": sb.service, "Authorization": f"Bearer {sb.service}"}

    email = f"loeschtest-{uuid.uuid4().hex[:10]}@example.com"
    user_id = sb.create_user(email, "Loeschtest-Passwort-2026")
    token = sb.sign_in(email, "Loeschtest-Passwort-2026")
    storage_path = ""

    try:
        print("\nKonto mit Fall und Dokument vorbereiten")
        status, case = sb.rest(
            "POST", "cases", token,
            body={"owner_id": user_id, "title": "Loeschtest", "description": "Zu loeschender Sachverhalt."},
            prefer="return=representation",
        )
        check("Fall angelegt", status in (200, 201) and case, f"{status} {case}")
        case_id = case[0]["id"] if isinstance(case, list) and case else None

        # PDF, weil der Bucket eine MIME-Whitelist hat - text/plain weist er zu Recht ab.
        storage_path = f"{user_id}/{case_id}/anschreiben.pdf"
        # Die Hilfsmethode haengt den Bucket nicht an - der Pfad enthaelt ihn.
        status, body = sb.storage(
            "POST", f"{BUCKET}/{storage_path}", token,
            body=b"%PDF-1.4\n% Testdokument der Loeschpruefung\n", content_type="application/pdf"
        )
        check("Dokument hochgeladen", status in (200, 201), f"{status} {body}")

        status, body = sb.rest(
            "POST", "case_documents", token,
            body={"case_id": case_id, "kind": "anschreiben", "file_name": "anschreiben.pdf",
                  "storage_path": storage_path, "mime_type": "application/pdf"},
        )
        check("Dokumentmetadaten verknuepft", status in (200, 201), f"{status} {body}")

        print("\nLoeschen ueber dieselbe Funktion wie in der App")
        status, body = request(
            "POST", f"{base}/functions/v1/delete-account",
            headers={"apikey": sb.anon, "Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            body={},
        )
        check("Edge Function meldet Erfolg", status == 200 and isinstance(body, dict) and body.get("deleted"),
              f"{status} {body}")
        if isinstance(body, dict):
            check("Mindestens eine Datei entfernt", (body.get("files_removed") or 0) >= 1, f"{body}")

        print("\nWas ist wirklich weg? Nachgesehen mit service_role, also ohne RLS")
        status, body = request("GET", f"{base}/auth/v1/admin/users/{user_id}", headers=service_headers)
        check("Auth-Konto entfernt", status in (403, 404), f"{status} {body}")

        status, body = request("GET", f"{base}/rest/v1/profiles?id=eq.{user_id}&select=id", headers=service_headers)
        check("Profil entfernt", status == 200 and body == [], f"{status} {body}")

        status, body = request("GET", f"{base}/rest/v1/cases?owner_id=eq.{user_id}&select=id", headers=service_headers)
        check("Fallakte entfernt", status == 200 and body == [], f"{status} {body}")

        status, body = request(
            "GET", f"{base}/rest/v1/case_documents?storage_path=eq.{storage_path}&select=id",
            headers=service_headers,
        )
        check("Dokumentmetadaten entfernt", status == 200 and body == [], f"{status} {body}")

        status, body = request("GET", f"{base}/storage/v1/object/{BUCKET}/{storage_path}", headers=service_headers)
        check("Originaldokument aus dem Storage entfernt", status in (400, 404), f"{status} {body}")
        if status in (200, 206):
            storage_path = storage_path  # Aufraeumen im finally
        else:
            storage_path = ""

        print("\nFremde Konten bleiben unberuehrt")
        status, body = request(
            "POST", f"{base}/functions/v1/delete-account",
            headers={"apikey": sb.anon, "Content-Type": "application/json"},
            body={},
        )
        check("Ohne Anmeldung wird nichts geloescht", status in (401, 403), f"{status} {body}")

    finally:
        if storage_path:
            request("DELETE", f"{base}/storage/v1/object/{BUCKET}/{storage_path}", headers=service_headers)
        sb.delete_user(user_id)

    if failures:
        print(f"\n{len(failures)} Pruefung(en) fehlgeschlagen: {', '.join(failures)}")
        return 1
    print("\nDie Loeschung laesst nichts zurueck.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
