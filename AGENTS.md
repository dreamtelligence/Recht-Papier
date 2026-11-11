# Recht & Papier — Agent Guide

## Was hier gebaut wird

Aktueller Präsentationsauftrag ist eine Produkt-Fallstudie für Recruiter und
technische Hiring Manager: zuerst umfassendere Produktvision, ehrlicher
Funktionsstand, echte iOS-Aufnahmen, UI/UX und Frontend-/Full-Stack-Beiträge.
Die drei fiktiven Fälle stehen nachgelagert als Technische Demo. Die vorhandenen
Funktionen und Nachweise bleiben erhalten. Kontrolliert geprüft ist weiterhin
ausschließlich die **ordentliche Arbeitgeberkündigung aus Arbeitnehmersicht**.
Der begrenzte technische Release-Umfang ist beschrieben in
`docs/portfolio-release-plan.md`. Öffentliche Demo ausschließlich mit drei
fiktiven, vorab durch das gehostete Backend erzeugten Fällen; keine Anmeldung,
keine privaten Uploads und keine Modellaufrufe durch Besucher.

Die Fallakte bleibt die Datenstruktur; Berichte entstehen aus dem versionierten
strukturierten Ergebnis. `packages/shared/contract.schema.json` ist der Vertrag,
`termination.ts` berechnet aus bestätigten belegten Angaben, `report.ts` rendert.
Freie Qwen-/Gemini-Schlussfolgerungen sind gesperrt. Kein allgemeiner Assistent,
kein Mietrecht, keine Abrechnung und kein Pilot in diesem Release.

Web: `src/entry.web.tsx` importiert nur die öffentliche Demo. Native:
`src/entry.tsx` verwendet den bestehenden Expo Router und privaten Backend-Pfad.
Beide Dateien behalten dieselbe Endung, damit Metro die Web-Variante wählt.
Die öffentliche Bundle-Prüfung darf keine Supabase-Konfiguration finden.

Es wird keine anwaltliche Validierung behauptet. Anbieterangaben bleiben auf
Nutzerwunsch erkennbare Platzhalter; Screenshots dokumentieren den nativen Pfad.
Aktueller Nachweis und offene Gates: `docs/portfolio/release-status.md`.
Die älteren Produkt-/Infrastrukturentwürfe weiter unten sind historischer Kontext;
für tatsächliche Datenflüsse gilt `docs/architecture.md`.

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

## Aktueller Analysepfad (10.11.2026)

Fallanalysen laufen als Hintergrundauftrag: `fall-einordnen` antwortet mit 202,
`private.case_analysis_jobs` hält den Eingabestand, und ein separater Modal-Worker
liefert das Ergebnis an `case-analysis-worker`. Die App lädt den Status nach.
Der kontrollierte Worker erhält nur öffentliche Versionskennungen und liefert
16 vollständige versionierte Normtexte. Die Supabase-Grenze prüft den Korpus und
berechnet aus dem eingefrorenen Original. Freigabe nur für
`controlled-termination/1.0` mit gültigem strukturiertem Ergebnis. Der getrennte breite
Suchdienst verwendet seit 11.11.2026 den neuen Fensterindex; die allgemeinen
Engine-Pfade bleiben vom kontrollierten Portfolio getrennt. Es gibt keine
stillen Modell-Fallbacks.
Details, Tests und Rollback: [`docs/analysis-jobs.md`](docs/analysis-jobs.md).
Die älteren synchronen Ablaufbeschreibungen unten sind historische Einordnung.

## Suchdienst und Dokumentationsstand (11.11.2026)

