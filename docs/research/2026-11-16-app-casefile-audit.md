# App, Fallakte und Übergabe an eine Kanzlei: Audit vom 16.11.2026

> Historischer Ausgangsaudit vor der anschließenden Fehlerbehebung. Befunde, Quellstände und ursprüngliche Ausgaben unten beziehen sich auf diesen Vorher-Zustand. Aktuelle Korrekturen, Prüfungen und verbleibende Grenzen stehen im [Korrekturbericht](2026-11-16-remediation.md). Der spätere [isolierte gehostete und native Rollout](2026-11-16-isolated-rollout.md) ist separat geprüft; das bestehende Backend wurde nicht migriert.

## Auftrag, Stand und Evidenz

Geprüfter lokaler Quellstand: `2aa167d20f8f4bfa9f977850b30823b73265d109`, Branch `main`. Der Arbeitsbaum war vor diesem Bericht sauber. Auftrag ist eine Prüfung aus Verbraucher- und Kanzleisicht, keine Freigabe für echte Rechtsberatung. Anwendungscode, Datenbank, produktive Konten und Deployments wurden nicht verändert.

Diese Teilprüfung untersucht den privaten/nativen Datenpfad anhand des tatsächlich vorhandenen Quellcodes, der Migrationen und ausführbarer lokaler Prüfungen. Die visuelle Prüfung der öffentlichen Produktseite führt der übergeordnete Audit getrennt durch. Hier gibt es **keinen neuen privaten Login-, Geräte-, Live-RLS- oder Supabase-Ende-zu-Ende-Nachweis**. Das ist bei jeder Aussage zur Reichweite mitzulesen.

Die öffentliche Web-Demo und die private App sind verschiedene Oberflächen. Die Web-Demo enthält drei vorab erzeugte fiktive Fälle, keine private Mandantenplattform. Der kontrollierte private Analysepfad unterstützt ordentliche Arbeitgeberkündigungen aus Arbeitnehmersicht mit einem eingefrorenen 16-Normen-Korpus und eng begrenzten Rechenregeln. Die allgemeine Rechtsrecherche ist ein eigener, freier Engine-Pfad.

Evidenzklassen:

- **Ausgeführt:** vorhandene Checks oder isolierte Reproduktion mit echtem Projektquellcode. Isolierte Adapter ersetzen Netzwerk, Datenbank und native Gerätefunktionen ausdrücklich.
- **Statisch belegt:** konkreter Codepfad oder vorhandene Migration; keine Behauptung über den aktuell deployten Datenbankzustand.
- **Produktlücke:** Funktion fehlt im geprüften Ablauf; das ist keine unerlaubte Zusage, sie gehöre bereits zum Portfolio-Release.
- **Ungeprüft:** benötigt Gerät, freigegebenes Testprojekt, externe Dienste oder fachliche Abnahme.

P1 bedeutet: vor einem Einsatz mit echten Ratsuchenden bzw. vor einer als zuverlässig beworbenen Kanzleiübergabe bearbeiten. P2 bedeutet: wichtiger nächster Robustheits-/Workflow-Schritt. Die Einstufungen behaupten keinen nachgewiesenen Angriff auf das Produktivsystem.

## Gesamturteil

Die Grundlage ist deutlich stärker als ein Chat mit PDF-Upload: persönliche Fallakte, Originalablage, bestätigte Angaben, Eingaberevisionen, kontrollierte Berechnungen, Worker-Lease, Quellen und gesperrte freie Modellfreigabe sind vorhanden. Die vorhandenen geheimnisfreien Prüfungen bestehen in diesem Lauf.

Die nächste Produktstufe sollte aber eine **prüfbare Arbeitsmappe für die Kanzlei** sein. Der aktuelle Stand stellt dem Mandanten technische Felder und einen PDF-Bericht bereit. Er bildet weder eine gemeinsame Mandanten-/Kanzleiakte noch eine professionelle Review-Freigabe ab. Ein vom Mandanten bestätigter Wert ist kein anwaltlich geprüfter Fakt. Ein vorhandenes Zitat beweist noch nicht, dass der daneben gespeicherte Wert aus diesem Zitat folgt.

## 1. Nummerierter Durchlauf aus Verbrauchersicht

