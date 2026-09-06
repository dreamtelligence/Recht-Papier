# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

Das obige `AGENTS.md` ist die verbindliche Quelle für Produktauftrag, Architekturentscheidungen,
den lokalen Stack, Kontolöschung, Anmeldung/Mailversand und die Launch-Gates. Diese Datei ergänzt
nur, was dort nicht steht: Befehle und der Aufbau des Client-Codes.

## Befehle

Wurzel:

```
npm run stack:up | stack:status | stack:down | stack:reset   # Qdrant-Container
supabase db push                                             # Migrationen ins Projekt
supabase functions deploy fall-einordnen                     # einzelne Edge Function
```

Client (`apps/mobile`):

```
npm run ios | npm run android   # nativer Dev-Build — Expo Go funktioniert hier nicht
npm start                       # nur sinnvoll, wenn der Dev-Build schon installiert ist
npx tsc --noEmit                # einzige statische Prüfung: kein ESLint, keine JS-Tests
npx expo prebuild -p ios        # nach jeder Änderung an app.json/Plugins, danach neu bauen
```

Tests sind eigenständige Python-Skripte ohne Framework; sie lesen `SUPABASE_URL`,
`SUPABASE_ANON_KEY` und `SUPABASE_SERVICE_ROLE_KEY` aus der Wurzel-`.env` und laufen gegen das
echte Projekt. Ein einzelner Test ist ein einzelner Dateiaufruf:

```
python3 supabase/tests/test_rls_isolation.py      # RLS trennt Fallakten wirklich
python3 supabase/tests/test_account_deletion.py   # Löschung lässt nichts übrig
python3 supabase/tests/test_beispielfall.py       # Fall anlegen, Dokument hochladen
python3 supabase/tests/test_fall_einordnen.py     # lesen, einordnen, was in der Akte landet
python3 supabase/tests/mess_audit.py              # wie oft das Audit beanstandet
```

Sie legen Wegwerfkonten samt Fall und Dokument an und prüfen anschließend nach. Ein Lauf ohne
vorheriges Anlegen beweist nichts.

`test_fall_einordnen.py` und `mess_audit.py` kosten echte Modellaufrufe. Der Gratis-Tarif von
`gemini-2.5-flash-lite` deckelt bei **20 Anfragen pro Tag und Projekt** und greift zusätzlich pro
Minute — nachgemessen am 05.09.2026. Wer beide mehrfach laufen lässt, verbraucht das Tageskontingent
und bekommt danach `Die Einordnung ist zurzeit ausgelastet`. Das ist kein Defekt.

## Aufbau des Clients

`app/` enthält ausschließlich Routen, alles andere liegt unter `src/` und wird über den Alias
`@/*` importiert.

```
app/_layout.tsx        SessionProvider, Splash-Steuerung und die einzige Anmeldeweiche
app/start.tsx          Versprechen vor der Anmeldung
app/anmelden.tsx       Code-Login, als Modal
app/(app)/             alles hinter der Anmeldung: Fallübersicht, fall/[id], fall/neu, konto
src/features/<name>/   api.ts (Datenzugriff) · typen.ts · hooks.ts · Screens-nahe Logik
src/ui/                Papier-Bausteine, exportiert über den Barrel @/ui
src/lib/               supabase.ts · fehler.ts · format.ts
src/theme/             Farben, Schriften, Radien
```

Vier Regeln, die den Code zusammenhalten:

- **Kein Bildschirm spricht direkt mit Supabase.** Tabellen- und Storage-Zugriffe stehen in
  `src/features/*/api.ts`, Lade- und Fehlerzustand in `hooks.ts` (`useLadeVorgang`). Bewusst kein
  React Query — das lohnt erst mit Cache-Invalidierung über mehrere Ansichten.
- **Bildschirme importieren aus `@/ui`, nicht aus einzelnen Dateien darin.**
- **Rohe Supabase-Fehler erreichen nie die Oberfläche.** Übersetzung an genau einer Stelle in
  `src/lib/fehler.ts`, und dort gilt: nie verraten, ob zu einer Adresse ein Konto existiert, und nie
  Tabellen oder Policies nennen.
- **Die Anmeldeprüfung steht genau einmal**, als `Stack.Protected` in `app/_layout.tsx`. Ein Guard
  in einer Untergruppe würde den Bildschirm erst aufbauen und dann wegleiten — sichtbar als
  Aufblitzen der Akte. Sicherheit ist beides nicht; die liegt in der Row Level Security.

### Wohin Falldaten fließen dürfen

`src/features/legal/client.ts` hat zwei getrennte Wege, und die Trennung ist der Punkt:
öffentliches Recht darf das Gerät direkt bei der Engine abfragen, **Falltext niemals**. Der geht
ausschließlich über die Edge Function `fall-einordnen`, die das Nutzertoken prüft, die
Eigentümerschaft über RLS auflöst, den Text pseudonymisiert und in
`case_analyses`/`case_sources`/`case_deadlines` schreibt. Die Engine hat keine eigene
Authentifizierung; ihr Schlüssel liegt nur in den Supabase-Secrets.

`supabase/functions/` enthält vier: `delete-account`, `recht-nachschlagen`, `dokument-lesen`
und `fall-einordnen`. Keine davon benutzt `service_role` außer `delete-account` — alle übrigen
kommen mit dem Nutzertoken aus, weil RLS dieselbe Grenze zieht.

**Der Sachverhalt passt nicht in eine Suchanfrage.** Juras `?q=` nimmt 500 Zeichen. Deshalb gibt
es `POST /api/legal/analyze`: gesucht wird mit einer verdichteten Anfrage, die die
Trigger-Substrings der Prüfprofile wörtlich erhält, geantwortet auf den vollständigen Text.
Verschwindet „ordentliche Kündigung" beim Verdichten, greift kein Profil mehr und `answer_audit`
meldet `pass`, weil es nichts zu prüfen hatte.

## Datenmodell

`supabase/migrations/20260905095138_case_file.sql` legt `profiles`, `cases`, `case_documents`,
`case_facts`, `case_analyses` und `case_sources` an — alle sechs mit erzwungener RLS und einer
Owner-Policy. `20260905214025_analyse_und_fristen.sql` ergänzt `case_deadlines`, den Status
`fehlgeschlagen`, `case_documents.processed_at`/`processing_error` und setzt
`case_sources.analysis_id` auf `not null` — ein Beleg ohne die Aussage, zu der er gehört, ist
keiner. Dokumente liegen in einem privaten Bucket mit eigenen Storage-Policies
(`20260905130446_private_case_documents.sql`); `storage.objects` hängt an keinem Fremdschlüssel und
überlebt jede Cascade.

## Sprache

Bezeichner, Kommentare und Oberflächentexte sind deutsch (`laedt`, `useFaelle`, `Fallübersicht`),
Datenbankschema und Supabase-Namen englisch (`cases`, `case_documents`). Commit-Nachrichten sind
englisch, klein und im Imperativ, mit Conventional-Prefix wo er passt:
`feat(mobile): let people delete their account and everything in it`.

Kommentare erklären hier durchgehend *warum*, nicht *was* — häufig samt der Falle, die zu der
Entscheidung geführt hat. Neue Kommentare in diesem Stil schreiben oder weglassen.
