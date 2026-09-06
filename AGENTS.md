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

### Client-Aufbau

`app/` enthält **nur Routen**, alles andere liegt unter `src/` und wird über den Alias
`@/` importiert (`tsconfig.json`, von Metro und TypeScript gleichermaßen aufgelöst).

```
app/_layout.tsx         SessionProvider, Splash-Freigabe, die eine Weiche
app/start.tsx           Startbildschirm — nur Start
app/anmelden.tsx        Anmeldung (Code, Passwort als Zweitweg)
app/+not-found.tsx      Deep Link ins Leere → Start oder App
app/(app)/              alles hinter der Anmeldung
  index.tsx             Fallübersicht (Startseite der App)
  fall/[id].tsx         Fallakte
  fall/neu.tsx          Fall anlegen (modal)
  konto.tsx             Abmelden, Konto löschen (modal)

src/theme/              Farben, Schriften, Radien, Abstände
src/ui/                 Papier-Bausteine (PaperScreen, PrimaryAction, Field, …)
src/lib/                supabase, Fehlertexte, Formatierung
src/features/auth/      SessionProvider, Anmelde-Ablauf, Konto-Funktionen
src/features/faelle/    Typen, Datenzugriff, Lade-Hooks
src/features/legal/     typisierter Client für die Jura-Engine
```

### Start und App sind getrennt

Der Startbildschirm zeigt **ausschließlich** das Versprechen: Ballonmotiv, "Recht
verstehen. Besser reagieren.", das Register aus Schildern/Einordnen/Reagieren und einen Weg
hinein. Keine Fallakte, kein Anlegen, kein Abmelden, keine Kontolöschung. Alles davon lebt
hinter der Anmeldung.

Die Grenze zieht `Stack.Protected` in `app/_layout.tsx` — an genau einer Stelle, nicht in
jedem Layout. Zwei Eigenschaften daran sind der Grund für diese Wahl:

- **Kein Aufblitzen.** Ein `Redirect` im Layout baut den Bildschirm erst auf und leitet dann
  weg. Der Guard lässt die Gruppe gar nicht erst entstehen.
- **Kein Zurück nach dem Abmelden.** Fällt ein Guard auf `false`, entfernt Expo Router die
  Route samt ihrer Historie. Auf einem geteilten Gerät ist das der Unterschied zwischen
  abgemeldet und abgemeldet aussehend.

Kein Bildschirm navigiert nach einer Anmeldung oder Abmeldung von Hand. Der
`SessionProvider` meldet die Änderung, der Guard entscheidet — eine Navigation daneben wäre
eine zweite Wahrheit.

Kein Tab-Bar: MVP 1 hat genau ein echtes Objekt, die Fallakte.

### Anschluss an die Legal-Engine

`src/features/legal/client.ts` kennt **zwei getrennte Wege**, und die Trennung ist der
eigentliche Inhalt der Datei:

| Weg | Inhalt | Ziel |
|---|---|---|
| direkt (`EXPO_PUBLIC_LEGAL_ENGINE_URL`) | öffentliches Recht, kein Sachverhalt | Jura-API |
| über Edge Function `fall-einordnen` | Falltext | Supabase → Jura im EU-Netz |

Der Sachverhalt verlässt das Gerät nie in Richtung Engine. Die Engine hat keine eigene
Authentifizierung, und aus Entscheidung `d150e31f` folgt, dass der Abfragepfad mit Falltext
im EU-Container landen muss. **Modal bleibt für den Indexaufbau, nicht für diesen Pfad.**

Die Typen in `src/features/legal/typen.ts` sind von Hand aus Juras `modal_deploy.py` und
`src/api/answering.py` nachgezeichnet. Das ist der Zwischenschritt: sobald die Serving-Schicht
aus `modal_deploy.py` gelöst ist (Entscheidung `32399c8c`), wird der Client aus dem
OpenAPI-Schema generiert. Bis dahin gilt — **jede Änderung an Juras Routen muss dort
nachgezogen werden, der Compiler merkt es nicht.**

### Der angeschlossene Weg: Recht nachschlagen

`recht-nachschlagen` ist die erste Edge Function, die wirklich an der Engine hängt, und
zugleich die Vorlage für alle weiteren. Der Weg ist:

```
App → Edge Function recht-nachschlagen → Jura /api/legal/ask/enhanced → Gemini → Belege
```