| Schritt | Tatsächlicher privater Ablauf | Gesundheit und nächste Grenze |
|---|---|---|
| 1. Anmelden | OTP, normalisierte Mailadresse, zentraler SessionProvider und geschützte Routen. Bestandskonten können ein Passwort verwenden. | Gute zentrale Struktur. E-Mail-Zustellung, abgelaufene/entzogene Sitzung und Verhalten am echten Gerät hier nicht erneut getestet. |
| 2. Anliegen aufnehmen | Freitext ab acht Zeichen und ein PDF sind Pflicht. UI bezeichnet den engen fiktiven Portfolio-Umfang ausdrücklich. | Für die Demo ehrlich. Für einen Verbraucher mit Papierbrief, Foto oder noch unvollständigen Unterlagen beginnt der hilfreiche Weg nicht. Kein eigener Dringlichkeits-/Zugangsschritt vor der ausführlichen Eingabe. |
| 3. Original speichern und lesen | Neue Fallzeile, Storage-Upload, Dokumentzeile; danach startet die App `dokument-lesen` ohne auf dessen Abschluss zu warten. | Private Ablage und Wiederaufnahme sind vorhanden. Fehlerkompensation, stiller Lesezustand und vollständige Aktualisierung sind verbesserungsbedürftig; Befunde A3–A6. |
| 4. Angaben zuordnen | Elf fachliche Fact-Typen, Datum/Optionswert, Dokument, Seite, wörtliches Zitat; Bestätigung und Speichern. Automatische Erkennung setzt die expliziten Labels der kuratierten PDFs voraus. | Für kontrollierte Beispiele reproduzierbar. Als realer Intake anspruchsvoll: rechtliche Einordnungen wie Tarif/Sonderkündigungsschutz sollen Laien bestätigen; Zugang ist oft eigene Wahrnehmung und steht nicht im Kündigungsbrief. |
| 5. Prüfung starten | Backend validiert Identität/Eigentum, friert Snapshot/Revision ein, dispatcht UUID; kontrollierter Worker erhält nur öffentliche Versionskennungen. | Gute Grenze. Kein Ersatz für Aktenvollständigkeit oder Wert-/Beleg-Konsistenz; A1/A5. |
| 6. Warten und wiederkommen | Aktive Analyse wird alle drei Sekunden nachgeladen. Ablauf einer Lease erlaubt einen neuen Start. Fehlerfeld wird angezeigt. | Wiederaufnahme geplant. Nur aktive Analyse treibt Polling; laufende Dokumentauslese im Entwurf nicht. Die 25-Minuten-Lease ist keine Erledigungszusage. |
| 7. Ergebnis verstehen | Vergleichstermin, Klagefrist im unterstützten Grundfall, Quellen, Voraussetzungen, offene Fragen. Veraltete Analyse wird in der Akte markiert. | Fachliche Grenzen werden benannt. Unklarheit muss als nächste konkrete Aufgabe statt als weitere technische Eingabearbeit aufgelöst werden. Technischer Status und fachliche Vollständigkeit brauchen getrennte Zustände. |
| 8. Bericht freigeben | Bericht entsteht serverseitig aus `structured_result`; Mandant bestätigt Textfassung. Neue Freigabe und Erzeugung verlangen aktuelle Revision. | Starkes Prinzip. Bereits freigegebene alte Berichte werden beim Export nicht gegen die heutige Revision geprüft; A2. Die Freigabe ist keine Kanzleiprüfung. |
| 9. An eine Kanzlei übergeben | Nativer PDF-Export über System-Share. PDF enthält Fakten/Zitate, Chronologie, Rechenwege, offene Fragen, Quellen. | Nützlicher Gesprächsbericht. Kein zusammenhängendes Paket mit Originalen, Beweismittelverzeichnis, bearbeitbarem Entwurf und Review-Aufgaben. |
| 10. Löschen | Fall: Dateien zuerst, dann Zeile. Konto: rekursiv Storage listen/entfernen, dann Auth-Nutzer löschen. | Gute Normalfallreihenfolge. Upload-Rollback und Pagination haben Fehlerpfade; A4/A7. Gleichzeitige Uploads und Resttoken wurden nicht live geprüft. |

Quellanker: `apps/mobile/src/features/auth/api.ts`, `session.tsx`; `apps/mobile/app/(app)/fall/neu.tsx:18-91`; `apps/mobile/src/features/faelle/api.ts:42-96,205-258`; `TerminationInput.tsx:10-68`; `hooks.ts:99-110`; `supabase/functions/_shared/case-analysis.ts:146-170`; `supabase/migrations/20261110113220_portfolio_contract.sql:23-43,48-97,102-118`; `apps/mobile/src/features/faelle/export.ts:65-80`.

## 2. Konkrete technische Befunde

### A1 · P1 · Belegexistenz ist keine Wert-/Beleg-Konsistenz

**Ausgeführt.** `packages/shared/termination.ts:175-188` prüft, ob das Zitat auf der angegebenen extrahierten Seite vorkommt, anschließend Kalenderformat/Optionswerte. Der gespeicherte `Fact.value` wird nicht mit dem Zitatinhalt abgeglichen.

Isolierte Reproduktion mit unverändertem Entwicklungsfall `dev-01`:

1. Original: bestätigter Zugang `2026-08-31`, Quote `Zugang am: 2026-08-31`.
2. Nur den strukturierten Wert auf `2026-09-01` ändern. Originalseite und Quote unverändert lassen.
3. `analyzeTermination` nimmt die Eingabe an; berechnete Daten ändern sich von `2026-09-21, 2026-11-30` zu `2026-09-22, 2026-12-31`.

