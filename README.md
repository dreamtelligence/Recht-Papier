# Recht & Papier

Eine Consumer-App, die einen Rechtsfall strukturiert aufnimmt, ihn gegen geprüfte Gesetzes- und
Urteilsquellen einordnet und verständliche nächste Schritte zeigt. MVP 1 deckt Arbeitsrecht und
Mietrecht ab.

Die Fallakte ist die Datenstruktur — der Chat ist nur eine Oberfläche darauf.

## Stand

Der technische Unterbau ist vorhanden; die Produktoberfläche ist der nächste Schritt. Der
belegte Detailstand steht in [`docs/implementation-status.md`](docs/implementation-status.md).

| | Status |
|---|---|
| Architekturentscheidungen | steht (siehe `AGENTS.md`) |
| Lokaler Docker-Stack | Qdrant und Stack-Steuerung vorhanden; aktuell nicht gestartet |
| Legal-Engine als Dienst | hostbare FastAPI-Schicht im Jura-Branch `qdrant-server-mode` |
| Qdrant-Serverindex | 17.024 Punkte ohne Neueinbettung migriert |
| Datenmodell in Supabase | sechs Fallakten-Tabellen mit RLS; Isolationstest vorhanden und zuvor bestanden |
| Expo-Client | unverändertes Expo-Standardgerüst lokal erzeugt, noch uncommittet |

Zwei frühere Stände sind als Tags erhalten: `mockup-prototype` (Vite-Prototyp im simulierten
Geräterahmen) und `capacitor-spike` (native iOS-App via Capacitor, lief auf dem Gerät). Beide
sind Design- und Verhaltensreferenz, nicht der Produktclient.

## Aufbau

- **Client:** Expo mit Expo Router, iOS und Android
- **Fallakte, Auth, Dokumente:** Supabase in der EU-Region
- **Legal-Engine:** [`dreamtelligence/Jura`](https://github.com/dreamtelligence/Jura) als eigener
  Dienst — Hybrid Retrieval, Reranking, deterministische Quality Profiles, Answer Audit
- **Trennung:** Falldaten und Rechtskorpus werden nie vermischt. Der Abfragepfad läuft in der EU
  auf CPU; die GPU auf Modal sieht ausschließlich öffentliches Recht.

Vollständige Begründung und die noch zu klärenden Punkte stehen in `AGENTS.md`.

## Hinweis

Kein Rechtsberatungsangebot. Vor einem öffentlichen Launch ist fachanwaltlich zu klären, welche
Funktionen Verbrauchern nach RDG angeboten werden dürfen.
