# Implementierungsstand vom 5. September 2026

Dieser Stand trennt eingecheckte Implementierung, frühere Laufzeitmessungen und noch offene
Arbeit. Er wurde aus beiden Repositories und ihren Commit-Ständen geprüft.

## Recht & Papier

Branch `expo-client`, Commit `180ede1` (identisch mit `main` und `origin/main`):

- Der lokale Stack steuert Qdrant über `infra/docker-compose.yml` und `infra/stack.sh`.
- Das Supabase-Projekt `Recht und Papier` ist in `eu-central-1` (Frankfurt) angelegt.
- Die Migration `20260905095138_case_file.sql` enthält `profiles`, `cases`,
  `case_documents`, `case_facts`, `case_analyses` und `case_sources`.
- Alle sechs Tabellen erzwingen Row Level Security. Der eigenständige REST-Isolationstest legt
  zwei echte Nutzer an und prüft zehn Zugriffe mit deren Nutzer-Tokens. Der Test wurde beim
  Abschluss des Commits erfolgreich ausgeführt; in dieser Bestandsaufnahme lief der lokale
  Docker-/Supabase-Stack nicht und wurde deshalb nicht erneut ausgeführt.
- Das Expo-Standardprojekt unter `apps/mobile` ist bereits heruntergeladen. Es ist unverändert,
  uncommittet und noch keine Recht-&-Papier-Oberfläche.

## Jura als Legal-Engine

Branch `qdrant-server-mode`, Commit `72187a8`:

- Die FastAPI-Routen und die In-Process-Engine sind aus der Modal-Verpackung gelöst. Modal und
  ein eigener EU-Container können damit dieselbe Serving-Logik verwenden.
- `QDRANT_URL` schaltet vom eingebetteten Qdrant auf einen Qdrant-Server um.
- Das Migrationsskript kopiert vorhandene Vektoren und Payloads. 17.024 Punkte wurden ohne
  erneutes Einbetten auf den Server übertragen.
- `RERANKER_ENABLED=0` ist ausschließlich ein Entwicklungsschalter. Ergebnisse werden mit
  `rerank_disabled` markiert; Produktion bleibt auf den Cross-Encoder angewiesen.

Früher gemessener Retrieval-Smoke-Test mit deaktiviertem Reranker:

| Frage | Treffer 1 |
|---|---|
| Kündigungsfrist im Arbeitsvertrag | § 622 BGB |
| Mietminderung wegen Schimmel | § 536 BGB |
| Zeit für eine Kündigungsschutzklage | § 4 KSchG |

Gemessen wurden 10,5 s zum Laden des Index sowie 3,6 s, 0,23 s und 0,07 s für die drei
aufeinanderfolgenden CPU-Abfragen. Diese Messung belegt den lokalen Dense-Sparse-Pfad, aber
noch nicht Latenz oder Qualität mit aktivem Reranker und nicht die Produktionslast.

## Offene Grenze

Der Legal-Engine-Service ist noch nicht in den Recht-&-Papier-Compose-Stack eingetragen. Der
Reranker-Download und seine CPU-Messung sind noch offen. Danach folgt die eigentliche
Expo-Produktoberfläche samt Verbindung zu Supabase und Jura.
