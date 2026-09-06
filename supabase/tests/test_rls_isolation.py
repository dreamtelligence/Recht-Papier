"""Beweist, dass Row Level Security die Fallakten wirklich trennt.

Eine Fallakte enthält den Sachverhalt eines Menschen. Dass niemand die Akte
eines anderen sieht, darf kein Vertrauen in korrekt geschriebenen Client-Code
sein, sondern muss in der Datenbank durchgesetzt werden. Dieser Test greift
deshalb mit echten Nutzer-Tokens über die REST-Schnittstelle zu, nicht mit dem
Service-Role-Schlüssel, der RLS ohnehin umgeht. Er prüft außerdem den privaten
Storage-Bucket samt Upload, Download und Löschung.

Aufruf:
    python supabase/tests/test_rls_isolation.py

Erwartet SUPABASE_URL, SUPABASE_ANON_KEY und SUPABASE_SERVICE_ROLE_KEY in .env.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    env_file = ROOT / ".env"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            env[key.strip()] = value.strip()
    env.update({k: v for k, v in os.environ.items() if k.startswith("SUPABASE_")})

    missing = [k for k in ("SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY") if not env.get(k)]
    if missing:
        sys.exit(f"Fehlende Variablen in .env: {', '.join(missing)}")
    return env


def request(method: str, url: str, *, headers: dict, body=None) -> tuple[int, object]:
    data = body if isinstance(body, bytes) else json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, method=method, data=data, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read().decode() or "null"
            try:
                return resp.status, json.loads(raw)
            except json.JSONDecodeError:
                return resp.status, raw
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode() or "null"
        try:
            return exc.code, json.loads(raw)
        except json.JSONDecodeError:
            return exc.code, raw


class Supabase:
    def __init__(self, env: dict[str, str]) -> None:
        self.url = env["SUPABASE_URL"].rstrip("/")
        self.anon = env["SUPABASE_ANON_KEY"]
        self.service = env["SUPABASE_SERVICE_ROLE_KEY"]

    # -- Verwaltung -------------------------------------------------------

    def create_user(self, email: str, password: str) -> str:
        status, body = request(
            "POST",
            f"{self.url}/auth/v1/admin/users",
            headers={
                "apikey": self.service,
                "Authorization": f"Bearer {self.service}",
                "Content-Type": "application/json",
            },
            body={"email": email, "password": password, "email_confirm": True},
        )
        if status not in (200, 201):
            sys.exit(f"Konnte Nutzer nicht anlegen: {status} {body}")
        return body["id"]

    def delete_user(self, user_id: str) -> None:
        request(
            "DELETE",
            f"{self.url}/auth/v1/admin/users/{user_id}",
            headers={"apikey": self.service, "Authorization": f"Bearer {self.service}"},
        )

    def sign_in(self, email: str, password: str) -> str:
        status, body = request(
            "POST",
            f"{self.url}/auth/v1/token?grant_type=password",
            headers={"apikey": self.anon, "Content-Type": "application/json"},
            body={"email": email, "password": password},
        )
        if status != 200 or "access_token" not in body:
            sys.exit(f"Anmeldung fehlgeschlagen: {status} {body}")
        return body["access_token"]

    # -- Zugriff als Nutzer ------------------------------------------------

    def rest(self, method: str, path: str, token: str, *, body=None, prefer: str | None = None):
        headers = {
            "apikey": self.anon,
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        if prefer:
            headers["Prefer"] = prefer
        return request(method, f"{self.url}/rest/v1/{path}", headers=headers, body=body)

    def storage(self, method: str, path: str, token: str, *, body=None, content_type: str | None = None):
        headers = {"apikey": self.anon, "Authorization": f"Bearer {token}"}
        if content_type:
            headers["Content-Type"] = content_type
        return request(method, f"{self.url}/storage/v1/object/{path}", headers=headers, body=body)


def main() -> int:
    env = load_env()
    sb = Supabase(env)

    marker = uuid.uuid4().hex[:8]
    alice_mail = f"rls-a-{marker}@example.com"
    bob_mail = f"rls-b-{marker}@example.com"
    password = uuid.uuid4().hex + "Aa1!"

    alice_id = sb.create_user(alice_mail, password)
    bob_id = sb.create_user(bob_mail, password)
    failures: list[str] = []
    alice = ""
    storage_path = ""

    try:
        alice = sb.sign_in(alice_mail, password)
        bob = sb.sign_in(bob_mail, password)

        def check(label: str, condition: bool, detail: str = "") -> None:
            print(f"  {'ok  ' if condition else 'FEHL'}  {label}{'  -> ' + detail if detail and not condition else ''}")
            if not condition:
                failures.append(label)

        print("Profil wird bei der Registrierung automatisch angelegt")
        status, profiles = sb.rest("GET", "profiles", alice)
        check(
            "Alice hat genau ein Profil, ihr eigenes",
            status == 200 and len(profiles) == 1 and profiles[0]["id"] == alice_id,
            f"{status} {profiles}",
        )

        print("\nAnlegen als Alice")
        status, created = sb.rest(
            "POST",
            "cases",
            alice,
            body={
                "owner_id": alice_id,
                "title": "Kündigung erhalten",
                "description": "Ich habe gestern eine Kündigung erhalten.",
                "legal_area": "arbeitsrecht",
            },
            prefer="return=representation",
        )
        check("Alice legt einen Fall an", status == 201, f"{status} {created}")
        if status != 201:
            return 1
        case_id = created[0]["id"]

        status, own = sb.rest("GET", f"cases?id=eq.{case_id}", alice)
        check("Alice sieht ihren Fall", status == 200 and len(own) == 1, f"{status} {own}")

        print("\nZugriffsversuche durch Bob")
        status, rows = sb.rest("GET", f"cases?id=eq.{case_id}", bob)
        check("Bob liest den Fall nicht", status == 200 and rows == [], f"{status} {rows}")

        status, rows = sb.rest("GET", "cases", bob)
        check("Bob sieht überhaupt keine fremden Fälle", status == 200 and rows == [], f"{status} {rows}")

        status, rows = sb.rest(
            "PATCH",
            f"cases?id=eq.{case_id}",
            bob,
            body={"title": "übernommen"},
            prefer="return=representation",
        )
        check("Bob ändert den Fall nicht", status in (200, 204) and not rows, f"{status} {rows}")

        status, rows = sb.rest("DELETE", f"cases?id=eq.{case_id}", bob, prefer="return=representation")
        check("Bob löscht den Fall nicht", status in (200, 204) and not rows, f"{status} {rows}")

        status, rows = sb.rest(
            "POST",
            "case_facts",
            bob,
            body={"case_id": case_id, "statement": "Untergeschobene Aussage"},
            prefer="return=representation",
        )
        check("Bob hängt keine Aussage an", status not in (200, 201), f"{status} {rows}")

        print("\nAnalyse, Fundstellen und Fristen")
        # Diese drei tragen das Ergebnis der Einordnung — also genau den Text,
        # den ein Modell aus dem Sachverhalt gemacht hat, und damit das, was am
        # wenigsten in fremde Hände gehört.
        #
        # Sie entstehen seit `20260906054106` und `20260906060321`
        # ausschließlich serverseitig. Ein Client, der sein eigenes Ergebnis
        # eintragen darf, kann sich eine bestandene Prüfung selbst ausstellen;
        # deshalb wird hier zuerst geprüft, dass Alice das *nicht* kann, und
        # erst danach mit `service_role` angelegt, was die Edge Function
        # anlegen würde.
        for tabelle, koerper in (
            ("case_analyses", {"case_id": case_id, "question": "Selbst eingetragen?",
                               "answer": "Gefälschtes Ergebnis.", "model": "keins"}),
            ("case_sources", {"case_id": case_id, "kind": "gesetz", "reference": "BGB",
                              "locator": "§ 1"}),
            ("case_deadlines", {"case_id": case_id, "label": "Selbst gesetzt",
                                "due_on": "2026-12-31", "basis": "§ 1 BGB"}),
        ):
            status, rows = sb.rest("POST", tabelle, alice, body=koerper)
            check(f"Alice schreibt nicht selbst in {tabelle}", status >= 400, f"{status} {rows}")

        status, analyse = sb.rest(
            "POST",
            "case_analyses",
            sb.service,
            body={
                "case_id": case_id,
                "question": "Wie ist dieser Sachverhalt rechtlich einzuordnen?",
                "answer": "Vertraulicher Analysetext.",
                "model": "gemini-2.5-flash-lite",
            },
            prefer="return=representation",
        )
        check("Der Server legt die Analyse an", status == 201, f"{status} {analyse}")
        analysis_id = analyse[0]["id"] if status == 201 else ""

        status, quelle = sb.rest(
            "POST",
            "case_sources",
            sb.service,
            body={
                "case_id": case_id,
                "analysis_id": analysis_id,
                "kind": "gesetz",
                "reference": "KSchG",
                "locator": "§ 4",
                "valid_as_of": "2026-05-08",
            },
            prefer="return=representation",
        )
        check("Der Server legt die Fundstelle an", status == 201, f"{status} {quelle}")

        status, frist = sb.rest(
            "POST",
            "case_deadlines",
            sb.service,
            body={
                "case_id": case_id,
                "analysis_id": analysis_id,
                "label": "Klagefrist",
                "due_on": "2026-09-21",
                "basis": "§ 4 KSchG",
            },
            prefer="return=representation",
        )
        check("Der Server legt die Frist an", status == 201, f"{status} {frist}")

        # Bestätigen darf Alice, umschreiben nicht: die Rechtsgrundlage einer
        # Frist ist eine Aussage des Servers, keine Eingabe des Mandanten.
        if status == 201:
            frist_id = frist[0]["id"]
            check("Alice bestätigt ihre Frist",
                  sb.rest("PATCH", f"case_deadlines?id=eq.{frist_id}", alice,
                          body={"confirmed": True})[0] in (200, 204))
            check("Alice ändert die Rechtsgrundlage nicht",
                  sb.rest("PATCH", f"case_deadlines?id=eq.{frist_id}", alice,
                          body={"basis": "§ 999 Fantasie"})[0] >= 400)

        for tabelle, was in (
            ("case_analyses", "die Analyse"),
            ("case_sources", "die Fundstellen"),
            ("case_deadlines", "die Fristen"),
        ):
            status, rows = sb.rest("GET", f"{tabelle}?case_id=eq.{case_id}", bob)
            check(f"Bob liest {was} nicht", status == 200 and rows == [], f"{status} {rows}")

        status, rows = sb.rest(
            "POST",
            "case_deadlines",
            bob,
            body={"case_id": case_id, "label": "Untergeschoben", "due_on": "2026-01-01",
                  "basis": "§ 1 BGB"},
            prefer="return=representation",
        )
        check("Bob hängt keine Frist an", status not in (200, 201), f"{status} {rows}")

        # Eine Fundstelle ohne ihre Analyse wäre ein Beleg ohne Aussage. Die
        # Migration verbietet das seit `20260905214025`; ohne diesen Test würde
        # ein späteres `alter column drop not null` unbemerkt durchgehen.
        status, verwaist = sb.rest(
            "POST",
            "case_sources",
            alice,
            body={"case_id": case_id, "kind": "gesetz", "reference": "BGB"},
            prefer="return=representation",
        )
        check("Eine Fundstelle ohne Analyse wird abgewiesen", status not in (200, 201),
              f"{status} {verwaist}")

        print("\nPrivates Dokument")
        storage_path = f"case-documents/{alice_id}/{case_id}/anschreiben.pdf"
        status, uploaded = sb.storage(
            "POST",
            storage_path,
            alice,
            body=b"%PDF-1.4\nRLS-Test\n",
            content_type="application/pdf",
        )
        check("Alice lädt ihr Dokument hoch", status == 200, f"{status} {uploaded}")

        status, own_file = sb.storage("GET", storage_path, alice)
        check("Alice liest ihr Dokument", status == 200 and isinstance(own_file, str), f"{status} {own_file}")

        status, foreign_file = sb.storage("GET", storage_path, bob)
        check("Bob liest Alices Dokument nicht", status not in (200, 201), f"{status} {foreign_file}")

        status, foreign_upload = sb.storage(
            "POST",
            f"case-documents/{alice_id}/{case_id}/fremd.pdf",
            bob,
            body=b"%PDF-1.4\nFremd\n",
            content_type="application/pdf",
        )
        check("Bob lädt nichts in Alices Ordner", status not in (200, 201), f"{status} {foreign_upload}")

        status, document = sb.rest(
            "POST",
            "case_documents",
            alice,
            body={
                "case_id": case_id,
                "kind": "anschreiben",
                "file_name": "anschreiben.pdf",
                "storage_path": storage_path.removeprefix("case-documents/"),
                "mime_type": "application/pdf",
                "byte_size": 18,
            },
            prefer="return=representation",
        )
        check("Alice verknüpft Dokument und Fall", status == 201, f"{status} {document}")

        status, foreign_documents = sb.rest("GET", f"case_documents?case_id=eq.{case_id}", bob)
        check(
            "Bob sieht Alices Dokumentmetadaten nicht",
            status == 200 and foreign_documents == [],
            f"{status} {foreign_documents}",
        )

        status, rows = sb.rest(
            "POST",
            "cases",
            bob,
            body={"owner_id": alice_id, "title": "Fremd", "description": "Auf Alices Konto"},
            prefer="return=representation",
        )
        check("Bob legt nichts auf Alices Konto an", status not in (200, 201), f"{status} {rows}")

        print("\nAlices Fall ist unverändert")
        status, after = sb.rest("GET", f"cases?id=eq.{case_id}", alice)
        unchanged = status == 200 and len(after) == 1 and after[0]["title"] == "Kündigung erhalten"
        check("Titel unverändert, Fall existiert", unchanged, f"{status} {after}")

        status, removed = sb.storage("DELETE", storage_path, alice)
        check("Alice entfernt ihr Dokument wieder", status in (200, 204), f"{status} {removed}")
        if status in (200, 204):
            storage_path = ""

    finally:
        if alice and storage_path:
            sb.storage("DELETE", storage_path, alice)
        sb.delete_user(alice_id)
        sb.delete_user(bob_id)
        print("\nTestnutzer entfernt.")

    if failures:
        print(f"\n{len(failures)} Prüfung(en) fehlgeschlagen: {', '.join(failures)}")
        return 1

    print("\nMandantentrennung hält.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