Das belegt eine Fehlzuordnungsmöglichkeit, keine behauptete neue juristische Fehlregel. Nutzerbestätigungen können bewusst eigene Tatsachen enthalten; dann muss ihre Herkunft als **Nutzeraussage** statt als vom Original belegter Wert beschrieben werden. Eine automatische vollständige semantische Belegprüfung wird durch diesen Vorschlag nicht versprochen.

Zusätzliche statische Grenze: `case_documents` hat weiterhin Owner-`FOR ALL`-Policy (`20260905095138_case_file.sql:234-235`); spätere Migrationen entziehen `authenticated` nicht die Änderung von `extracted_text`/`extracted_pages`. Der Client kann damit die Textrepräsentation seiner eigenen Akte beeinflussen. RLS trennt Eigentümer, macht eine Textrepräsentation aber nicht zu einer unveränderlichen serverseitigen Extraktion. Kein Fremdaktenzugriff wurde dadurch demonstriert.

**Abnahme:** Feldherkunft getrennt speichern; bekannte normalisierbare Datums-/Enum-Widersprüche ablehnen bzw. als Konflikt behandeln; selbst behauptete/interpretierte Werte ausdrücklich als solche anzeigen; Originaldatei-Hash, Extraktionsversion und Seite serverseitig führen. Mutation eines Fact-Werts bei unveränderter widersprechender Quote darf nicht weiter als konsistent belegter Fakt erscheinen. Extraktionsfelder für normale Clients schreibsperren und entsprechende RLS-/Spaltenrechte gegen ein Testprojekt prüfen.

### A2 · P1 · Bereits freigegebener veralteter Bericht bleibt exportierbar

**Ausgeführt gegen tatsächlichen Exportcode mit isoliertem Print-/Share-Adapter; statischer vollständiger Aufrufpfad.** `alsPdfTeilen` verlangt ausschließlich `approved_at` (`export.ts:65-80`). Die Vorschauseite lädt nur `generated_documents` (`api.ts:174-185`), nicht die aktuelle Fallrevision; sie bietet bei gesetztem `approved_at` den Export an (`apps/mobile/app/(app)/schreiben/[id].tsx:45-58,75-88,122-143`).

`private.bump_case_revision` erhöht die Fallrevision, löscht aber historische Dokumentfreigaben nicht. Die Fallübersicht markiert ein altes Dokument zwar als „veraltet“. Nach Öffnen verschwindet diese Information. Die serverseitige Sperre in `approve_case_document` schützt **erneute Freigaben**, nicht das lokale Weitergeben einer schon früher freigegebenen Fassung.

**Auswirkung:** Ein Ratsuchender oder Anwalt kann eine historische Fassung erhalten, die in der Exportansicht nur als freigegeben bezeichnet wird.

**Abnahme:** Historische Fassungen weiter lesbar halten, mit Snapshot/Revision und „historisch“ kennzeichnen; vor aktuellem Export Revisionsstatus prüfen. Entweder aktuelle Weitergabe sperren oder historischen Export ausdrücklich auswählen und im PDF kennzeichnen. Test: freigeben → Fallangabe ändern → alten Bericht öffnen → kein unmarkierter aktueller Export.

### A3 · P1 · Teilabfragefehler sehen wie eine leere Akte aus

**Ausgeführt.** `loadCaseOverview` startet sieben Abfragen parallel, prüft aber nur `caseResult.error` (`api.ts:42-96`). Fehler von Dokumenten, Fakten, Analysen, Quellen, Terminen oder Schreiben werden nicht ausgewertet. `data ?? []`/`null` erzeugt stattdessen leere Abschnitte.

Im isolierten Adapter kamen alle sechs Kindabfragen mit einem Fehler zurück, die Fallabfrage war erfolgreich. Die Funktion löste erfolgreich mit `dokumente=[]` und `analyse=null` auf.

**Auswirkung:** „Keine Dokumente/Fristen“ und „Dokumente/Fristen konnten nicht geladen werden“ werden verwechselt. Für eine Kanzlei ist das ein Vollständigkeitsrisiko.

**Abnahme:** Jede Teilantwort prüfen; entscheidungsrelevante Ladefehler dürfen keine Leerzustände erzeugen. Bei teilweisem Laden klare Kennzeichnung und Wiederholen. Tests für jede einzelne fehlgeschlagene Kindabfrage und den kombinierten Fehlerfall.

### A4 · P1 · Upload-Kompensation ignoriert einen fehlgeschlagenen Storage-Abbau

**Ausgeführt.** Scheitert nach erfolgreichem Dateiupload das Einfügen der Dokumentzeile, ruft `createCase` `storage.remove` auf, ignoriert dessen zurückgegebenes `error` und löscht anschließend die Fallzeile (`api.ts:234-258`). Der Quellcode-Kommentar verspricht eine zusammenhängende Akte, aber der Fehlerpfad erhält keinen verlässlichen Bezug zur verbliebenen Datei.

Der isolierte Test erzeugte erfolgreich den Upload, ließ den Metadaten-Insert und danach den Storage-Abbau scheitern. Der Case-DELETE wurde trotzdem ausgeführt. Keine echte Datei und kein echter Datensatz wurden angelegt.

