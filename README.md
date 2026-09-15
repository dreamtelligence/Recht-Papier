umbau B2B2C statt B2C: Deine Engine nicht direkt an Verbraucher, sondern als Werkzeug an Stellen lizenzieren, die bereits RDG-befugt sind – Mietervereine, Gewerkschaften (die haben Rechtsschutz für Mitglieder), Rechtsschutzversicherer. Die setzen dein Tool intern für die Vorprüfung/Triage ihrer eigenen Berater ein. Das umgeht das RDG-Problem komplett, weil die Rechtsdienstleistung weiterhin von einer befugten Stelle erbracht wird – du lieferst nur die Software. Das könnte bei deiner Zeitlage sogar der schnellere Weg zu echtem Geld sein: ein Pilotprojekt mit einem lokalen Mieterverein ist greifbarer als ein Consumer-Launch mit RDG-Risiko.

# Recht & Papier

Eine Consumer-App, die einen Rechtsfall strukturiert aufnimmt, ihn gegen geprüfte Gesetzes- und
Urteilsquellen einordnet und verständliche nächste Schritte zeigt. MVP 1 deckt Arbeitsrecht und
Mietrecht ab.

Die Fallakte ist die Datenstruktur — der Chat ist nur eine Oberfläche darauf.

## Stand

Der Ende-zu-Ende-Pfad läuft: Fall anlegen, Anschreiben hochladen, Text auslesen, gegen Gesetze
einordnen, Analyse mit Fundstellen und Fristen in der Akte. Der belegte Detailstand mit
gemessenen Werten steht in [`docs/implementation-status.md`](docs/implementation-status.md).

| | Status |
|---|---|
| Architekturentscheidungen | steht (siehe `AGENTS.md`) |
| Legal-Engine als Dienst | läuft; `POST /api/legal/analyze` nimmt einen ganzen Sachverhalt |
| Datenmodell in Supabase | sieben Tabellen mit RLS; Isolationstest bestanden am 06.09.2026 |
| Edge Functions | vier deployt; nur `delete-account` braucht `service_role` |
| Expo-Client | Fallakte kann einordnen, Fristen und Fundstellen anzeigen, Dokumente öffnen |
| Einordnung | gemessen: 11 Fundstellen, alle sechs Pflichtnormen, Klagefrist erkannt |

Drei Dinge stehen dem Weiterkommen im Weg, und keines davon ist Code:

- **Das Gemini-Kontingent.** Gratis-Tarif, 20 Anfragen pro Tag und Projekt. Nach wenigen
  Testläufen erschöpft. Abrechnung ist Voraussetzung für alles Weitere.
- **Mietrecht fehlt im Index.** `Mietrecht: 0` von 17.024 Dokumenten — MVP 1 sagt zwei
  Rechtsgebiete zu und liefert eines.
- **Der Falltext läuft über Modal**, nicht über den EU-CPU-Container, den `AGENTS.md` für
  diesen Pfad verlangt. Bis das steht, laufen ausschließlich erfundene Beispielfälle.

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