**Die App kennt die Adresse der Engine nicht.** Das ist eine Korrektur gegenüber dem
ursprünglichen Entwurf, der direkte Abfragen für öffentliches Recht erlauben wollte. Die
Engine verlangt seit dem Zugangsschutz einen Schlüssel, und ein Schlüssel in einem
Mobile-Bundle ist keiner. Nachgemessen am 05.09.2026: vor dem Zugangsschutz antwortete
`/api/legal/stats` jedem im Netz mit HTTP 200, und `/api/legal/ask` startete dabei einen
kostenpflichtigen LLM-Aufruf.

Drei Umgebungen brauchen denselben Schlüssel: die Wurzel-`.env`, das Modal-Secret
`legal-engine-key` und die Supabase-Secrets der Edge Functions.

```
KEY=$(openssl rand -hex 32)
modal secret create legal-engine-key LEGAL_ENGINE_API_KEY=$KEY     # in ~/Jura
supabase secrets set LEGAL_ENGINE_URL=<engine> LEGAL_ENGINE_API_KEY=$KEY
supabase functions deploy recht-nachschlagen
```

Zwei Dinge, die beim ersten Test auffallen und keine Fehler sind: Der erste Aufruf dauert
über eine Minute, weil die Modal-Instanz Einbettungsmodell und 211-MB-Index lädt. Und der
`answer_audit` steht auf `fail`, solange es für die Frage kein Prüfprofil gibt — die
Oberfläche zeigt das als Hinweis, statt eine unbelegte Antwort wie eine geprüfte aussehen
zu lassen.

### Der zweite angeschlossene Weg: Fall einordnen

```
App → dokument-lesen → extracted_text
App → fall-einordnen → Jura POST /api/legal/analyze → Gemini → case_analyses/-sources/-deadlines
```

Drei Dinge daran sind nicht offensichtlich:

- **Der Sachverhalt passt nicht in `?q=`.** Juras Suchanfrage nimmt 500 Zeichen. `analyze`
  trennt deshalb Suche und Antwort: gesucht wird mit einer verdichteten Anfrage, geantwortet auf
  den vollständigen Text. Die Verdichtung erhält die Trigger-Substrings der Prüfprofile wörtlich
  — fällt „ordentliche Kündigung" weg, greift kein Profil, `required_norms` bleibt leer und
  `answer_audit` meldet `pass`, weil es nichts zu prüfen hatte.
- **Nur ein Modell darf antworten.** `fall-einordnen` prüft `model` gegen eine Erlaubnisliste und
  **verwirft** die Antwort bei Abweichung. Eine Einwilligung nennt einen konkreten Empfänger;
  was nicht offengelegt ist, gehört nicht in eine Fallakte, auch keine richtige Antwort.
- **Eine Frist wird nur übernommen, wenn die Analyse sie selbst genannt hat** — Datum hinter dem
  Wort „Frist", Fristablauf ausgesprochen, Paragraph oder Quellen-ID im Satz. Sie kommt
  unbestätigt in die Akte. Der Grund steht im Code: „Da Ihnen die Kündigung am 31.08.2026
  zugegangen ist, läuft die Frist am 21.09.2026 ab" würde sonst das Zugangsdatum speichern.