**Abnahme:** Fehlgeschlagene Kompensation als persistierenden, wiederholbaren Aufräumauftrag behandeln bzw. Akte/Dateibeziehung bis zur Bereinigung erhalten. Nicht ohne nachgewiesenen Storage-Erfolg die letzte Zuordnung löschen. Wiederholung idempotent; Fehlerantwort sagt, ob Wiederholen sicher ist. Fehlerfälle vor/nach Upload, vor/nach Metadaten-Insert und verlorene Rückantwort getrennt prüfen.

### A5 · P1 für eine behauptete vollständige Aktenprüfung · Ungelesene zusätzliche Dokumente verhindern den technischen Pass nicht

**Ausgeführt.** An `dev-01` wurde ein zusätzliches Dokument mit leerem Text und `processing_error: 'Kein Text im PDF'` angehängt. `buildWorkerInput` nahm den Snapshot an; `buildPortfolioResult` blieb `technical_status='pass'`.

Die vollständige Lesezustandsprüfung steht im älteren `buildAnalysisInput`; der aktive kontrollierte Aufruf verwendet `buildPortfolioResult` (`_shared/case-analysis.ts:117-170`). Er validiert nur die für bestätigte Belege verwendeten Seiten, nicht das Lesen aller beigefügten Unterlagen.

Das bedeutet nicht, dass der kontrollierte Rechenkern sämtliche Anhänge prüfen sollte. Es bedeutet, dass dessen Pass nicht als Prüfung der gesamten Akte verwendet werden darf.

**Abnahme:** Dokumentstatus und Prüfungsumfang explizit im Ergebnisvertrag abbilden: verarbeitet / unlesbar / ausgenommen / noch offen. Ungelesene potenziell relevante Verträge oder Anlagen dürfen eine vollständige Übergabebereitschaft nicht erhalten. Kanzlei sieht, welche Unterlagen tatsächlich berücksichtigt wurden. Fachliche Freigabe von Datumsrechenbarkeit trennen.

### A6 · P2 · Dokumentverarbeitung hat keinen stabilen Fortschritts-/Wiederaufnahmeweg

**Statisch belegt.** `createCase` startet die Auslese ohne Warten und verschluckt die Rejection (`api.ts:248-252`). `useFall` lädt nur bei aktiver Analyse automatisch nach (`hooks.ts:99-109`), nicht während der Dokumentverarbeitung im Entwurf. Die Dokumentzeile zeigt lediglich bei `processed_at && processing_error` den generischen Hinweis „Text nicht lesbar“. Eine nie gestartete oder transportseitig fehlgeschlagene Extraktion kann ohne sichtbaren Abschluss bleiben.

Die manuelle Wiederlesefunktion ist vorhanden, verlangt aber Initiative des Nutzers. `dokumentLesen` behandelt ein HTTP-200-Ergebnis mit `status:'kein_text'` als erfolgreichen Funktionsaufruf; die fachliche Erklärung kommt erst mit erneut geladenen Metadaten. Die Datei-Lesefunktion speichert Fehlermeldungen über `vermerke`, prüft dessen Datenbankfehler aber nicht (`dokument-lesen/index.ts:100-107`).

**Abnahme:** Dokumentzustand nicht aus mehreren nullable Feldern erraten; queued/running/succeeded/failed plus Fehlerkategorie/Versuch führen. Servergesteuert fortsetzen oder klaren Retry anbieten. Nach App-Neustart und Netzverlust muss die nächste Handlung sichtbar sein. Bestehende Dateien bleiben erhalten. Keine ungespeicherte Fact-Eingabe bei Hintergrund-Refresh verwerfen.

### A7 · P2 · Kontolöschung besucht nur die erste Storage-Seite

**Ausgeführt als Handler-Kontrollfluss mit isoliertem Storage/Auth-Adapter.** `delete-account/index.ts:53-79` fragt je Prefix einmal `list(prefix,{limit:1000})` ab. `offset`/weitere Seiten und eine Abschlusskontrolle fehlen.

Der Test bot 1.001 Einträge eines Prefix an. Genau ein Listenaufruf und 1.000 Removes wurden durchgeführt; der Handler rief danach `deleteUser` auf. Das zeigt eine Paginationlücke, **nicht** den Nachweis, dass ein echter Supabase-Nutzer mit Restdatei erfolgreich gelöscht werden kann. Supabase dokumentiert, dass eine Auth-Löschung bei noch besessenen Storage-Objekten verweigert wird. Im echten Dienst ist deshalb auch ein teilweise abgearbeiteter Löschvorgang mit Fehler möglich. Die Root-Ebene kann zudem mehr als 1.000 Fallordner enthalten.

