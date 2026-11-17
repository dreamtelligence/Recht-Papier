# Technische Nachweise und Betriebsdetails

Diese Angaben wurden aus dem Projekt-README ausgelagert. Die Daten beziehen
sich auf die jeweils genannten Prüfstände vom 11. und 16.11.2026; sie sind kein
neuer Testlauf und keine Aussage über einen inzwischen veränderten Dienst.
Den aktuellen Projektumfang beschreibt das [README](../README.md).

## Audit und isolierter Rollout

**Zuletzt geprüft am 16.11.2026:** Bei der [Prüfung aus Verbraucher- und Kanzleisicht](research/2026-11-16-product-and-kanzlei-review.md)
fielen unter anderem widersprüchliche Belege, veraltete Exportfreigaben und
Lücken bei der Dateibereinigung auf. Die Korrekturen sind durch Regressionstests
abgesichert. Auch der allgemeine LEX-Dienst prüft Antworten jetzt zentral vor
der Ausgabe und rendert sie abgesichert.
[Änderungen und Prüfungen](research/2026-11-16-remediation.md).

Anschließend wurde der Kündigungsablauf in einer getrennten Supabase-/Modal-Umgebung
vom Login bis zum Export geprüft: **22 Prüfschritte bestanden**. Dabei fiel auf,
dass ein alter Token nach der Kontolöschung noch Dateien hochladen konnte; auch
dieser Fehler wurde behoben und erneut geprüft. Ein neuer nativer Release-Build
lief im iPhone-Simulator bis zum vierseitigen PDF durch.
[Versuchsaufbau, Ergebnisse und Grenzen](research/2026-11-16-isolated-rollout.md).
Das bisherige Produktivbackend wurde dabei nicht aktualisiert. Eine Prüfmappe
für Kanzleien ist noch geplant.

## Einordnung der Fehlerbeispiele

Der ungültige Datumsvorschlag ist eine isolierte Reproduktion des alten Extraktors; die alte Datenbank hat ihn damit nicht nachweislich gespeichert. Alte freie Modellantworten und neue kontrollierte Ergebnisse sind unterschiedliche Arbeitslasten, kein vergleichbarer Geschwindigkeitsbenchmark.

## Unvollständiger Modellvergleich

Für den Modellvergleich wurden Qwen und Gemini verwendet. Qwen hatte keine verfügbare EU-L40S-Kapazität; Gemini erreichte die Quote vor Abschluss der Wiederholungen. Der vollständige Modellvergleich und der endgültige Kostenabgleich sind **nicht abgeschlossen**. Aus diesem Versuch lässt sich weder eine belastbare Rangliste noch eine fachliche Freigabe ableiten. Der Tag `v1.0.0` setzt die offenen Abnahmen voraus.

## Referenzfälle und Grenzen der Nachweise

Die drei veröffentlichten Fälle wurden vorab durch reale PDF-Textauslese, bestätigte Belege, den Modal-Auftrag, Ergebnisfreigabe und Berichtserstellung erzeugt. Zusätzlich wurden Zugriffstrennung, atomare Speicherung, veraltete Eingabestände und Dokumentfreigabe gegen das konfigurierte Testprojekt geprüft. Die native Sichtprüfung erfolgte im iPhone-Simulator; sie ist keine Prüfung auf einem physischen Gerät. Die hinterlegten Erwartungen der 24 Referenzfälle wurden nicht unabhängig anwaltlich geprüft.

Vor einem Pilotbetrieb mit realen Fällen müssen der fachliche Umfang und die Ergebnisse juristisch geprüft werden. Außerdem fehlen vollständige Anbieter- und Datenschutzangaben, geprüfte Verträge und Datenflüsse, verbindliche Aufbewahrungs- und Löschregeln sowie Nachweise für Betriebsüberwachung und Wiederherstellung. Auch die offenen Store-Voraussetzungen bleiben zu erfüllen. [Release-Status](portfolio/release-status.md).

## Allgemeine Rechtssuche: Messung vom 11.11.2026

Der getrennte Suchdienst `legal-rag` **v41** enthält **17.132 Indexeinträge aus
17.060 vollständigen Quellen**; der Analyse-Worker **v5** enthält den Guard gegen
die beobachtete KSchG-Bedeutungsumkehr. Alle **21 Live-Suchverträge** bestehen.
In einer kleinen sequenziellen Messreihe nach dem Kaltstart lag der Median bei
**2,004 Sekunden**. Ein Profilfall enthält zusätzlich den kontrollierten
Suchaufruf. Die Messung sagt noch nichts über das Verhalten unter Last oder
die juristische Qualität der Antworten aus.

[Live-Nachweis mit Hashes und geprüftem Datenrückweg](portfolio/live-index-release-2026-11-11.json) ·
[Textfenster und Latenzvergleich](portfolio/candidate-hardening-2026-11-11.json) ·
[Antwort-Vorprüfung](portfolio/answer-review-2026-11-11.md)

Der kontrollierte Portfolio-Korpus bleibt unverändert bei 16 Normtexten; die
öffentliche Fallstudie startet weiterhin keine Modelle. Der zum Live-Snapshot passende
[Jura-Runtime-Quellstand](https://github.com/dreamtelligence/Jura/blob/main/docs/runtime-source-publication.md)
ist jetzt auf GitHub veröffentlicht und anhand aller 38 archivierten Dateien
abgeglichen. Das gemeinsame serverseitige
[Antwort-Gate für den allgemeinen LEX-Pfad](https://github.com/dreamtelligence/Jura/blob/main/docs/next-step-answer-release.md)
ist inzwischen isoliert installiert: 21/21 HTTP-Suchverträge sowie tatsächliche
JSON-/SSE-Ausfallpfade ohne Textmodell-Zugangsdaten sind geprüft.
[Neuer Nachweis und Grenzen](research/2026-11-16-isolated-rollout.md).
Freie juristische Modellantworten und der Produktionswechsel sind damit nicht freigegeben.

## Wiederherstellung der Python-Engine

Der Jura-Kern wurde aus einem frischen GitHub-Klon und dem unabhängig
heruntergeladenen Index-Backup in einem neuen Volume mit neuem Modell-Image und
Testschlüsseln aufgebaut. **17.132 Punkte geprüft, 21/21 HTTP-Suchverträge und
kontrollierter Worker-Probe bestanden; Testressourcen anschließend entfernt.**
Der Lauf benötigte 8 Minuten 19 Sekunden ab Skriptstart, ohne vorausgehendes
Klonen und Herunterladen; dies ist kein SLA. Die drei produktiven Secret-Gruppen
sind zusätzlich verschlüsselt außerhalb von Modal gesichert und aus der neu
heruntergeladenen Datei wiederhergestellt worden. Die Originalwerte blieben
unverändert. [Nachweis und Grenzen](portfolio/recovery-drill-2026-11-11.json) ·
[Anleitung im privaten Jura-Repository](https://github.com/dreamtelligence/Jura/blob/main/docs/recovery.md).

Der Entschlüsselungsschlüssel liegt im lokalen macOS-Schlüsselbund; eine weitere
Offline-Kopie ist noch offen. Supabase-Datenbank, Auth, private Dateien und echte
Fallaufträge wurden bei diesem Jura-Test nicht wiederhergestellt. Die aktuelle
schnelle Python-Suite besteht 290 Tests.