**Das Kontingent ist heute die engste Stelle.** `gemini-2.5-flash-lite` deckelt im Gratis-Tarif
bei 20 Anfragen pro Tag und Projekt und zusätzlich pro Minute. Seit der Anbieterwechsel in Jura
gesperrt ist, wird das sichtbar statt still nach DeepSeek umgeleitet — das ist gewollt, macht
aber Abrechnung zur Voraussetzung für alles Weitere.

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
cp .env.example .env.local # URL und publishable key eintragen
npm run ios               # nativer Dev-Build im Simulator
```

### Kontolöschung

`supabase/functions/delete-account` löscht Konto, Fallakte und Dokumente vollständig. Apple verlangt
das in der App, sobald Konten angelegt werden können; Play verlangt zusätzlich einen Weg außerhalb
der App, der noch fehlt.

Warum das eine Edge Function ist und keine Client-Funktion: `auth.admin.deleteUser` braucht den
`service_role`-Schlüssel. Der umgeht jede Row Level Security und darf nie auf ein Gerät. Die Funktion
nimmt deshalb das normale Nutzertoken entgegen und löst die Identität daraus auf — **niemals aus dem
Request-Body**, das wäre eine Einladung, fremde Konten zu löschen.

Zwei Details, die man beim Ändern nicht kaputt machen sollte:

- **Erst die Dateien, dann das Konto.** `storage.objects` hängt an keinem Fremdschlüssel und
  überlebt jede Cascade. Ohne den expliziten Schritt bleiben die Originaldokumente im Bucket liegen,
  während das Konto verschwunden ist — und sind dann niemandem mehr zuzuordnen.
- **Bei Storage-Fehlern wird abgebrochen**, bevor das Konto fällt. Ein noch bestehendes Konto ist das
  kleinere Übel gegenüber verwaisten Falldokumenten.

Für Google Play liegt zusätzlich eine öffentliche Löschseite in `web/kontoloeschung/index.html` —
eine einzelne Datei ohne Build und ohne externe Requests. Sie ist bewusst noch **nicht
veröffentlicht**: Sie gehört zum Launch, nicht zur Entwicklung. Drei Schritte stehen dafür aus, alle
außerhalb dieses Repositories:

1. Seite unter `dreamtelligence.de` ausliefern (`recht-und-papier.de` ist nicht registriert).
2. Die URL im Play-Console-Formular eintragen — ohne diesen Eintrag zählt die Seite für Play nicht.
3. `/impressum` und `/datenschutz` anlegen; die Fußzeile verlinkt beide bereits. Der Anbietername
   lautet dort **Klein Digital Solutions**, nicht Dreamtelligence — die Umbenennung ist rechtlich
   nicht vollzogen.

Geprüft wird das mit `python3 supabase/tests/test_account_deletion.py`. Der Test legt ein
Wegwerfkonto mit Fall und Dokument an, löscht über denselben Weg wie die App und sucht anschließend
mit `service_role`, also ohne RLS, nach jeder Spur einzeln. Ein Test, der vorher nichts anlegt,
beweist beim Löschen nichts — der Upload muss also wirklich durchgehen.

### Anmeldung und Mailversand

Der Login ist passwortlos: E-Mail eintragen, sechsstelligen Code aus der Mail eingeben. Bestehende
Passwortkonten funktionieren weiter, neue entstehen nur noch über den Code.

Drei Dinge daran sind nicht offensichtlich:

- **Ohne `{{ .Token }}` in der Supabase-Mailvorlage kommt ein Magic Link statt eines Codes** und der
  Flow läuft still ins Leere. Betroffen sind *beide* Vorlagen: `magic_link` trifft bestehende
  Konten, `confirmation` die neu angelegten.
- **Supabases eingebauter Maildienst kann das nicht.** Er erlaubt keine eigenen Vorlagen und
  drosselt projektweit auf wenige Mails pro Stunde. Der Versand läuft deshalb über Brevo
  (`smtp-relay.brevo.com:587`), Zugangsdaten in der Wurzel-`.env` unter `BREVO_*`.
- **Brevos IP-Freigabe muss für den SMTP-Schlüssel deaktiviert sein.** Supabase versendet von
  wechselnden Servern ohne veröffentlichte IPs; eine Allowlist kann dort nie vollständig sein und
  erzeugt sonst `525 5.7.1 Unauthorized IP address`. Die Freigabe für den API-Schlüssel darf an
  bleiben.

Codelänge und Gültigkeit stehen serverseitig auf sechs Ziffern und zehn Minuten, dazu 60 Sekunden
Sperrfrist je Adresse und 200 Mails pro Stunde projektweit. Diese Werte gelten im Frankfurter
Projekt; `supabase/config.toml` bildet sie für den lokalen Stack nach.

**`supabase config push` nicht blind benutzen** — der Befehl überträgt die gesamte Datei, inklusive
`site_url`, das lokal auf einer 127.0.0.1-Adresse steht. Einzelne Werte gezielt über die Management
API oder das Dashboard setzen.

Expo Go funktioniert für dieses Projekt nicht mehr: `expo-font` und `expo-sqlite` bringen
nativen Code über Config-Plugins mit, der in einen eigenen Dev-Build gehört. Nach jeder
Plugin-Änderung `npx expo prebuild -p ios` und neu bauen — Fast Refresh reicht dafür nicht.

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