**Abnahme:** Alle Seiten vollständig abarbeiten, Löschstatus wiederaufnehmbar führen und vor Auth-Löschung verbleibende Objekte kontrollieren. Beim Löschen verschieben sich Ergebnisse; blindes Erhöhen von `offset` kann neue Lücken erzeugen. Tests für 1.001 Objekte, 1.001 Ordner, fehlgeschlagenen Remove, Wiederholung, parallelen Upload und Auth-Fehler. Rest-JWT-/Sessionverhalten separat auf einem freigegebenen Testprojekt prüfen.

Primärquellen: [Storage list, limit und offset](https://supabase.com/docs/reference/javascript/storage-from-list), [Auth-Nutzer löschen: Storage-Objekte und Rest-JWT](https://supabase.com/docs/guides/auth/managing-user-data). Die Dokumentation wurde am 16.11.2026 gelesen. Sie beschreibt auch, dass Löschen kein sofortiges Ungültigmachen sämtlicher Access-JWTs garantiert; ein solcher Restzugriff wurde hier nicht praktisch demonstriert.

### A8 · P1 · Die native allgemeine Rechtssuche zeigt Modelltext auch ohne bestandenen Audit

**Statisch belegt; gemeinsame Bearbeitung mit dem Engine-Audit.** `recht-nachschlagen/index.ts:151-176` reicht `answer` weiter und reduziert den Audit auf Status/Anzahl schwerer Befunde. Fehlt er, wird Status `unknown` mit Anzahl `0` geliefert. `apps/mobile/app/(app)/nachschlagen.tsx:102-126` warnt nur bei Anzahl > 0 und zeigt den Text immer.

Die Oberfläche unterscheidet „allgemeine Rechtslage“ und „eigener Fall“ nur durch Hinweise. Das Backend erzwingt keine zuverlässige Erkennung persönlicher Sachverhalte. Die allgemeine Frage wird als `q` in eine Engine-URL geschrieben; Nutzer können dennoch persönliche Daten hineinschreiben. Das ist keine Behauptung, dass in diesem Lauf solche Daten übertragen oder geloggt wurden.

**Abnahme:** Ein gemeinsamer serverseitiger Release-Status mit unbekannt/fehlgeschlagen als nicht freigegeben; UI zeigt dabei geprüfte Quellen, Fortschritt und offene Fragen, keinen freien Antworttext. Normaler JSON-Pfad, Streaming, Fehlerpfad und Anbieterwechsel müssen dieselbe Entscheidung beachten. Allgemeine Recherche braucht eine verständliche Grenze und dokumentierte tatsächliche Datenflüsse; Hinweise sind keine technische Pseudonymisierung.

### A9 · P2 · Schrittweise Klärung ist noch kein geführter Intake

**Statisch nachvollzogen.** Fehlt `receipt_on`, wird die Zugangsfrage gestellt (`termination.ts:232-237`). Die Hinweise zu Beschäftigungsbeginn, Vertrags-/Tarifregeln und Probezeit stehen innerhalb des äußeren Zweigs, der einen bereits bekannten Zugang voraussetzt (`246-300`). Bei einem Fall ohne Zugang kommen sie daher zunächst nicht.

Das kann fachlich sinnvolle Priorisierung sein. Die private Oberfläche setzt anschließend aber keinen geführten Frage-/Antwortprozess fort: `TerminationInput.tsx:56-65` bietet eine generische Auswahl aller Faktarten und freie Werte/Zitate. Der Nutzer muss die offene Frage in diese Struktur übersetzen, speichern und erneut prüfen. Es gibt kein persistiertes „diese Frage ist beantwortet, diese fehlt noch“ für eine Kanzlei.

**Abnahme:** Dringliche nächste Frage plus vollständige verbleibende Checkliste, ohne alles gleichzeitig als Fehler darzustellen; jede Antwort wird einem typisierten Feld und einer Herkunft zugeordnet. Klärungen zwischen Mandant und Kanzlei dürfen nicht wiederholt angefordert werden. Angaben mit eigener Wahrnehmung müssen ohne erfundene Dokumentbelegstelle erfassbar sein; ihre Beweisqualität bleibt sichtbar offen.

## 3. Was für die Kanzlei konkret fehlt

Dies sind Produktlücken des geprüften Eigentümermodells, keine nachgewiesenen Fehler der bestehenden Portfolio-Zusage.

| Kanzleiarbeit | Vorhandene Grundlage | Kleinster fachlich sinnvoller Ausbau und Abnahme |
|---|---|---|
| Mandatsannahme und Interessenkollision | Persönlicher Fall mit owner_id, Beschreibung und Original-PDF | Beteiligte/Gegner, Kanzleizuordnung, Intake-Status und Kollisionshinweise. Mandatsannahme bleibt bewusste Kanzleientscheidung. Kein Vollzugriff durch ein bloßes Teilen eines Links. |
| Unterlagen einsammeln | Ein Pflicht-PDF beim Anlegen; Dokumenttypen existieren im Schema | Nachreichen mehrerer Dokumente mit Checkliste, Status und gezielter Rückfrage. Scan/OCR mit Qualitätshinweisen, Seitenrotation und Originalbezug. Keine stillschweigende Vollständigkeitsbehauptung. |
| Fakten und Chronologie prüfen | Typisierte bestätigte Werte, Quote/Seite, einfache Datumschronologie | „Original – extrahierter Vorschlag – Mandantenaussage – anwaltlich geprüft“ nebeneinander; Änderungen und Konflikte gezielt freigeben. Nicht elf fachliche Kategorien pauschal als Laie bestätigen lassen. |
| Entscheidungsrelevante Lücken klären | `uncertainties` als Textliste | Offene Punkte als adressierte Aufgaben mit Antwort, Dokumentanforderung, Verantwortlichem und Status. Wiederverwendung einer bestätigten Antwort in allen daraus abgeleiteten Berechnungen. |
| Fristen verantworten | Begrenzt deterministische Datumsrechnung und Herkunft | Vorschlag, Eingangskontrolle und anwaltlich geprüfte Frist getrennt; Zuständigkeit, Erledigung, Warnung und Revision. Noch keine Kanzlei-Fristenkontrolle oder Verfahrenskalender behaupten. |
| Schriftsatz vorbereiten | Server erzeugt ausdrücklich nur `bericht`; `anschreiben` endet in HTTP 422 (`dokument-erstellen/index.ts:48`) | Ein enger Entwurfstyp aus versionierten Vorlagen, Fakten und Fundstellen. Varianten/Anträge/Empfänger muss die Kanzlei prüfen. Keine erfundenen Tatsachen oder pauschale Erfolgsaussage. |
| Dokument weiterbearbeiten | Unveränderlicher Bericht, PDF-Ausgabe | Bearbeitbares Kanzlei-Dokument mit Feldern/Anlagen und Änderungsvergleich. Erst für einen klaren Anwendungsfall; nicht gleichzeitig ein gesamtes Kanzlei-DMS bauen. |
| Endfreigabe und Versand | `approved_at` durch den Eigentümer/Mandanten; kein eigener Anwalt im Schema | Rolle und Aktenberechtigung des verantwortlichen Rechtsanwalts, konkreter freigegebener Dokumenthash, offene Pflichtprüfungen, Zeitpunkt und versandte Fassung. Versand ist eine eigene Aktion nach Review; keine automatische Einreichung. |
| Nachvollziehbarkeit | Snapshots, Revisionen, Quellen, request_id | Ergänzender fachlicher Reviewverlauf: wer hat welchen Fakt/Entwurf geprüft/geändert und warum; sichtbare Deltas seit der letzten Prüfung. Auditdaten nicht als frei editierbare Freitextnotiz führen. |
| Übergabe an Bestandssoftware | PDF-Systemshare | Erst ein dokumentiertes Exportpaket: bearbeitbarer Entwurf, Originale, Beweis-/Anlagenverzeichnis, Fakten/Chronologie, Quellen und offene Prüfpunkte. Konkrete RA-MICRO/DATEV/beA-Schnittstellen erst nach verifizierter Partnerdokumentation planen. |

Quellanker für die Grenzen: `supabase/migrations/20260905095138_case_file.sql:72-88,114-155,225-241`; `supabase/migrations/20260906054106_analyse_runs_und_berichte.sql:126-144`; `supabase/migrations/20260906055357_dokument_freigabe.sql:20-39`; `supabase/functions/dokument-erstellen/index.ts`; `packages/shared/report.ts:4-48`; `apps/mobile/src/features/faelle/export.ts`.

## 4. Ausgeführte Prüfungen

| Prüfung | Ergebnis | Grenze |
|---|---|---|
| `npm --prefix apps/mobile run typecheck` | Exit 0 | Keine Geräte-/Netzwerkprüfung |
| `npm --prefix apps/mobile run test:analysis-status` | „Analysis lease status checks passed“ | Nur Status-/Lease-Regeln; Node meldet harmlose Modulformaterkennung |
| `python3 scripts/generate-contract.py --check` | Exit 0 | Typ-/Schema-Drift, keine materielle Richtigkeit |
| `deno test --allow-read --config supabase/functions/deno.json supabase/tests/case_analysis_test.ts supabase/tests/portfolio_test.ts` | **27 bestanden, 0 fehlgeschlagen** | Lokale Tests mit isolierten Persistenzadaptern; kein deploytes SQL |
| `deno check ...` für sechs Edge Functions | Alle sechs bestanden | Typecheck, keine Laufzeit-/Plattformabnahme |
| `python3 scripts/check-public-bundle.py` | Bundle isoliert; 3 gehostet vorerzeugte fiktive Ergebnisse und zugehörige PDFs verifiziert; Screenshot-Hashes passend | Prüfung vorhandener lokaler Exportartefakte, kein heutiger privater Backendlauf |
| Unveränderte 24 Referenzfälle / 40 Ausführungen, dynamisch aus `evals/development` und `evals/acceptance` | **0 Abweichungen, 0 Modellaufrufe** | Eigene Referenzen, kein unabhängiger juristischer Goldstandard. Historische Messdatei wurde nicht überschrieben. |
| Isolierte Quellcode-Repros A1–A4 | Verhalten jeweils bestätigt | Netzwerk/Print/Share/Datenbank durch explizite lokale Adapter ersetzt |
| Ungelesenes zusätzliches PDF, A5 | Worker-Input akzeptiert; `technical_status='pass'` | Lokale Funktion, kein Worker gestartet |
| 1.001 Storage-Einträge, A7 | nur 1.000 besucht, anschließend Auth-Löschung aufgerufen | Kontrollflussadapter. Tatsächlicher Auth-Dienst kann wegen verbliebener Dateien ablehnen. |

Laufzeitumgebung: Node `v26.8.2`, Deno `2.9.8`, Deno-TypeScript `6.0.3`. CI verwendet Node 24; ein lokal bestandener Lauf unter Node 26 ersetzt den CI-Lauf unter Node 24 nicht. Die Tests wurden nicht mit realen Mandantendaten ausgeführt.

Die Referenzauswertung wurde als lesender `deno eval` mit denselben Fixtures und denselben `analyzeTermination`/`validateInput`/`validateResult`-Funktionen ausgeführt, damit `docs/portfolio/deterministic-evaluation.json` seine historische Bedeutung behält. Ausgabe: `{"cases":24,"executions":40,"mismatches":0,"model_calls":0}`.

## 5. Zwei kleine reproduzierbare Gegenproben

Im Repository-Root, ohne Secrets und ohne Modellaufruf:

```sh
deno eval --config supabase/functions/deno.json '
import {analyzeTermination} from "./packages/shared/termination.ts";
const f=JSON.parse(Deno.readTextFileSync("evals/development/dev-01.json"));
const c=JSON.parse(Deno.readTextFileSync("packages/shared/corpus/termination-2026-11-10/corpus.json"));
const original=analyzeTermination(f.input,f.documents,c);
f.input.facts.find(x=>x.key==="receipt_on").value="2026-09-01";
const changed=analyzeTermination(f.input,f.documents,c);
console.log({original:original.calculations.map(x=>x.due_on),changed:changed.calculations.map(x=>x.due_on)});
'
```

Aktuelle Ausgabe: `original: [2026-09-21, 2026-11-30]`, `changed: [2026-09-22, 2026-12-31]`. Die Quote bleibt `Zugang am: 2026-08-31`.

```sh
deno eval --config supabase/functions/deno.json '
import {buildWorkerInput,buildPortfolioResult} from "./supabase/functions/_shared/case-analysis.ts";
const f=JSON.parse(Deno.readTextFileSync("evals/development/dev-01.json"));
const s={description:"synthetic",revision:1,facts:[],termination_input:f.input,
 documents:[...f.documents,{id:"unread",file_name:"unread-scan.pdf",extracted_text:"",processing_error:"Kein Text im PDF"}]};
console.log({worker_input:buildWorkerInput(s),technical_status:buildPortfolioResult(s).technical_status});
'
```

Aktuelle Ausgabe: öffentliche Portfolio-/Korpusversionen und `technical_status:'pass'` trotz zusätzlichem ungelesenem Dokument. Die Gegenprobe startet keinen Auftrag und schreibt keine Datei.

Die Adapter-Repros A2–A4 wurden gegen per installiertem TypeScript `transpileModule` übersetzte Originaldateien ausgeführt. Der Netzwerkadapter antwortete gezielt mit Fehlerobjekten, wie es die Supabase-Client-API tut; Print und Sharing setzten nur lokale Booleans. Die Ergebnisse beweisen den lokalen Fehlerpfad, nicht einen Produktivvorfall. Für dauerhafte Regressionen sollten diese Fälle in die vorhandenen passenden Tests übernommen werden, sobald die Implementierung korrigiert wird.

Die **bereits ausgeführten Shell-Bodies** sind anschließend wortgetreu aus den protokollierten `CommandExecution`-Ereignissen gesichert und erneut ausgeführt worden; es wurden dafür keine neuen Repros nachgebaut:

```sh
# Im Repository-Root /Users/ozi/Recht-Papier:
bash docs/research/2026-11-16-audit/evidence/isolated-app-adapters.sh
bash docs/research/2026-11-16-audit/evidence/isolated-delete-pagination.sh
```

Beide Wiederholungen: Exit 0; die beschriebenen aktuellen Fehlerpfade werden durch Assertions bestätigt. Die Probe erwartet das aktuell beanstandete Verhalten. Nach dessen Korrektur muss sie absichtlich fehlschlagen bzw. in eine positive Regression überführt werden. Sie ist kein grün=Produktfreigabe-Test.

- [Adapter-Probe](2026-11-16-audit/evidence/isolated-app-adapters.sh): Rohlabel A = Befund A3, B = A4, C = A2, D = A1; [originale Ausgabe](2026-11-16-audit/evidence/isolated-app-adapters.original-output.txt).
- [Pagination-Probe](2026-11-16-audit/evidence/isolated-delete-pagination.sh): Befund A7; [originale Ausgabe](2026-11-16-audit/evidence/isolated-delete-pagination.original-output.txt).
- [Herkunft, Ausführungszeit, Exitcodes und SHA-256](2026-11-16-audit/evidence/app-adapter-provenance.json).

Die Skripte verwenden den ursprünglichen lokalen Checkout-Pfad und dessen installiertes TypeScript. Sämtliche Supabase-/Storage-/Print-/Share-Aufrufe bleiben isolierte Adapter. Insbesondere `user_deleted:true` der Pagination-Probe bedeutet **nur**, dass der lokale Mock aufgerufen wurde; der reale Auth-Dienst kann wegen übriger Storage-Objekte ablehnen.

## 6. Sicherheitsgrenzen und offene Abnahmen

- Positiv: Owner-RLS für persönliche Akten; private Storage-Präfixe; technische Ergebnisfelder und Freigabe-RPCs nicht für normale Clients beschreibbar; Worker-Secret/Claim/Revision/Lease-Prüfung; kontrollierter Worker bekommt keine privaten Fakten; native App hält keinen Engine-/Service-Role-Schlüssel.
- Nicht neu geprüft: tatsächliche Grants/Policies im laufenden Projekt, RLS-Tests mit zwei Nutzern, unbefugte signierte URLs, Backups/Retention, Wiederherstellung von Supabase Auth/DB/Storage, echte Kontolöschung, Sessionwiderruf und parallele Uploads. Die entsprechenden älteren Integrationsskripte wurden gelesen und bewusst nicht gegen ein nicht freigegebenes Produktivprojekt gestartet.
- Ein Fünf-Minuten-Signed-URL ist während seiner Gültigkeit weitergebbar; der Kommentar `api.ts:279-281` („überleben kein Teilen“) ist zu absolut. Kurze Gültigkeit begrenzt die Zeit, ersetzt keine Empfängerberechtigung. Kein fremder Link wurde geöffnet.
- Sitzung wird über SQLite-`localStorage` persistiert (`apps/mobile/src/lib/supabase.ts:1-26`). Es gibt hier keinen neuen Nachweis einer gerätegebundenen Verschlüsselung/App-Sperre. Das ist ein gesonderter Bedrohungsmodellpunkt, kein nachgewiesener Tokenabfluss.
- Der fachliche Review darf nicht aus `technical_status='pass'`, `released` oder `approved_at` abgeleitet werden. Diese Begriffe tragen heute technische bzw. mandantenseitige Bedeutung.

Aktuelle Primärquellen für die technische Sicherheitsprüfung: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Storage-Zugriffskontrolle](https://supabase.com/docs/guides/storage/security/access-control), [Signout und Scopes](https://supabase.com/docs/guides/auth/signout). Sie ersetzen nicht die Prüfung der tatsächlich angewendeten Policies.

## 7. Priorisierte nächste Arbeitspakete

1. **Wahrheit und Aktualität der Arbeitsmappe:** A1, A2 und A3 gemeinsam absichern. Nutzerangabe, Dokumentbeleg und Reviewstand unterscheiden; Ladefehler bleiben Fehler; historische PDFs werden klar gekennzeichnet.
2. **Verlässlicher Dokumenteingang:** A4–A7, mehrere Unterlagen, Zustand/Retry/Umfang, OCR nur mit ausgewiesener Qualität und Originalbezug. Aufräumen und Wiederholung mit kontrollierter Fehlerinduktion testen.
3. **Geführte Rückfragen und Vollständigkeit:** Zugang/Dringlichkeit priorisieren, alle übrigen fehlenden Abhängigkeiten sichtbar halten; Antworten strukturiert fortschreiben. Gezielte Rückfrage ersetzt erneutes vollständiges Ausfüllen.
4. **Ein Kanzlei-Reviewpfad für einen engen Falltyp:** berechtigte Kanzleizuordnung, Fakten-/Quellenansicht, offene Pflichtprüfungen, bearbeitbarer Entwurf, Review-Delta und dokumentbezogene Endfreigabe. Dafür keine neue universelle Rechtsgebietsplattform voraussetzen.
5. **Gemeinsame allgemeine Antwortfreigabe:** A8 mit dem getrennten Jura-Engine-Audit zusammenführen. Bestehenden kontrollierten Portfolio-Pfad erhalten.
6. **Anwaltlich begleitete Abnahme:** Fiktive realistische Akten statt nur Formular-PDFs, inklusive unlesbarer/fehlender/widersprüchlicher Unterlagen und geänderter Revisionen. Zeit bis zur geprüften Arbeitsmappe, Zahl notwendiger Rückfragen, Korrekturaufwand und übersehene Pflichtpunkte messen. Der Anwalt entscheidet die fachlichen Freigabekriterien; reine Testzahlen belegen diese Entlastung nicht.

Keine Laufzeitkorrektur und keine Produktfreigabe wurde im Rahmen dieses Teilberichts vorgenommen. Der vollständige private reale Ablauf, fachliche Eignung und Zeitersparnis in einer Kanzlei bleiben zu validieren.
