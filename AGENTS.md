# Recht & Papier — Agent Guide

## Was hier gebaut wird

Recht & Papier ist das erste eigene Produkt von **Klein Digital Solutions** (geplante
Umbenennung: **Dreamtelligence**): eine Consumer-App, die einen Rechtsfall
strukturiert aufnimmt, ihn gegen geprüfte Gesetzes- und Urteilsquellen einordnet und
verständliche nächste Schritte zeigt. MVP 1 bleibt bewusst auf **Arbeitsrecht und Mietrecht**
begrenzt.

Zwei Sätze, die alles andere bestimmen:

- **Die Fallakte ist die Datenstruktur, der Chat ist nur eine Oberfläche.**
- **Schreiben entstehen aus strukturierten, freigegebenen Falldaten — nicht aus dem Chatverlauf.**

Das Produkt ist keine KI-Anwältin. Formulierungen und Funktionsumfang folgen dem
fachanwaltlich bestätigten Leistungsbild.

## Vor jeder nicht-trivialen Änderung: Semantica

Projektwissen liegt im Semantica-MCP und ist dort verbindlich. Relevante Knoten:

| Knoten | Inhalt |
|---|---|
| `product:recht-und-papier` | Produktwurzel |
| `domain-model:legal-case-file` | Fallakte, 13 Entitäten, Chat-ist-Oberfläche-Regel |
| `architecture:recht-und-papier-core` | Pipeline und Invarianten der Legal-Engine |
| `roadmap:recht-und-papier-mvp1` | Funktionsumfang und Qualitätsvoraussetzungen |
| `compliance:recht-und-papier` | RDG, DSGVO, AI Act, Store-Regeln — Launch-Gate |
| `research:apple-app-review-recht-und-papier-2026-09-05` | Apple-Review-Primärquellen und technische Release-Gates |
| `stack:recht-und-papier` | Zielstack |
| `coding-principles` | Benennung, kleine Bausteine, keine Secrets, Tests |
| `vibe-coding-observability` | Absicherung über Logs, Metriken, Traces und Checks |

Neue Erkenntnisse und Architekturentscheidungen werden dort festgehalten, veraltetes Wissen
wird korrigiert statt ergänzt.

## Architektur

### Client

**Expo mit Expo Router** für iOS und Android (Entscheidungen `08357e6d`, bestätigt durch
`2a9ae9a0`). Begründung: Apple-Richtlinie 4.2 zielt auf dünne WebView-Wrapper und ein
Verbraucher-Rechtsprodukt steht ohnehin unter erhöhter Prüfung; Abos brauchen auf iOS IAP;
EAS liefert reproduzierbare signierte Builds für beide Stores.

### Backend — Trennung nach Datensensibilität

Die Leitlinie, aus der alles folgt: **Falldaten und Rechtskorpus werden nie vermischt.**

| Schicht | Wahl |
|---|---|
| Auth, Fallakte, Dokumente | Supabase, EU-Region Frankfurt, Row Level Security |
| Legal-Engine | `dreamtelligence/Jura` als eigener containerisierter FastAPI-Dienst |
| Vektorsuche | Qdrant, self-hosted im selben EU-Netz |
| Online-Pfad (Abfrage) | CPU, EU-Container — **kein Falltext durch US-GPU-Compute** |
| Offline-Pfad (Index) | Modal-GPU — sieht ausschließlich öffentliches Recht |
| Scraping | lokal, manche Rechtsquellen blocken Rechenzentrums-IPs |

Modal bleibt also, aber nur für den Indexaufbau. Das löst die heikelste DSGVO-Frage
strukturell statt vertraglich. Details in Entscheidung `d150e31f`.

### Lokale Entwicklung

**Docker Desktop auf macOS erreicht die Apple-GPU nicht** — Container laufen in einer Linux-VM
ohne Metal. Daraus folgt die Aufteilung (Entscheidung `8d0d91c0`):

- **Im Container:** Qdrant, Jura-API mit CPU-Modellen, Supabase-Lokalstack.
- **Nicht im Container:** Neuindizierung und Ingestion — nativ auf dem Mac oder auf Modal.

### Apple App Review

