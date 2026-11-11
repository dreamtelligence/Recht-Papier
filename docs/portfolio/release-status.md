# Portfolio: überprüfter Stand

Stand 11.11.2026; Nachweise vom 10.11. sind unten zeitlich eingeordnet. Auftrag: `docs/portfolio-release-plan.md`. Nutzerentscheidungen: vorhandenes Qwen/Gemini, erkennbare Anbieter-Platzhalter, native Dokumentation mit Screenshots.

Aktueller Suchdienst-Stand: [Live-Index und Guard](#ergänzung-11112026-suchindex-und-guard-live).
Die chronologischen Ergänzungen dokumentieren zuerst die getrennten Prüfphasen,
danach den abgeschlossenen Live-Wechsel. Aussagen zum unveränderten Altindex
in früheren Phasen sind damit historisch eingeordnet.

**Öffentliche Produkt-Fallstudie mit Technischer Demo:** https://recht-papier-portfolio.vercel.app

- [x] Gemeinsames versioniertes Schema und generierte TypeScript-Typen.
- [x] Bestätigte typisierte Angaben mit Dokumentseite und wörtlicher Belegstelle; Freitext bleibt getrennt.
- [x] Eng begrenzte Fristregeln und explizite offene Prüfpunkte.
- [x] 24 Referenzfälle, 40 deterministische Ausführungen, keine Referenzabweichung.
- [x] 16 vollständige versionierte Normtexte; echter XML-Vergleich 1.931 → 2.308 Zeichen für § 622 BGB.
- [x] Index-Regression für geänderte Embeddings und unterbrochene Aktualisierungen; breiter Suchindex am 11.11. separat mit geprüftem Datenrückweg aktualisiert, kontrollierter Portfolio-Korpus unverändert.
- [x] Drei echte gehostete Backend-Läufe bis zum gespeicherten und bestätigten Bericht, einschließlich privater Zugriffsgrenze.
- [x] Statische Demo, lokale Fortschrittsspeicherung, Original-PDFs und Berichtsdownload ohne Besucher-Modellaufruf.
- [x] Lokale und öffentliche Browserprüfung: 3 Fälle × 2 Breiten, sechs Downloads, Wiederladen, beschädigter Fortschritt, Zurücksetzen, Rechtstexte und Architekturseite. Keine privaten Backend-Aufrufe oder Seitenfehler.
- [x] Nativer iOS-Simulator-Build mit 0 Fehlern/0 Warnungen; sieben geprüfte Screenshots und echter nativer PDF-Export mit vier Seiten.
- [x] Beispielberichte mit Quellen, Rechenwegen, Voraussetzungen und Fragen; drei Seiten pro Browser-Bericht. Alle 16 PDF-Seiten visuell geprüft.
- [x] Lokale Checks: 27 Edge-Tests, 192 Python-Tests, Mobile-Typecheck, Lease-Status-Test, Schemagenerierung und öffentliche Bundle-Isolation bestanden.
- [x] Echte Zugriffstrennung, atomare Speicherung, Revisionen, Worker-Aufträge und Dokumentfreigabe geprüft; synthetische Konten und Uploads entfernt.
- [x] README, Architekturseite, Regressionsnachweis, Kostenmessung und Modellfehler dokumentiert.
- [x] Präsentation für Recruiter grundlegend überarbeitet: umfassendere Produktvision, implementiert/teilweise/geplant, echte iOS-Tour, UI/UX und Frontend-/Full-Stack-Beiträge vor der nachgelagerten Technischen Demo.
- [x] Neun unveränderte native Aufnahmen öffentlich eingebunden, darunter eine aktuelle Eingabemaske mit dem tatsächlich unterstützten PDF-Umfang.
- [x] Scrollregression reproduziert (Wischgeste 0 Pixel), Expo-Scrollsperre ausschließlich im Web aufgehoben. Vorwärts-/Rückwärtsscrollen und Fußzeile in Chromium mit Touch sowie WebKit bei Smartphonebreite geprüft. [Nachweis und Grenzen](presentation/README.md).
- [ ] Vollständiger Modellvergleich: Qwen EU-L40S-Kapazität nicht verfügbar; Gemini-Quote vor allen Wiederholungen erschöpft. Nur 17 Gemini-Antworten auswertbar, davon 15 mit abweichendem Termin. Keine Modellrangliste oder freie Modellfreigabe.
- [ ] Endgültige Providerrechnung/Kostenabgleich. Modal meldet bisher 0,22966928 USD Verbrauch; Gemini 0,0133723 USD nur Listenpreis-Schätzung. Kein vollständiger Ist-Kosten-Benchmark.
- [ ] Grüner gehosteter GitHub-CI-Nachweis: Konto laut [neuem CI-Lauf](https://github.com/dreamtelligence/Recht-Papier/actions/runs/42820008368) und [Annotation](ci-verification.json) wegen Abrechnungsproblem gesperrt. Lokale grüne Checks ersetzen diesen Nachweis nicht.
- [ ] Release-Tag `v1.0.0` nach den offenen Abnahmen.

[Browser-Nachweis](browser-live-verification.json) · [Native Nachweise](native/README.md) · [PDF-Prüfung](pdf-verification.json) · [Evaluation](evaluation.md) · [Abhängigkeiten](dependency-audit.json)

Keine anwaltliche Prüfung bestätigt. Die Anforderungen an freie Modellschlussfolgerungen wurden nicht erfüllt; der veröffentlichte Produktpfad formuliert ausschließlich kontrollierte Prüfergebnisse und offene Fragen. Physisches iPhone und Android wurden nicht geprüft. Sieben npm-Audit-Funde verbleiben im nativen Router beziehungsweise Expo-Build-Abhängigkeiten (drei hoch, vier mittel); kein stiller SDK-Wechsel. Die öffentliche Web-Datei importiert keinen privaten Router oder Supabase-Client. Anbieter-/Datenschutzangaben bleiben auf Nutzerwunsch sichtbar unvollständig. Dies ist keine Freigabe für echte Rechtsberatung oder Store-Einreichung.

## Ergänzung 11.11.2026: breiteren Gesetzesbestand prüfen

Ein neuer, rein lesender Audit im separaten Jura-Repository vergleicht BGB,
KSchG, BetrVG, ZPO und ArbGG mit ihren amtlichen XML-Dateien. Der heruntergeladene
Katalog enthält 17.051 Dokumente. Gegenüber den aktuellen Quellen fehlen elf
Paragraphen; 842 vorhandene Einträge unterscheiden sich in Text oder Überschrift,
darunter reine Schreibweisenänderungen wie `Abs.`/`Absatz`. Die bekannten
Textverluste in BGB § 622 und weitere fehlende Passagen in KSchG § 1 sind belegt.

Ein getrennter Kandidat mit 3.845 Paragraphentexten stimmt mit den eingefrorenen
Quelltexten überein; 26 gezielte Tests bestehen. [Prüfsummen, Quellen und Grenzen](statute-corpus-audit-2026-11-11.json).
Dieser erste Textkandidat deckt nur die fünf Gesetze ab; der nachfolgende
vollständige Indexaufbau ist separat dokumentiert. Der Live-Index und der
bestehende 16-Normen-Portfolio-Pfad wurden nicht verändert.

## Ergänzung 11.11.2026: vollständiger Kandidat mit neuen Embeddings

Im Jura-Repository wurde ein getrennter vollständiger Kandidatenindex aus
17.060 Dokumenten aufgebaut: Die 3.845 auditierten Paragraphen ersetzen die
fünf alten Gesetzesbestände; die übrigen Gesetzestexte und alle 782 vorhandenen
Entscheidungsabschnitte bleiben inhaltlich erhalten. Alle Dokumente erhielten
neue dichte und sparse BGE-M3-Vektoren mit fester Modellrevision. Alle 17.060
Vektoren und Payload-Zuordnungen wurden nach erneutem Öffnen auf dem GPU-Worker
und unabhängig im heruntergeladenen lokalen Qdrant-Index geprüft.

Der erste echte Suchlauf bestand 15 von 16 festen Quellenverträgen. Der dabei
gefundene Fehler bei `§ 46 ArbGG` wurde in Suche, Kontextaufbereitung und
Quellenprüfung behoben. Der erneute Lauf mit demselben gespeicherten Index und
unveränderten Suchverträgen besteht **16 von 16 Fällen**. `ArbGG § 46` steht nun
im betreffenden Fall an erster Stelle. Die Rohsuche enthält in 15 von 16 Fällen
alle Pflichtquellen; der allgemeine Kündigungsfall besteht nach der vorhandenen
Quellenkontrolle. Es wurden keine Dokument-Embeddings neu berechnet.

94 gezielte Python-Regressionen bestehen. Die Rohsuche allein bleibt beim
allgemeinen Kündigungsfall unzureichend; die vorhandene deterministische
Quellenkontrolle ergänzt fehlende Pflichtnormen und entfernt die im Vertrag
ausgeschlossenen Treffer. Fünf besonders lange Normen/Anlagen überschreiten das
Embedding-Kontextfenster; ihr Volltext ist gespeichert, ihr Vektor bildet nur
den Anfang ab. Andere Gesetze und Urteile wurden nicht erneut quellenauditiert.
Die Suchfälle benötigten 5,312–30,593 Sekunden (Median 14,106) im isolierten
GPU-Worker; ein Lasttest oder Nachweis interaktiver Endpunktlatenz steht aus.

Kein Live-Indexwechsel, keine Änderung am kontrollierten Portfolio-Pfad und
keine LLM-Antwortaufrufe. Fachliche Freigabe und allgemeine Antwortqualität
bleiben offen. [Nachweis des Kandidatenaufbaus und seiner Grenzen](candidate-index-verification-2026-11-11.json).

## Ergänzung 11.11.2026: Endpassagen, Latenz und begrenzte HTTP-Probe

Die fünf Überlängen sind im nächsten separaten Kandidaten lückenlos in 77
referenzierbare Textfenster aufgeteilt. 17.055 unveränderte Vektoren stammen aus
dem zuvor geprüften Kandidaten; nur die Fenster wurden neu eingebettet. Der
Index enthält nun 17.132 Einträge und bewahrt zusätzlich alle 17.060 vollständigen
Originaldokumente. GPU- und unabhängiger lokaler Vollscan bestätigen alle Punkte,
Payloads und Quellenpositionen. **Null Embedding-Eingaben überschreiten das
Modelllimit**; die größte hat 8.116 Tokens.

Der abschließende echte Lauf besteht **16/16 bisherige und 5/5 neue Suchverträge**.
Die fünf Endpassagen liegen jeweils hinter dem zuvor verarbeiteten Token-Präfix.
Ein weiterer Fehler war die versteckte 512-Token-Voreinstellung des Rerankers;
der Aufruf setzt jetzt ein geprüftes Limit ausdrücklich. Normale, nicht
aufgeteilte Treffer behalten für das Reranking die bisherige 2.048-Zeichen-Grenze.

Die unbeschränkte Graph-Erweiterung erzeugte über 2.000 Reranker-Kandidaten pro
Anfrage. Sie ist nun begrenzt, ohne die primären Vektortreffer zu verwerfen.
Für dieselben 16 Fragen sank der Median auf derselben GPU-Klasse von **14,106 auf
1,785 Sekunden**. Das ist ein begrenzter Vergleich, keine allgemeine Latenzzusage.

Der vorhandene authentifizierte HTTP-Pfad bestand **24 Suchanfragen** mit einem
beziehungsweise vier gleichzeitigen Clients. Erwartete Quellen waren in allen
Antworten enthalten. Bei vier Clients betrug das gemessene 95. Perzentil 6,632
Sekunden, einschließlich Warteschlange. Geprüft wurde ein tatsächlicher lokaler
TCP-Server im GPU-Worker; öffentlicher Ingress, Uploads, Mehrmandantenbetrieb,
Query-Rewriting, LLM-Aufrufe und Hintergrundaufträge gehören nicht zu dieser
Probe. [Prüfsummen, Messwerte und vollständige Grenzen](candidate-hardening-2026-11-11.json).

**210 lokale Python-Tests** bestehen. Ein zusätzlicher Kompatibilitätscheck erhält
kompakte SGB-Schreibweisen; die Gesetzeserkennung aller 21 GPU-geprüften Fragen
bleibt unverändert. Die getrennte [Antwort-Vorprüfung](answer-review-2026-11-11.md)
prüft 17 gespeicherte echte Modellantworten und fünf fiktive Fallkonstellationen
anhand der Falldaten und amtlichen Normtexte. Vier beobachtete Bedeutungsumkehrungen
zu § 1 KSchG werden jetzt trotz passender Quellen-ID als schwerer Befund erkannt.
Die kontrollierten Berechnungen bestehen erneut 24 Referenzfälle und 40
Ausführungen ohne Abweichung.

Dies ist keine erneute freie Modellgenerierung oder anwaltliche Abnahme. Im
kontrollierten Portfolio-Pfad bleiben freie Modellschlussfolgerungen gesperrt.
Der Live-Index und der kontrollierte
Portfolio-Pfad wurden nicht ersetzt; eine allgemeine Lastfreigabe und ein
getesteter Produktionswechsel mit Rückweg bleiben offen.

## Ergänzung 11.11.2026: Suchindex und Guard live

Der neue Fensterindex ist jetzt im Suchdienst **`legal-rag` v41** aktiv:
17.132 Einträge aus 17.060 vollständigen Quellen. Der getrennte
**Analyse-Worker v5** enthält den geprüften Guard gegen die beobachtete
KSchG-Bedeutungsumkehr. Der kontrollierte 16-Normen-Korpus ist anhand seiner
Prüfsumme unverändert. Die öffentliche Vercel-Fallstudie wurde nicht neu deployed.

Alle **21 Suchverträge bestehen live**, einschließlich der fünf Endpassagen.
Der Median dieser kleinen sequenziellen Probe nach dem Kaltstart beträgt
2,004 Sekunden; dies ist kein Lastversprechen. Der allgemeine Kündigungsfall
benötigt weiterhin die vorhandene Quellenkontrolle. Authentifizierung,
Eingabevalidierung, verwandte Quellen und der tatsächlich deployte Worker wurden
geprüft. **231 gezielte lokale Python-Tests** bestehen. Kein neuer Fallauftrag
und keine neue juristische Modellantwort wurden dafür erzeugt.

Der Altindex wurde mit Prüfsummen gesichert und per regulärem Deployment einmal
wieder aktiviert; danach wurde der neue Stand wiederhergestellt. Der eingebaute
Modal-Versionsrollback ist auf dem aktuellen Tarif nicht verfügbar. Getestet ist
damit der Datenrückweg, keine exakte Wiederherstellung des alten Anwendungscodes.
[Live-Nachweis und Grenzen](live-index-release-2026-11-11.json) ·
[lesbarer Ablauf im Jura-Repository](https://github.com/dreamtelligence/Jura/blob/main/docs/live-index-release.md).
Der zum Live-Snapshot passende Jura-Quellstand ist inzwischen ebenfalls
[auf GitHub veröffentlicht](https://github.com/dreamtelligence/Jura/blob/main/docs/runtime-source-publication.md):
38/38 archivierte Dateien bytegenau abgeglichen, 231 Release- und 40 weitere
schnelle Regressionen bestanden. Die Codeveröffentlichung startet kein neues
Deployment und ersetzt keine externe Infrastruktur- oder juristische Abnahme.

**Nächstes Arbeitspaket:** [gemeinsame serverseitige Antwortsperre für allgemeine
LEX-Antworten](https://github.com/dreamtelligence/Jura/blob/main/docs/next-step-answer-release.md). Dort wird Modelltext bisher vor Abschluss des Audits gestreamt;
ein schwerer Befund darf künftig keinen freien Antworttext passieren lassen.
Der kontrollierte Portfolio-Pfad bleibt erhalten. Ein unabhängiger juristischer
Review und der Lasttest des vollständigen Produktpfads stehen weiterhin aus.

## Ergänzung 11.11.2026: isolierter Wiederaufbau und verschlüsselte Secrets

Frischer GitHub-Klon, unabhängig heruntergeladenes GitHub-Backup, neues Volume,
neues Modell-Image und eigene Testschlüssel: Der Jura-Kern besteht 17.132
Punkt-/Payload-Prüfungen und 21/21 HTTP-Suchverträge. Der kontrollierte Worker
liefert denselben 16-Normen-Korpus und den aktiven Guard. Ab Skriptstart bis
Aufräumen: 499,013 Sekunden, etwa 8 Minuten 19 Sekunden; Klonen und Download
sind darin nicht enthalten. Sämtliche Testressourcen sind gestoppt oder gelöscht.
Der erste fehlgeschlagene Probe-Lauf und seine Korrekturen bleiben im Nachweis
sichtbar. Produktion bleibt v41 / Worker v5; 290 schnelle Python-Tests bestehen.

Die drei benötigten produktiven Secret-Gruppen sind zusätzlich bereits auf Modal
verschlüsselt, im privaten GitHub-Release gesichert und nach erneutem Download
entschlüsselt worden. Eine temporäre Wiederanlage und Löschung wurde geprüft;
die Originalwerte wurden frisch verglichen und sind unverändert. Es gab keine
Modell- oder produktiven Callback-Aufrufe. Der private Entschlüsselungsschlüssel
liegt ausschließlich im lokalen macOS-Schlüsselbund. Eine unabhängige Offline-Kopie
fehlt noch. [Nachweis und vollständige Grenzen](recovery-drill-2026-11-11.json) ·
[Wiederaufbau-Anleitung](https://github.com/dreamtelligence/Jura/blob/main/docs/recovery.md).

Dies prüft keine neue Modal-Kontoanmeldung und keine Wiederherstellung von
Supabase-Datenbank, Auth, privaten Dateien, Edge Functions oder echten
Fallaufträgen. Das allgemeine Antwort-Gate und die juristische Abnahme bleiben
eigene offene Arbeitspakete.
