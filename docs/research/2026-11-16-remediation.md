# Korrekturen nach der Verbraucher und Kanzleiprüfung

Stand: 16.11.2026. Die reproduzierten Codefehler aus dem
[Ausgangsaudit](2026-11-16-product-and-kanzlei-review.md) werden durch gezielte
Korrekturen und Regressionen abgesichert. Quellcodeprüfung, GitHub-Veröffentlichung
und produktive Installation sind getrennte Nachweise. Dieser Stand enthält
keinen neuen Live-Backend- oder anwaltlichen Abnahmelauf in dieser ersten Phase.

**Nachfolgender isolierter Rollout:** [22 echte API-Prüfschritte, frischer iOS-Release-Build und nativer PDF-Export](2026-11-16-isolated-rollout.md)
sind inzwischen bestanden. Der dort neu entdeckte Zugriff mit gelöschten
Storage-Tokens ist zusätzlich korrigiert. Die untenstehenden Zahlen dokumentieren
den früheren lokalen Abschluss; Produktionsmigration und anwaltliche Abnahme
bleiben getrennte Schritte.

**Abschlussprüfung:** 366 Python-Tests, 32 Deno-Tests, zehn App-Regressionsgruppen,
Dokumentleser-Handler, vier PostgreSQL-Prüfdateien, Mobile-Typecheck, sechs
Edge-Typechecks, Schema-Drift, Web-Build und Bundle-Isolation bestanden.
24 Referenzfälle/40 Ausführungen weiterhin ohne Abweichung.
[Maschinenlesbarer Nachweis und geprüfte Runtime-Hashes](2026-11-16-remediation-checks.json).