Der Expo-Weg ist technisch App-Store-fähig, der aktuelle Starter aber nicht einreichbar. Vor
dem ersten Review sind insbesondere das von Apple bestätigte Einreichungsmodell für Klein
Digital Solutions als Einzelunternehmen, StoreKit-IAP, vollständige In-App-Kontolöschung, der
offengelegte und eingewilligte LLM-Datenfluss, Privacy Labels/Manifeste sowie ein dauerhaft
erreichbarer Review-Zugang verbindliche Gates. Vollständige Primärquellen und Checkliste:
[`docs/apple-app-review-readiness.md`](docs/apple-app-review-readiness.md).

## Repo-Aufbau

Ordner entstehen, wenn sie echten Inhalt haben — keine leeren Platzhalter.

```
assets/brand/     Ballonillustration, Papiertextur, App-Icon
docs/             Design- und QA-Aufzeichnungen
infra/            docker-compose und stack.sh für den lokalen Stack
packages/shared/  Typen und generierter Engine-Client         (Schritt 4)
supabase/         Migrationen und RLS-Policies                (Schritt 6)
apps/mobile/      Expo-Client mit Expo Router
```

### Lokaler Stack starten

```
cp .env.example .env      # ausfüllen, .env bleibt außerhalb des Repositories
npm run stack:up          # startet Qdrant, prüft Bereitschaft vom Host aus
npm run stack:status
npm run stack:down        # stack:reset verwirft zusätzlich die Volumes
```

Der Docker-VM stehen auf diesem Rechner rund **7,7 GiB** zur Verfügung. bge-m3 und der
Reranker zusammen mit Qdrant passen dort nur knapp — ein Grund mehr, Ingestion außerhalb
des Containers zu halten.

### Client starten

```
cd apps/mobile
npx expo start --ios      # Simulator über Expo Go
```

Für das echte Gerät mit eigener Bundle-ID und nativen Modulen braucht es einen
Dev-Build (`npx expo run:ios` oder EAS), nicht Expo Go.

**Vor Änderungen am Client gilt `apps/mobile/AGENTS.md`: erst die versionierten
SDK-57-Dokumente lesen.** Zwei Fallen, die dort bereits zugeschlagen haben: ein
top-level `splash`-Block in `app.json` ist seit SDK 52 wirkungslos, native Splash
läuft über den `expo-splash-screen`-Plugin; und eine selbst angelegte
`babel.config.js` bringt Metro zum Absturz — Expo konfiguriert Babel selbst.

## Frühere Stände

Nichts wurde gelöscht, beides ist als Tag erreichbar:

- `mockup-prototype` — Vite-Prototyp im simulierten Geräterahmen
- `capacitor-spike` — daraus gebaute Capacitor-iOS-App, lief auf dem Gerät

Aus dem Spike zu übernehmen sind Konzepte, nicht Code: die Papier-Designsprache in
`src/prototype.css`, das Verhalten des Fall-Sheets (ruhig öffnen, Tastatur erst beim Tippen ins
Feld, Sheet fährt mit der Tastatur statt zu springen) und die Safe-Area-Verankerung der
Primäraktion.

## Vor Umsetzung an Primärquellen prüfen

`stack:recht-und-papier` verlangt das ausdrücklich. Nicht aus dem Gedächtnis entscheiden:

- **LLM-Wahl und EU-Datenresidenz.** Semantica notiert GPT-5.6, Jura nutzt real Gemini 2.5
  Flash-Lite. Größte DSGVO-Exposition, braucht AVV und EU-Verarbeitung.
- **Modal-Regionen** für den Ingestion-Pfad.
- **Apple-Regeln erneut vor Submission prüfen.** Der verifizierte Stand vom 05.09.2026 liegt in
  `docs/apple-app-review-readiness.md`; Apples Guidelines sind ein lebendes Dokument.
- **RDG-Leistungsbild** — fachanwaltlich, bevor Funktionen öffentlich angeboten werden.

## Arbeitsregeln

- Keine Secrets im Repository. Zugangsdaten gehören in `.env`, Platzhalter in `.env.example`.
- Änderungen werden über beobachtbares Verhalten und überprüfbare Checks abgesichert.
  Request-ID vom Client bis in die Engine, strukturierte Logs, Traces.
- Die `regression_guard`-Fälle aus Juras `evals/kanzlei_core.json` sind ein blockierendes Gate.
- Die Invarianten aus `architecture:recht-und-papier-core` sind nicht verhandelbar: rechtliche
  Aussagen nur aus dem validierten Evidence Set, Rechtsstand und Quellenlage sichtbar, **keine
  unbelegten Prozentangaben zu Prozesschancen**.
