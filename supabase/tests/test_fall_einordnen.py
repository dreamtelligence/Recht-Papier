"""Der ganze Weg bis zur Einordnung — Anschreiben lesen, Fall einordnen.

Der Test geht denselben Weg wie die App und prüft danach nach, was wirklich in
der Akte steht. Er legt ein Wegwerfkonto an, lädt das Kündigungsschreiben aus
`docs/beispielfaelle/` hoch, ruft `dokument-lesen` und dann `fall-einordnen`
und sieht anschließend in `case_analyses`, `case_sources` und `case_deadlines`
nach.

Alle Zugriffe laufen mit einem echten Nutzer-Token über REST. Mit
`service_role` liefe der Test an Row Level Security vorbei und würde damit
gerade das nicht beweisen, worauf es ankommt: dass die Edge Functions ohne
Sondervollmacht auskommen.

Der Lauf kostet echte Modellaufrufe und dauert beim ersten Mal lange — die
Engine lädt bei einem Kaltstart ein Einbettungsmodell und einen 211 MB großen
Index (gemessen 48 bis 120 Sekunden).

Aufruf:
    python3 supabase/tests/test_fall_einordnen.py
    python3 supabase/tests/test_fall_einordnen.py --behalten
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ANSCHREIBEN = ROOT / "docs" / "beispielfaelle" / "kuendigung-nordlicht-logistik.pdf"

SCHILDERUNG = (
    "Ich arbeite seit dem 01.03.2017 als Disponentin bei der Nordlicht Logistik GmbH in "
    "Hamburg. Am 31.08.2026 hat mir ein Bote die Kündigung überbracht, datiert auf den "
    "28.08.2026. Es handelt sich um eine ordentliche Kündigung zum 30.09.2026 mit der "
    "Begründung, mein Arbeitsplatz falle durch eine Umstrukturierung weg. Unterschrieben "
    "hat ein Personalreferent mit \"i. A.\", eine Vollmacht lag nicht bei. Im Betrieb "
    "arbeiten 62 Leute und es gibt einen Betriebsrat."
)

# Was die Prüftabelle in docs/beispielfaelle/README.md als Messlatte nennt.
# Ohne diese vier ist die Einordnung dieses Falls keine.
ERWARTETE_NORMEN = {"BGB § 622", "BGB § 623", "KSchG § 4", "BetrVG § 102"}


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


def request(method: str, url: str, *, headers: dict, body=None, timeout: int = 240):
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
            "POST", f"{self.url}/auth/v1/admin/users",
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

    def function(self, name: str, token: str, body: dict):
        return request(
            "POST", f"{self.url}/functions/v1/{name}",
            headers={"apikey": self.anon, "Authorization": f"Bearer {token}",
                     "Content-Type": "application/json"},
            body=body,
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
        print(f"  {'ok  ' if condition else 'FEHL'}  {label}{'  -> ' + str(detail)[:400] if detail and not condition else ''}")
        if not condition:
            failures.append(label)

    marker = uuid.uuid4().hex[:8]
    mail = f"einordnen-{marker}@example.com"
    password = uuid.uuid4().hex + "Aa1!"
    user_id = sb.create_user(mail, password)
    token = sb.sign_in(mail, password)
    print(f"Wegwerfkonto {mail}\n")

    case_id = ""
    storage_path = ""
    try:
        # --- Fall und Anschreiben, genau wie createCase ---------------------
        print("1. Fall anlegen")
        status, created = sb.rest(
            "POST", "cases", token,
            body={"owner_id": user_id, "title": " ".join(SCHILDERUNG.split())[:80],
                  "description": SCHILDERUNG},
            prefer="return=representation",
        )
        check("Fall angelegt", status == 201, f"{status} {created}")
        if status != 201:
            return 1
        case_id = created[0]["id"]
        storage_path = f"{user_id}/{case_id}/{ANSCHREIBEN.name}"

        sb.storage("POST", f"case-documents/{storage_path}", token, body=pdf,
                   content_type="application/pdf")
        status, doc = sb.rest(
            "POST", "case_documents", token,
            body={"case_id": case_id, "kind": "anschreiben", "file_name": ANSCHREIBEN.name,
                  "storage_path": storage_path, "mime_type": "application/pdf",
                  "byte_size": len(pdf)},
            prefer="return=representation",
        )
        check("Anschreiben hochgeladen und eingetragen", status == 201, f"{status} {doc}")
        document_id = doc[0]["id"] if status == 201 else ""

        # --- Das Anschreiben lesen -----------------------------------------
        print("\n2. dokument-lesen")
        status, body = sb.function("dokument-lesen", token, {"document_id": document_id})
        check("Dokument gelesen", status == 200 and body.get("status") == "gelesen", f"{status} {body}")

        status, rows = sb.rest(
            "GET", f"case_documents?id=eq.{document_id}&select=extracted_text,processed_at,processing_error",
            token,
        )
        text = (rows[0].get("extracted_text") or "") if rows else ""
        check("extracted_text ist gefüllt", len(text) > 500, len(text))
        check("Der Text trägt die Details des Schreibens",
              "i. A." in text and "30. September 2026" in text, text[:200])
        print(f"        {len(text)} Zeichen, Fehler: {rows[0].get('processing_error')!r}")

        # --- Einordnen ------------------------------------------------------
        print("\n3. fall-einordnen  (Kaltstart der Engine möglich, bis zu 2 Minuten)")
        begonnen = time.monotonic()
        status, body = sb.function("fall-einordnen", token, {"case_id": case_id})
        dauer = time.monotonic() - begonnen
        check("Einordnung durchgelaufen", status == 200, f"{status} {body}")
        print(f"        {dauer:.1f}s  {body if status == 200 else ''}")
        if status != 200:
            status, fall = sb.rest("GET", f"cases?id=eq.{case_id}&select=status", token)
            check("Gescheiterter Lauf hinterlässt keinen hängenden Fall",
                  fall and fall[0]["status"] == "fehlgeschlagen", fall)
            return 1

        # --- Was in der Akte steht ------------------------------------------
        print("\n4. Was in der Fallakte steht")
        _, fall = sb.rest("GET", f"cases?id=eq.{case_id}&select=status,legal_area", token)
        _, analysen = sb.rest(
            "GET", f"case_analyses?case_id=eq.{case_id}&select=id,question,answer,model,answer_audit,request_id",
            token,
        )
        _, quellen = sb.rest(
            "GET", f"case_sources?case_id=eq.{case_id}&select=reference,locator,title,valid_as_of,analysis_id",
            token,
        )
        _, fristen = sb.rest(
            "GET", f"case_deadlines?case_id=eq.{case_id}&select=label,due_on,basis,confirmed,origin", token
        )

        check("Status steht auf analysiert", fall[0]["status"] == "analysiert", fall)
        check("Rechtsgebiet erkannt", fall[0]["legal_area"] == "arbeitsrecht", fall)
        check("Genau eine Analyse", len(analysen) == 1, len(analysen))
        if not analysen:
            return 1
        analyse = analysen[0]

        check("Antworttext vorhanden", len(analyse["answer"] or "") > 400, len(analyse["answer"] or ""))
        check("Modell ist das freigegebene", analyse["model"] == "gemini-2.5-flash-lite", analyse["model"])
        check("request_id festgehalten", bool(analyse["request_id"]), analyse["request_id"])

        audit = analyse["answer_audit"] or {}
        check("answer_audit unverändert gespeichert",
              isinstance(audit, dict) and "issues" in audit and "status" in audit,
              sorted(audit.keys()) if isinstance(audit, dict) else audit)
        print(f"        Audit: {audit.get('status')}  high={audit.get('high_severity_count')}  "
              f"score={audit.get('score')}  claims={audit.get('cited_claims')}/{audit.get('material_claims')}")

        check("Fundstellen geschrieben", len(quellen) > 0, len(quellen))
        check("Jede Fundstelle hängt an der Analyse",
              all(q["analysis_id"] == analyse["id"] for q in quellen), quellen[:2])
        check("Jede Fundstelle trägt einen Rechtsstand",
              all(q["valid_as_of"] for q in quellen), [q for q in quellen if not q["valid_as_of"]][:2])

        normen = {f"{q['reference']} {q['locator']}".strip() for q in quellen}
        fehlend = ERWARTETE_NORMEN - normen
        check("Die tragenden Normen des Falls sind dabei", not fehlend, f"fehlt: {sorted(fehlend)}")
        print(f"        {sorted(normen)}")

        print(f"        Fristen: {len(fristen)}")
        for frist in fristen:
            print(f"          {frist['due_on']}  {frist['basis']}  bestätigt={frist['confirmed']}")
        check("Erkannte Fristen sind Vorschläge, keine Zusagen",
              all(not f["confirmed"] and f["origin"] == "analyse" for f in fristen), fristen)
        # Die Klagefrist ist bei diesem Fall das eigentliche Ergebnis: Zugang am
        # 31.08.2026, drei Wochen nach § 4 KSchG, Ende am 21.09.2026. Steht sie
        # nicht in der Akte, hat die Einordnung das Wichtigste nicht geliefert.
        check("Die Klagefrist steht in der Akte",
              any(f["due_on"] == "2026-09-21" for f in fristen),
              [f["due_on"] for f in fristen])

        # --- Kein zweiter Lauf auf Knopfdruck --------------------------------
        print("\n5. Schutz gegen doppelte Läufe")
        sb.rest("PATCH", f"cases?id=eq.{case_id}", token, body={"status": "in_pruefung"})
        status, body = sb.function("fall-einordnen", token, {"case_id": case_id})
        check("Ein laufender Vorgang wird nicht zweimal gestartet", status == 409, f"{status} {body}")
        sb.rest("PATCH", f"cases?id=eq.{case_id}", token, body={"status": "analysiert"})

        status, body = sb.function("fall-einordnen", token,
                                   {"case_id": "00000000-0000-0000-0000-000000000000"})
        check("Ein fremder Fall wird nicht eingeordnet", status == 404, f"{status} {body}")

    finally:
        if behalten and case_id:
            print(f"\nFall bleibt stehen: {case_id} (Konto {mail} / {password})")
        else:
            print("\n6. Aufräumen")
            if storage_path:
                sb.storage("DELETE", f"case-documents/{storage_path}", token)
            if case_id:
                sb.rest("DELETE", f"cases?id=eq.{case_id}", token)
            sb.delete_user(user_id)

    print()
    if failures:
        print(f"{len(failures)} Prüfung(en) fehlgeschlagen: {', '.join(failures)}")
        return 1
    print("Alle Prüfungen bestanden.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