`legal-rag` v41: 17.132 Indexeinträge, 17.060 vollständige Quellen und 21/21
bestandene Live-Suchverträge. Analyse-Worker v5; kontrollierter 16-Normen-Korpus
unverändert. [Release-Status](docs/portfolio/release-status.md) und
[maschineller Live-Nachweis](docs/portfolio/live-index-release-2026-11-11.json).
Die allgemeine LEX-Ausgabe benötigt noch das
[gemeinsame Antwort-Gate](https://github.com/dreamtelligence/Jura/blob/main/docs/next-step-answer-release.md).
Keine allgemeine juristische oder Lastfreigabe behaupten. Der deployte
Runtime-Quellstand ist im Jura-GitHub-Repository noch nicht vollständig
veröffentlicht; ältere Checkout-Befehle nicht als Wiederherstellungsnachweis nutzen.

## Verbindlicher aktueller Aufbau

- `apps/mobile/app/`: nur Expo-Router-Routen; Bildschirm- und Fachlogik liegt unter `apps/mobile/src/`.
- `src/entry.web.tsx`: ausschließlich öffentliche Produkt-Fallstudie und kuratierte technische Demo. `src/entry.tsx`: privater nativer Expo-Router-Pfad. Keine Supabase-Konfiguration im öffentlichen Web-Bundle.
- `src/features/*/api.ts`: Daten- und Storagezugriffe. Kein Bildschirm spricht direkt mit Supabase. Ladezustand gehört in Hooks; rohe Backendfehler werden in `src/lib/fehler.ts` übersetzt.
- `src/ui/`: gemeinsame Papier-Bausteine, über `@/ui` importieren. Designwerte liegen unter `src/theme/`.
- `packages/shared/`: versionierter Vertrag, generierte Typen, kontrollierte Berechnung und Berichtsrendervorgang.
- `supabase/`: Migrationen, RLS, private Dokumente, Edge Functions und serverseitige Ergebnisfreigabe.
- `evals/` und `docs/portfolio/`: fiktive Referenzfälle, reproduzierbare Nachweise und ausdrücklich begrenzte Messungen.
- `infra/` und `web/`: lokale Infrastruktur beziehungsweise die separate, noch nicht als Store-Pflichtseite veröffentlichte Kontolöschungsseite.

Aktuelle Datenflüsse stehen in [docs/architecture.md](docs/architecture.md), die Orientierung in [docs/README.md](docs/README.md). Die alten synchronen Abläufe, früheren Modellversuche und Infrastrukturentwürfe sind in [docs/history/](docs/history/) archiviert. Sie sind keine alternative Runtime-Spezifikation.

## Identität, Speicherung und Freigabe

- `Stack.Protected` und der `SessionProvider` steuern die Anmeldung einmal zentral. Keine zusätzliche Navigation nach An- oder Abmeldung und keine zweite Anmeldeweiche pro Bildschirm.
- Eigentümer-RLS und Storage-Policies schützen private Akten. `service_role` und Engine-Schlüssel bleiben ausschließlich auf Servern.
- Identität kommt aus dem validierten Nutzertoken, nicht aus einer Benutzer-ID im Request-Body. Privilegierte Worker-RPCs prüfen Eigentum, Laufbesitz und Eingaberevision selbst.
- Rechtliche Aussagen, Herkunft, Quellen und Ergebnisfreigabe schreibt der Server. Der Client bestätigt eigene Angaben und liest; er stellt sich kein bestandenes Prüfergebnis aus.
- Bei der Kontolöschung zuerst private Dateien entfernen, dann das Konto. Bei Storage-Fehlern abbrechen, damit keine verwaisten Dokumente zurückbleiben.
- Keine stillen Anbieterwechsel und keine Lockerung des kontrollierten Freigabeguards für freie Modellantworten. Die privaten Datenflüsse nicht aus älteren Diagrammen ableiten.

## Prüfen und lokal starten

Die geheimnisfreien Befehle stehen im [README](README.md#lokal-reproduzieren) und werden in `.github/workflows/ci.yml` verwendet: Mobile-Typprüfung und Status-Test, Vertrags-Driftcheck, Deno-Tests, deterministische Referenzauswertung, Web-Build und öffentliche Bundle-Isolation.

Backend-Integrationstests in `supabase/tests/` und `scripts/verify-portfolio-e2e.py` sind davon getrennt. Sie können Testkonten und Dokumente anlegen oder löschen; manche älteren Skripte rufen echte Modelle auf. Nur gegen ein dafür freigegebenes Testprojekt ausführen. Kein blindes `supabase config push`, kein Zurücksetzen oder Neuanlegen von Produktionsdaten.

Der native iOS-Entwicklungsbuild benötigt Metro. Standard: `npm --prefix apps/mobile run start -- --localhost`, anschließend `npm --prefix apps/mobile run ios`. `--no-bundler` startet keinen Server; bei fehlender Script-URL zuerst Server und gespeicherte Bundler-Adresse prüfen. Expo Go und ein eigenständig startender Release-Build sind andere Laufzeitpfade.

Vor Client-Änderungen gilt [apps/mobile/AGENTS.md](apps/mobile/AGENTS.md): zuerst die exakten SDK-57-Dokumente lesen. Native Plugin-Änderungen benötigen einen neuen Dev-Build. Splash-Konfiguration über das bestehende Plugin erhalten, keine zusätzliche Babel-Konfiguration aus Vermutungen einführen.

## Sprache und Arbeitsregeln

Bezeichner und UI-Texte sind deutsch, Datenbankschema und Supabase-Namen englisch. Commit-Nachrichten sind kurz, englisch und im Imperativ. Kommentare erklären Gründe und nicht sichtbare Fehlergrenzen.

Keine Secrets im Repository. Änderungen an Vertrag, Freigabe oder Berechnung brauchen die vorhandenen Regressionen und einen beobachtbaren Nachweis. `regression_guard`-Fälle im separaten Jura-Projekt bleiben ein fachliches Gate. Keine unbelegten Prozentangaben zu Prozesschancen und keine behauptete anwaltliche oder Store-Freigabe.

Die offenen Voraussetzungen in [docs/apple-app-review-readiness.md](docs/apple-app-review-readiness.md) und [docs/portfolio/release-status.md](docs/portfolio/release-status.md) bleiben erhalten. Anbieter-/Datenschutz-Platzhalter wurden ausdrücklich vom Nutzer verlangt. Rechtliche und Store-Bedingungen vor einer echten Veröffentlichung anhand aktueller Primärquellen und fachlich prüfen; diese Repository-Prüfung ersetzt das nicht.
