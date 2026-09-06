"""Geht den Weg des Beispielfalls einmal komplett — so, wie die App ihn geht.

Der Test bildet `createCase` und `loadCaseOverview` aus
`apps/mobile/src/features/faelle/api.ts` Schritt für Schritt nach: Fallzeile,
Datei in den privaten Bucket, Dokumenteintrag, danach die fünf Abfragen, aus
denen die Fallakte auf dem Bildschirm entsteht. Am Ende räumt er in derselben
Reihenfolge auf wie `deleteCase` — erst Storage, dann Zeile.

Er beantwortet damit die Frage, wo die Sachen landen, mit echten Zeilen statt
mit einer Behauptung. Die Einordnung selbst gehört nicht hierher: sie kostet
einen Modellaufruf und wird in `test_fall_einordnen.py` geprüft. Hier wird nur
gemessen, dass `fall-einordnen` erreichbar ist und Unvollständiges ablehnt,
bevor irgendetwas Kostenpflichtiges beginnt.

Alle Zugriffe laufen mit einem echten Nutzer-Token über REST, nicht mit dem
Service-Role-Schlüssel — sonst würde der Test an RLS vorbeilaufen und nichts
beweisen. Das Wegwerfkonto wird am Ende gelöscht.

Aufruf:
    python3 supabase/tests/test_beispielfall.py
    python3 supabase/tests/test_beispielfall.py --behalten   # Fall stehen lassen

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
ANSCHREIBEN = ROOT / "docs" / "beispielfaelle" / "kuendigung-nordlicht-logistik.pdf"

SCHILDERUNG = (
    "Ich arbeite seit dem 01.03.2017 als Disponentin bei der Nordlicht Logistik GmbH in "
    "Hamburg. Am 31.08.2026 hat mir ein Bote die Kündigung überbracht, datiert auf den "
    "28.08.2026. Gekündigt wird zum 30.09.2026 mit der Begründung, mein Arbeitsplatz falle "
    "durch eine Umstrukturierung weg. Unterschrieben hat ein Personalreferent mit \"i. A.\", "
    "eine Vollmacht lag nicht bei. Im Betrieb arbeiten 62 Leute und es gibt einen Betriebsrat."
)


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    env_file = ROOT / ".env"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            env[key.strip()] = value.strip().strip('"')
    env.update({k: v for k, v in os.environ.items() if k.startswith("SUPABASE_")})

    missing = [k for k in ("SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY") if not env.get(k)]
    if missing:
        sys.exit(f"Fehlende Variablen in .env: {', '.join(missing)}")
    return env


def request(method: str, url: str, *, headers: dict, body=None, timeout: int = 120):
    data = body if isinstance(body, bytes) else json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, method=method, data=data, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
            try:
                return resp.status, json.loads(raw.decode() or "null")
            except (json.JSONDecodeError, UnicodeDecodeError):
                return resp.status, raw
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode(errors="replace") or "null"
        try:
            return exc.code, json.loads(raw)
        except json.JSONDecodeError:
            return exc.code, raw
    except urllib.error.URLError as exc:
        return 0, str(exc)


class Supabase:
    def __init__(self, env: dict[str, str]) -> None:
        self.url = env["SUPABASE_URL"].rstrip("/")
        self.anon = env["SUPABASE_ANON_KEY"]
        self.service = env["SUPABASE_SERVICE_ROLE_KEY"]

    def create_user(self, email: str, password: str) -> str:
        status, body = request(
            "POST",
            f"{self.url}/auth/v1/admin/users",
            headers={"apikey": self.service, "Authorization": f"Bearer {self.service}",
                     "Content-Type": "application/json"},
            body={"email": email, "password": password, "email_confirm": True},
        )
        if status not in (200, 201):
            sys.exit(f"Konnte Nutzer nicht anlegen: {status} {body}")
        return body["id"]

    def delete_user(self, user_id: str) -> None:
        request("DELETE", f"{self.url}/auth/v1/admin/users/{user_id}",
                headers={"apikey": self.service, "Authorization": f"Bearer {self.service}"})

    def sign_in(self, email: str, password: str) -> str:
        status, body = request(
            "POST", f"{self.url}/auth/v1/token?grant_type=password",
            headers={"apikey": self.anon, "Content-Type": "application/json"},
            body={"email": email, "password": password},
        )
        if status != 200 or "access_token" not in body:
            sys.exit(f"Anmeldung fehlgeschlagen: {status} {body}")
        return body["access_token"]

    def rest(self, method: str, path: str, token: str, *, body=None, prefer: str | None = None):
        headers = {"apikey": self.anon, "Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        if prefer:
            headers["Prefer"] = prefer
        return request(method, f"{self.url}/rest/v1/{path}", headers=headers, body=body)

    def storage(self, method: str, path: str, token: str, *, body=None, content_type: str | None = None):
        headers = {"apikey": self.anon, "Authorization": f"Bearer {token}"}
        if content_type:
            headers["Content-Type"] = content_type
        return request(method, f"{self.url}/storage/v1/object/{path}", headers=headers, body=body)

    def list_objects(self, storage_path: str) -> list[str]:
        """Was wirklich noch im Bucket liegt — mit service_role, am Cache vorbei."""
        ordner, _, datei = storage_path.rpartition("/")
        status, body = request(
            "POST", f"{self.url}/storage/v1/object/list/case-documents",
            headers={"apikey": self.service, "Authorization": f"Bearer {self.service}",
                     "Content-Type": "application/json"},
            body={"prefix": ordner, "limit": 100},
        )
        if status != 200 or not isinstance(body, list):
            return [f"Auflistung fehlgeschlagen: {status} {body}"]
        return [eintrag["name"] for eintrag in body if eintrag.get("name") == datei]

    def function(self, name: str, token: str, body: dict):
        return request(
            "POST", f"{self.url}/functions/v1/{name}",
            headers={"apikey": self.anon, "Authorization": f"Bearer {token}",
                     "Content-Type": "application/json"},
            body=body, timeout=180,
        )


def main() -> int:
    behalten = "--behalten" in sys.argv
    env = load_env()
    sb = Supabase(env)

    if not ANSCHREIBEN.exists():
        sys.exit(f"Anschreiben fehlt: {ANSCHREIBEN}")
    pdf = ANSCHREIBEN.read_bytes()

    failures: list[str] = []

    def check(label: str, condition: bool, detail: str = "") -> None:
        print(f"  {'ok  ' if condition else 'FEHL'}  {label}{'  -> ' + str(detail) if detail and not condition else ''}")
        if not condition:
            failures.append(label)

    marker = uuid.uuid4().hex[:8]
    mail = f"beispiel-{marker}@example.com"
    password = uuid.uuid4().hex + "Aa1!"
    user_id = sb.create_user(mail, password)
    token = sb.sign_in(mail, password)
    print(f"Wegwerfkonto {mail}\n  auth.users.id = {user_id}\n")

    case_id = ""
    storage_path = ""
    try:
        # --- 1. Fallzeile, genau wie createCase sie schreibt ---------------
        print("1. cases")
        title = " ".join(SCHILDERUNG.split())[:80]
        status, created = sb.rest(
            "POST", "cases", token,
            body={"owner_id": user_id, "title": title, "description": SCHILDERUNG},
            prefer="return=representation",
        )
        check("Fall angelegt", status == 201, f"{status} {created}")
        if status != 201:
            return 1
        case_id = created[0]["id"]
        print(f"        cases.id     = {case_id}")
        print(f"        status       = {created[0]['status']}   (Default aus der Migration)")
        print(f"        title        = {title[:60]}…")

        # --- 2. Datei in den privaten Bucket ------------------------------
        print("\n2. storage: bucket case-documents")
        safe = ANSCHREIBEN.name.replace(" ", "_")
        storage_path = f"{user_id}/{case_id}/{safe}"
        status, body = sb.storage("POST", f"case-documents/{storage_path}", token,
                                  body=pdf, content_type="application/pdf")
        check("PDF hochgeladen", status in (200, 201), f"{status} {body}")
        print(f"        Pfad         = case-documents/{storage_path}")

        status, blob = sb.storage("GET", f"case-documents/{storage_path}", token)
        check("PDF wieder lesbar und unverändert",
              status == 200 and isinstance(blob, (bytes, bytearray)) and bytes(blob) == pdf,
              f"{status} {len(blob) if isinstance(blob,(bytes,bytearray)) else blob}")

        # --- 3. Dokumenteintrag -------------------------------------------
        print("\n3. case_documents")
        status, doc = sb.rest(
            "POST", "case_documents", token,
            body={"case_id": case_id, "kind": "anschreiben", "file_name": ANSCHREIBEN.name,
                  "storage_path": storage_path, "mime_type": "application/pdf",
                  "byte_size": len(pdf)},
            prefer="return=representation",
        )
        check("Dokumenteintrag geschrieben", status == 201, f"{status} {doc}")
        if status == 201:
            print(f"        kind         = {doc[0]['kind']}")
            print(f"        extracted_text = {doc[0]['extracted_text']!r}   (niemand füllt das heute)")

        # --- 4. Die fünf Abfragen der Fallakte ----------------------------
        print("\n4. loadCaseOverview — was der Bildschirm zieht")
        _, fall = sb.rest("GET", f"cases?id=eq.{case_id}&select=id,title,status,legal_area,description", token)
        _, dokumente = sb.rest("GET", f"case_documents?case_id=eq.{case_id}&select=id,file_name,byte_size", token)
        _, fakten = sb.rest("GET", f"case_facts?case_id=eq.{case_id}&select=id,statement", token)
        _, analysen = sb.rest("GET", f"case_analyses?case_id=eq.{case_id}&select=id,question,answer", token)
        _, quellen = sb.rest("GET", f"case_sources?case_id=eq.{case_id}&select=id,reference", token)

        check("Fall wird gefunden", len(fall) == 1, fall)
        check("genau ein Dokument hängt am Fall", len(dokumente) == 1, dokumente)
        print(f"        legal_area   = {fall[0]['legal_area']!r}   (die App setzt es nicht)")
        print(f"        case_facts   = {len(fakten)}   Abschnitt 'Bestätigte Angaben'")
        print(f"        case_analyses= {len(analysen)}   Abschnitt 'Rechtliche Einordnung'")
        print(f"        case_sources = {len(quellen)}   Abschnitt 'Rechtsgrundlagen'")

        # --- 5. Die angeschlossenen Edge Functions -------------------------
        print("\n5. Edge Functions")
        # Dieser Test hielt `fall-einordnen` lange für nicht vorhanden und prüfte
        # auf 404. Seit die Function deployt ist, prüft er das Gegenteil — aber
        # nur die Erreichbarkeit: der Lauf selbst kostet einen Modellaufruf und
        # gehört nach `test_fall_einordnen.py`.
        #
        # Ohne Fall-ID muss die Function ablehnen, und zwar bevor irgendetwas
        # Kostenpflichtiges passiert. Genau das wird hier gemessen.
        status, body = sb.function("fall-einordnen", token, {})
        check("fall-einordnen ist erreichbar und weist Unvollständiges ab",
              status == 400, f"unerwarteter Status {status}: {str(body)[:200]}")

        status, body = sb.function("recht-nachschlagen", token,
                                   {"frage": "Wie lang ist die Kündigungsfrist nach neun Jahren im Betrieb?"})
        if status == 200 and isinstance(body, dict):
            zitate = body.get("citations") or []
            check("recht-nachschlagen antwortet", bool(body.get("answer")), body)
            check("Antwort trägt Fundstellen", len(zitate) > 0, body)
            print(f"        Modell       = {body.get('model')}")
            print(f"        Rechtsgebiet = {body.get('rechtsgebiet')}")
            print(f"        Audit        = {body.get('audit')}")
            # Die Engine nennt die Fundstelle `gesetz` + `paragraph`; `reference`
            # heißt erst die Spalte in `case_sources`. Ein `z.get("reference")`
            # trifft hier also nie und gäbe das ganze Citation-Dict aus.
            fundstellen = [
                " ".join(filter(None, (z.get("gesetz"), z.get("paragraph")))) for z in zitate
            ]
            print(f"        Fundstellen  = {fundstellen[:4]}")
            print(f"        Antwort      = {str(body.get('answer'))[:180]}…")
        else:
            check("recht-nachschlagen antwortet", False, f"{status} {str(body)[:300]}")

    finally:
        if behalten and case_id:
            print(f"\nFall bleibt stehen: {case_id} (Konto {mail} / {password})")
        else:
            # Dieselbe Reihenfolge wie deleteCase: erst Storage, dann Zeile.
            # storage.objects hängt an keinem Fremdschlüssel.
            print("\n6. Aufräumen (Reihenfolge wie deleteCase)")
            if storage_path:
                status, _ = sb.storage("DELETE", f"case-documents/{storage_path}", token)
                check("Datei aus dem Bucket entfernt", status in (200, 204), status)
                # Nicht per GET nachfassen. Nachgemessen am 05.09.2026: hat
                # dasselbe Token die Datei vorher einmal geladen, liefert
                # Cloudflare sie danach weiter aus — `cf-cache-status: HIT`,
                # obwohl das Objekt im Bucket weg ist. Der Cache-Schlüssel
                # enthält das Token, ein fremdes Token und ein anonymer Abruf
                # bekommen 400; es ist also kein Mandantenleck, aber ein GET
                # beweist hier nichts. Die Auflistung geht an den Ursprung.
                check("Datei nicht mehr im Bucket", not sb.list_objects(storage_path), storage_path)
            if case_id:
                status, _ = sb.rest("DELETE", f"cases?id=eq.{case_id}", token)
                check("Fallzeile gelöscht", status in (200, 204), status)
                status, rest = sb.rest("GET", f"case_documents?case_id=eq.{case_id}", token)
                check("Dokumenteintrag per Cascade mitgegangen", rest == [], rest)
            sb.delete_user(user_id)

    print()
    if failures:
        print(f"{len(failures)} Prüfung(en) fehlgeschlagen: {', '.join(failures)}")
        return 1
    print("Alle Prüfungen bestanden.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
