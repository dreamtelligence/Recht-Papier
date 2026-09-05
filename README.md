# Recht & Papier

Eine Consumer-App, die einen Rechtsfall strukturiert aufnimmt, ihn gegen geprüfte Gesetzes- und
Urteilsquellen einordnet und verständliche nächste Schritte zeigt. MVP 1 deckt Arbeitsrecht und
Mietrecht ab.

Die Fallakte ist die Datenstruktur — der Chat ist nur eine Oberfläche darauf.

## Stand

Das Fundament wird gerade gelegt. Der Repo-Inhalt wächst schrittweise:

| | Status |
|---|---|
| Architekturentscheidungen | steht (siehe `AGENTS.md`) |
| Lokaler Docker-Stack | in Arbeit |
| Legal-Engine als Dienst | offen |
| Datenmodell in Supabase | offen |
| Expo-Client | offen |

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