**Veröffentlichung:** Recht-Papier `6f56fe3` und Jura `8f8d6f8` auf GitHub `main`
gepusht; Remote-SHAs geprüft. Der [GitHub-CI-Lauf](https://github.com/dreamtelligence/Recht-Papier/actions/runs/43901162891)
startete keinen der drei Jobs: Kontosperre wegen Abrechnungsproblem, laut
Annotation. Deshalb kein grüner gehosteter CI-Nachweis.
[Publikations- und CI-Protokoll](2026-11-16-publication.json).

## App und kontrollierter Rechner

| Befund | Korrektur | Nachweis |
| --- | --- | --- |
| A1: Wert widerspricht dem vorhandenen Zitat | Sowohl Zitat als auch vollständige Seite müssen denselben Feldschlüssel und exakten normalisierten Wert ausweisen. Abweichende Daten, Enum-Werte, andere Felder und abgeschnittene Qualifikationen werden abgewiesen. | `termination_evidence_test.ts`: zunächst drei rote, anschließend grüne Tests; bisherige 24 Fälle/40 Ausführungen unverändert. |
| A1: Client kann Extraktion selbst schreiben | Metadaten-Insert auf erlaubte Spalten begrenzt, keine normalen Client-Updates. Extraktionsschreiben ausschließlich durch den Server nach Token-, RLS- und Storage-Prüfung, eingeschränkt auf die geladene Dokument-/Fall-ID. | Echte PostgreSQL-17-Rechteprüfung und ausführbarer Edge-Handler mit isolierten Auth/Storage/PDF-Adaptern. |
| A1: bestehende Cache-Herkunft unklar | Migration verwirft nur abgeleitete Texte/Seiten und setzt einen erneuten Lesehinweis; Originale bleiben erhalten. Revisions-Trigger macht alte Ergebnisse veraltet. Reupload unter noch referenziertem Pfad gesperrt. | Migrationsprobe mit altem Cache, erhaltenem Originaleintrag und erhöhter Revision. |
| A2: alte Bestätigung erlaubt aktuellen PDF-Export | Vorschau zeigt veraltete Fassungen. Unmittelbar vor Print/Share verlangt die App eine neue serverseitige Exportprüfung unter Fallzeilensperre. | SQL: aktuell+bestätigt erlaubt; unbestätigt, fremd, laufender Auftrag und alte Revision gesperrt. Native Adapter: kein Print/Share vor erfolgreicher Autorisierung. |
| A3: Teilfehler erscheinen als leere Akte | Alle sieben parallelen Abfragen prüfen Fehler. | Jede einzelne Abfrage als Fehler injiziert; kein erfolgreicher Leerzustand. |
| A4: fehlgeschlagenes Aufräumen verliert die Zuordnung | Bei fehlgeschlagenem Dateiabau bleibt die Akte bestehen. Falllöschung erfasst auch Uploads ohne Metadaten unter dem Fallpräfix. | Upload-/Metadaten-/Storage-Fehler und erneute Bereinigung mit tatsächlichem App-Code. |
| A5: weitere ungelesene Anlage trotz technischem Pass | Kontrollierte Analyse verlangt lesbaren vollständigen Text und Seiten aller beigefügten Dokumente, ohne Verarbeitungsfehler. | Zusätzliches leeres/fehlerhaftes Dokument blockiert den Auftrag. |
| A6: unsichtbarer Leseabschluss / Retry | Erstes Lesen wird abgewartet; Fehler erhalten das Original. HTTP-200-Fehlerstatus gilt nicht als erfolgreich gelesen. Kurzzeitiges Nachladen, sichtbarer Retry und Erhalt ungespeicherter Fact-Eingaben. Server-Schreibfehler liefern 500. | Status-, App-Adapter- und Dokumentleser-Tests. |
| A7: erste 1.000 Objekte reichen nicht | Alle Listenseiten vor Mutationen sammeln, in Batches löschen, verbleibenden Bestand vor Konto-/Falllöschung kontrollieren. Storage-Fehler stoppen Auth-Löschung. | Über 1.000 Ordner und Dateien, 3.006 Objekte, Fehler-/Wiederholungs-/Restbestandsprüfungen mit Storage-Adapter. |
| A8: ungeprüfter freier Text wird angezeigt | Engine-, Edge- und native Freigabe müssen konsistent sein. Fehlende/fehlerhafte Audits sperren Text. Private Fragen per POST; Modal-Ergebnisweiterleitung nur gleicher Ursprung/Pfad und ausschließlich Ergebnis-Token. | Deno-Gate und tatsächliche Mobile-/Edge-Adapter einschließlich fremder Weiterleitung, alter Payload und Fehlstatus. |
| A9: fehlender Zugang verdeckt weitere Abhängigkeiten | Beschäftigungsbeginn, Vertrags-/Tarifregel, Probezeit, Original, Sonderfälle und Gerichtsstand werden unabhängig vom Zugang als offene Punkte erfasst. Keine pauschale Mehrfachbestätigung im privaten Eingabebildschirm. | Entwicklungsfall ohne Zugang: weitere Voraussetzungen sichtbar, weiterhin keine erfundene Berechnung. |

Die Wertprüfung unterstützt bewusst nur die ausdrücklich beschrifteten Felder
des kontrollierten Formats. Beliebige Prosa und eigene Erinnerungen sind damit
nicht als Dokumentbeweis freigegeben. Die App erklärt diese Grenze; ein neuer
Herkunftsvertrag für Nutzeraussagen bleibt ein Ausbaupaket. Historische Berichte
bleiben lesbar, werden aber nicht als aktuelle Fassung geteilt.

## Allgemeine Legal Engine und LEX

Die zugehörigen Änderungen liegen im separaten privaten
[Jura-Repository](https://github.com/dreamtelligence/Jura). Details und aktuelle
Nachweise: [Antwort-Gate](https://github.com/dreamtelligence/Jura/blob/main/docs/next-step-answer-release.md).

- Ein gemeinsamer Generator und eine gemeinsame Ausgabeentscheidung für JSON,
  SSE und freien Worker prüfen Quellen- und Antwortvertrag. Fehlende Pflichtnormen,
  fehlgeschlagene/fehlende Prüfungen und widersprüchliche Auditdaten sperren Text.
  SSE liefert Modelltext erst nach der Abschlussentscheidung; Fortschritt und
  Quellen bleiben verfügbar.
- Die beobachtete falsche Sechsmonats-Klagefrist wird zusätzlich deterministisch
  erkannt. Ein technisch freigegebener Text bleibt ein anwaltlich zu prüfender
  KI-Entwurf. Das Gate behauptet keine allgemeine semantische Richtigkeit.
- Quellenanforderungen sehen den vollständigen Fall und die Frage. Ungültige
  Payloadtypen werden kontrolliert zurückgewiesen. Unbekannte/ungültige
  Quellenstände bleiben unbekannt; Abrufdatum ersetzt keinen amtlichen Stand.
  BAG ist im Standardgerichtsfeed enthalten. Kein neuer Gesamtindex wurde gebaut.
- Fertige Worker-Ergebnisse werden vor Zustellung verschlüsselt eingefroren;
  erneute Zustellung nutzt dieselbe Claim-ID und dasselbe Ergebnis ohne zweite
  Modellgenerierung. Logische Gültigkeit eine Stunde, Bereinigung alle 15 Minuten.
  Unklarer Prozessabbruch während der Generierung erzeugt keinen automatischen
  zweiten kostenpflichtigen Aufruf; ein neuer Auftrag bleibt dann explizit nötig.
- LEX verwendet vollständige POST-Eingaben, sichere HTTP(S)-Links und DOM-Attribute.
  Verworfene Token und widersprüchliche Freigaben werden auch im Fallback nicht
  angezeigt. Neue Falltexte/Chats bleiben im Arbeitsspeicher bis zum Neuladen.
  Der Löschknopf für alte Browserdaten entfernt ausschließlich `lex_case` und
  `lex_chats`; vorherige Verläufe werden nicht still gelöscht.
- Providerfehler, Query-Rewrite- und Retrieval-Fehler geben keine Falltexte oder
  unredigierten Providerdetails nach außen bzw. in die betroffenen Loggerpfade.

## Reproduzieren

Im Recht-Papier-Root:

```sh
npm --prefix apps/mobile run typecheck
npm --prefix apps/mobile run test:analysis-status
npm --prefix apps/mobile run test:casefile-boundaries
node scripts/test-document-extraction.cjs
python3 scripts/generate-contract.py --check
npm run test:portfolio
npm run test:database
npm run build:demo
python3 scripts/check-public-bundle.py
```

Die Datenbankprobe verwendet einen eigenen netzisolierten PostgreSQL-17-Container
mit festem Image-Digest und minimalen Auth-/Storage-Schemadaptern. Sie führt die
echten Migrationen, RLS-/Spaltenrechte und RPCs aus; sie ersetzt weder den
Supabase-Storage-Dienst noch eine gehostete Integration. Der Container wird
anschließend entfernt. Docker muss laufen. Die CI enthält diese Prüfungen.

Im Jura-Root: `python -m pytest -q --ignore=tests/test_retrieval_quality.py`
mit den vorhandenen Python-3.12-Testabhängigkeiten; zusätzlich
`node tests/demo_ui_regression.cjs`. Der ausgenommene Retrieval-Test benötigt
den externen Vollindex und Embedding-/Reranking-Modelle. Der tatsächliche
LEX-Renderer wurde außerdem in einem isolierten Brave-Profil geprüft, einschließlich
eines 2.025-Zeichenfalls, verborgenen beanstandeten Tokens, Browser-Refresh und
gezielter Altdatenlöschung. Backendantworten waren dabei kontrollierte Testdaten.

Die ursprünglichen Audit-Skripte und ihre Ausgaben bleiben historische negative
Nachweise. Sie erwarten absichtlich das alte fehlerhafte Verhalten und sind
keine heutige grüne Test-Suite. Die neuen Regressionen liegen im normalen
Testpfad. Die Messdateien und gespeicherten öffentlichen Backendbeispiele vom
10./11.11. wurden nicht als neu erzeugte Ergebnisse ausgegeben.

## Installation und verbleibende Abnahmen

Git-Push installiert weder Supabase-Migrationen/Functions noch Modal-Dienste
oder einen nativen Build. Vor einer Installation Änderungen gemeinsam in einem
freigegebenen isolierten Supabase-Projekt ausrollen und den echten Pfad prüfen.
Beim späteren Rollout zuerst den kompatiblen Dokumentleser mit Serverpersistenz
installieren, dann die zwei neuen Migrationen und die übrigen Edge-/App-Änderungen.
Die neue Extraktionsmigration invalidiert bestehende abgeleitete Belegtexte;
Originale erneut lesen und betroffene Berichte neu erzeugen/bestätigen.

Die Worker-Ergebnisablage verwendet Modal Dict im getrennten Ressourcen-Namensraum
und das bestehende Callback-Secret zur Schlüsselableitung. Bei Secret-Wechsel
können alte noch ausstehende Chiffretexte nicht erneut zugestellt werden.
Modal-Storage-Region und harte physische Löschfrist sind dadurch nicht garantiert;
die einstündige logische Sperre und der Sweeper ersetzen keine Datenschutzabnahme.
Gehostete Wiederzustellung/Retention werden beim isolierten Rollout geprüft.
Der Jura-Startguard vergleicht Runtime-Hashes mit dem unveränderlichen
Indexrelease. Vor einem Deploy den neuen Quellstand mit den Suchverträgen erneut
prüfen und passende Runtime-Fingerprints freigeben; alte Metadaten nicht blind
überschreiben und den Guard nicht lockern.

Offen bleiben anwaltliche Abnahme, native Geräte-/Loginprüfung, parallele
produktive Upload-/Löschrennen, Rest-JWT-Verhalten, vollständige Supabase-Recovery,
Last und Datenschutz-/Providerverträge. Die vorgeschlagene Kanzlei-Prüfmappe,
eigene Rollen, DOCX, Mandatsannahme und beA sind weiterhin nicht implementiert.
