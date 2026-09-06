"""Wie oft beanstandet das Audit — und wofür?

Die Frage ist nicht akademisch. `answer_audit.status` entscheidet, ob die
Fallakte eine Einordnung anzeigen darf. Nach dem ersten Durchlauf stand er auf
`fail`, obwohl die Antwort alle sechs Pflichtnormen des Prüfprofils traf. Bevor
daraus eine Sperre wird, müssen die Zahlen auf dem Tisch liegen: wie häufig
`fail`, mit welchen Beanstandungen, und ob es Fragen **mit** Prüfprofil
genauso trifft wie Fragen ohne.

Der Unterschied ist entscheidend. `ISSUE_PROFILES` in Jura enthält genau ein
Profil (`arbeitsrecht_ordentliche_kuendigung_arbeitnehmer`). Außerhalb davon
werden keine Pflichtnormen nachgeschoben und `source_audit` bleibt leer —
`pass` heißt dort „nichts Erkennbares gefunden", nicht „geprüft". Ein `fail`
ohne Profil ist deshalb etwas anderes als ein `fail` mit.

Gemessen wird direkt an der Engine, nicht über Supabase: dasselbe Audit, ohne
Kaltstart der Edge Function und ohne Wegwerfkonten.

**Kostet echtes Geld und echtes Kontingent.** Jeder Lauf ist ein Modellaufruf;
der Gratis-Tarif von `gemini-2.5-flash-lite` deckelt bei 20 pro Tag und Projekt
(nachgemessen am 05.09.2026). `--max-calls` ist deshalb Pflichtteil und nicht
Vorsicht — was dadurch ausfällt, steht am Ende im Bericht, statt still zu
verschwinden.

Aufruf:
    python3 supabase/tests/mess_audit.py                    # 8 Aufrufe
    python3 supabase/tests/mess_audit.py --runs 3 --max-calls 20
    python3 supabase/tests/mess_audit.py --report mess.json
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
JURA = Path.home() / "Jura"

# Die beiden Beispielfälle. Sie gehen über /analyze, weil sie einen Sachverhalt
# tragen — genau der Weg, den `fall-einordnen` nimmt.
FAELLE = [
    {
        "id": "kuendigung",
        "art": "sachverhalt",
        "profil_erwartet": True,
        "text": (
            "Ich arbeite seit dem 01.03.2017 als Disponentin bei der Nordlicht Logistik GmbH in "
            "Hamburg. Am 31.08.2026 hat mir ein Bote die Kündigung überbracht, datiert auf den "
            "28.08.2026. Es handelt sich um eine ordentliche Kündigung zum 30.09.2026 mit der "
            "Begründung, mein Arbeitsplatz falle durch eine Umstrukturierung weg. Unterschrieben "
            "hat ein Personalreferent mit i. A., eine Vollmacht lag nicht bei. Im Betrieb "
            "arbeiten 62 Leute und es gibt einen Betriebsrat."
        ),
    },
    {
        "id": "mieterhoehung",
        "art": "sachverhalt",
        "profil_erwartet": False,
        "text": (
            "Ich wohne seit Juni 2019 zur Miete in der Hemmstraße in Bremen, 68,4 Quadratmeter. "
            "Am 04.09.2026 kam ein Schreiben der Hausverwaltung: die Kaltmiete soll ab dem "
            "01.12.2026 von 612 auf 703,80 Euro steigen, begründet mit dem Mietspiegel. Die "
            "letzte Erhöhung war zum 01.05.2025. Ich weiß nicht, ob ich zustimmen muss."
        ),
    },
]


def regression_fragen(grenze: int) -> list[dict]:
    """Die blockierenden Eval-Fälle aus Jura, soweit erreichbar."""
    pfad = JURA / "evals" / "kanzlei_core.json"
    if not pfad.exists():
        print(f"  (kein Eval-Set unter {pfad} — allgemeine Fragen entfallen)")
        return []
    daten = json.loads(pfad.read_text())
    faelle = [f for f in daten.get("cases", daten if isinstance(daten, list) else [])
              if f.get("group") == "regression_guard"]
    return [
        {"id": f["id"], "art": "frage", "text": f["query"],
         "profil_erwartet": bool(f.get("expected_profiles"))}
        for f in faelle[:grenze]
    ]


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
    env.update({k: v for k, v in os.environ.items() if k.startswith("LEGAL_ENGINE_")})
    if not env.get("LEGAL_ENGINE_URL"):
        sys.exit("LEGAL_ENGINE_URL fehlt in .env")
    return env


def frage_engine(env: dict[str, str], eintrag: dict) -> tuple[dict, float]:
    basis = env["LEGAL_ENGINE_URL"].rstrip("/")
    kopf = {"Accept": "application/json", "X-Engine-Key": env.get("LEGAL_ENGINE_API_KEY", "")}

    if eintrag["art"] == "sachverhalt":
        ziel = f"{basis}/api/legal/analyze"
        kopf["Content-Type"] = "application/json"
        rumpf = json.dumps({"sachverhalt": eintrag["text"], "frage": None, "top_k": 8}).encode()
        req = urllib.request.Request(ziel, method="POST", data=rumpf, headers=kopf)
    else:
        ziel = f"{basis}/api/legal/ask/enhanced?q={urllib.parse.quote(eintrag['text'])}&top_k=8"
        req = urllib.request.Request(ziel, headers=kopf)

    begonnen = time.monotonic()
    try:
        with urllib.request.urlopen(req, timeout=240) as antwort:
            daten = json.loads(antwort.read().decode() or "null")
    except urllib.error.HTTPError as exc:
        daten = {"error": f"HTTP {exc.code}", "answer": exc.read().decode(errors="replace")[:200]}
    except Exception as exc:  # noqa: BLE001
        daten = {"error": str(exc)}
    return daten, time.monotonic() - begonnen


def main() -> int:
    import urllib.parse  # noqa: F401  (in frage_engine benutzt)

    parser = argparse.ArgumentParser()
    parser.add_argument("--runs", type=int, default=2, help="Läufe je Fall")
    parser.add_argument("--max-calls", type=int, default=8, help="Harte Obergrenze an Modellaufrufen")
    parser.add_argument("--allgemein", type=int, default=2, help="Wie viele Eval-Fragen mitlaufen")
    parser.add_argument("--pause", type=float, default=35.0,
                        help="Sekunden zwischen zwei Aufrufen (der Gratis-Tarif greift auch pro Minute)")
    parser.add_argument("--report", default="", help="Pfad für den JSON-Bericht")
    args = parser.parse_args()

    env = load_env()
    eintraege = FAELLE + regression_fragen(args.allgemein)
    geplant = [(e, lauf) for e in eintraege for lauf in range(args.runs)]
    ausgefuehrt = geplant[: args.max_calls]
    ausgelassen = geplant[args.max_calls :]

    print(f"{len(ausgefuehrt)} Aufrufe geplant, Obergrenze {args.max_calls}.\n")

    ergebnisse: list[dict] = []
    for nummer, (eintrag, lauf) in enumerate(ausgefuehrt):
        # Ohne Pause laufen die Aufrufe in die Minutengrenze des Gratis-Tarifs
        # und die Messung misst nur noch, wie zuverlässig sie greift.
        if nummer and args.pause:
            time.sleep(args.pause)
        daten, dauer = frage_engine(env, eintrag)
        audit = daten.get("answer_audit") or {}
        plan = daten.get("retrieval_plan") or {}
        zeile = {
            "id": eintrag["id"],
            "art": eintrag["art"],
            "lauf": lauf + 1,
            "profil_erwartet": eintrag["profil_erwartet"],
            "profile": plan.get("profiles") or [],
            "status": audit.get("status", "—"),
            "high": audit.get("high_severity_count"),
            "medium": audit.get("medium_severity_count"),
            "score": audit.get("score"),
            "material_claims": audit.get("material_claims"),
            "cited_claims": audit.get("cited_claims"),
            "issues": Counter(i.get("issue") for i in (audit.get("issues") or [])),
            "model": daten.get("model"),
            "rechtsgebiet": daten.get("rechtsgebiet"),
            "citations": len(daten.get("citations") or []),
            "sekunden": round(dauer, 1),
            "fehler": daten.get("error"),
            # Bei `model == "error"` legt die Engine den Grund in `answer`.
            # Ohne ihn sieht ein aufgebrauchtes Kontingent aus wie ein
            # Qualitätsproblem — und genau das würde die Messreihe verfälschen.
            "grund": (
                str(daten.get("answer", ""))[:180]
                if daten.get("model") in ("error", "none") else None
            ),
        }
        ergebnisse.append(zeile)
        print(
            f"  {zeile['id']:<24} #{zeile['lauf']}  {str(zeile['status']):<5} "
            f"high={str(zeile['high']):<3} belegt={zeile['cited_claims']}/{zeile['material_claims']} "
            f"Profil={'ja' if zeile['profile'] else 'nein'}  {zeile['sekunden']}s"
        )
        if zeile["fehler"] or zeile["grund"]:
            print(f"      {zeile['fehler'] or zeile['grund']}")

    print("\n" + "=" * 72)
    # Ein Lauf ohne Modellantwort sagt nichts über die Belegqualität. Er wird
    # getrennt gezählt, nicht als `fail` mitgeschleift.
    ohne_antwort = [z for z in ergebnisse if z["model"] in ("error", "none") or z["fehler"]]
    gueltig = [z for z in ergebnisse if z not in ohne_antwort and z["status"] != "—"]
    if ohne_antwort:
        print(f"{len(ohne_antwort)} Lauf/Läufe ohne Modellantwort (nicht als fail gewertet):")
        for z in ohne_antwort:
            print(f"  {z['id']} #{z['lauf']}: {z['grund'] or z['fehler']}")
        print()
    if not gueltig:
        print("Keine verwertbaren Läufe.")
        return 1

    fails = [z for z in gueltig if z["status"] == "fail"]
    print(f"fail: {len(fails)} von {len(gueltig)} Läufen")

    mit_profil = [z for z in gueltig if z["profile"]]
    ohne_profil = [z for z in gueltig if not z["profile"]]
    for name, gruppe in (("mit Prüfprofil", mit_profil), ("ohne Prüfprofil", ohne_profil)):
        if not gruppe:
            continue
        schlecht = sum(1 for z in gruppe if z["status"] == "fail")
        print(f"  {name:<16} {schlecht}/{len(gruppe)} fail")

    alle_issues: Counter = Counter()
    for z in gueltig:
        alle_issues.update(z["issues"])
    print("\nBeanstandungen nach Art:")
    for art, anzahl in alle_issues.most_common():
        print(f"  {anzahl:>4}  {art}")

    belegt = sum(z["cited_claims"] or 0 for z in gueltig)
    gesamt = sum(z["material_claims"] or 0 for z in gueltig)
    if gesamt:
        print(f"\nBelegte Aussagen insgesamt: {belegt}/{gesamt} ({belegt / gesamt:.0%})")

    if ausgelassen:
        # Eine stille Kappung liest sich wie vollständige Abdeckung.
        print(f"\nAusgelassen wegen --max-calls ({len(ausgelassen)} Aufrufe):")
        for eintrag, lauf in ausgelassen:
            print(f"  {eintrag['id']} #{lauf + 1}")

    if args.report:
        for z in ergebnisse:
            z["issues"] = dict(z["issues"])
        Path(args.report).write_text(json.dumps(ergebnisse, ensure_ascii=False, indent=1))
        print(f"\nBericht: {args.report}")

    return 0


if __name__ == "__main__":
    import urllib.parse

    raise SystemExit(main())
