"""Shared real Supabase test client and the controlled portfolio end-to-end entry.

The full pipeline is in scripts/verify-portfolio-e2e.py. Other integration tests
reuse Supabase/request/load_env below; no test weakens production model guards.
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
    """The portfolio integration replaces the historical free-model fixture."""
    import subprocess
    command=[sys.executable,str(ROOT / "scripts/verify-portfolio-e2e.py")]
    if "--behalten" in sys.argv: command.append("--keep-user")
    return subprocess.call(command)


if __name__ == "__main__":
    raise SystemExit(main())
