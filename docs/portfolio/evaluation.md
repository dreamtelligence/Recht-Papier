# Evaluation: kontrollierter Kern und Modellversuch

Stand 10.11.2026. Korpusversion `termination-2026-11-10-e1a8f4ba0853`. Die Referenzfälle sind fiktiv und wurden im Projekt erstellt. Die Ergebnisse sind keine anwaltliche Validierung.

## Unterstützte Regeln

16 Entwicklungsfälle und acht getrennte Abnahmefälle prüfen Beschäftigungsstaffeln, Monatsenden, gerichtliche Wochenend-/Feiertagsverschiebungen, fehlende Angaben, Vollmacht, unbekannte Betriebsratsanhörung und widersprüchliche Dokumente. Die Abnahmefälle laufen je dreimal gegen unveränderte Regeln.

**24 Fälle, 40 Ausführungen, keine Referenzabweichung.** [Nachweis](deterministic-evaluation.json). Zusätzliche Entwicklungstests prüfen gefälschte Belegstellen, unbestätigte Angaben, fehlende Quellen, nicht unterstützte Versionen, ungültige Kalendertage und die Trennung zwischen Quellenprüfung und Berechnung. Zurückhalten ersetzt keinen unabhängigen anwaltlichen Goldstandard.

## Genau zwei vorhandene Modelle

Auf ausdrücklichen Nutzerwunsch ersetzt **gemini-2.5-flash-lite** den geplanten neuen Mistral-Zugang. Ausgangspunkt bleibt **Qwen/Qwen3.8-27B-FP8** über den bestehenden Modal-Endpunkt. Kein Anbieterwechsel im Produktpfad.

Beide erhalten denselben Prompt einschließlich derselben bestätigten Fakten und vollständigen Normtexte; Prompt-Hashes sind protokolliert. Erwartungswerte stehen nur im Auswerter. Temperatur 0,2, maximal 1.024 Ausgabetoken, ein Auftrag gleichzeitig. Geplant: 16 Entwicklungsfälle einmal sowie acht Abnahmefälle dreimal pro Modell, insgesamt 80 logische Läufe. Der Aufrufvertrag ist eng: Berechnungen, belegte Aussagen und Unsicherheiten als JSON.

Ausgabe, Tokenverbrauch, Latenz, Transportfehler und Blockierung nach wiederholtem Dienstausfall werden getrennt gespeichert. Ein vorhandener Quellenbezeichner beweist keine inhaltliche Deckung. Sichtbare juristische Aussagen wurden zusätzlich gelesen.

## Tatsächlich beobachtet

| Messung | Qwen | Gemini |
| --- | --- | --- |
| Auswertbare Antworten im vereinbarten Format | 0 / 40 geplant | 17 / 40 geplant |
| Dienstausfälle / Formatfehler | 3 Zeitlimits; EU-L40S-Kapazitätsmangel in Modal-Logs | 1 ungültiges JSON, 1 HTTP 503, 3 HTTP 429 |
| Nach Fehlergrenze nicht weiter aufgerufen | 37 | 18 |
| Antworten mit abweichendem Termin | nicht messbar | 15 / 17; insgesamt 19 Datumsabweichungen |
| Antworten mit unbekannter Quellen-ID | nicht messbar | 1 (`facts`) |
| Berechnungen ohne Normquelle | nicht messbar | 5 |
| Geprüfte Fälle ohne sichere Berechnungsgrundlage | nicht messbar | 0 / 3 Unsicherheiten korrekt bewahrt |
| Median tatsächlicher Anfragezeit | ca. 180 s bis Zeitlimit, keine Antwortlatenz | ca. 2,04 s, einschließlich tatsächlich versuchter Fehleranfragen |
| Freie juristische Schlussfolgerungen freigegeben | nein | nein |

Die Teilmenge ist durch Kapazität und Quote verzerrt. **Der vollständige Vergleich und die dreifache Abnahme beider Modelle sind nicht abgeschlossen. Es gibt keine Modellrangliste.** Transportausfälle werden nicht als fachliche Qwen-Fehler gezählt. Nach drei Providerfehlern wurde nicht weiter aufgerufen.

Bei manueller Durchsicht der zurückgegebenen Texte fiel insbesondere auf:

- Gemini kehrt in `dev-10`, `dev-11` und `acc-01` die Aussage zu § 1 KSchG sprachlich um: Unwirksamkeit, wenn die Kündigung **nicht** sozial ungerechtfertigt sei.
- `dev-15` erfindet eine sofortige Zurückweisung und eine unterlassene Betriebsratsanhörung. Beides ist nicht belegt.
- `dev-14` löst widersprüchliche Zugangstage eigenständig zugunsten eines späteren Tages auf und berechnet Termine.
- `dev-03` nennt die Schriftform unbekannt, obwohl der Erhalt eines schriftlichen Originals bestätigt wurde.

Die Produktpipeline verwendet deshalb kontrollierte Prüfpunkte, Code-Berechnungen und offene Fragen. Freie Modelltexte erhalten auch mit formal passenden Quellen keine Freigabe.

## Kosten: Messwert und Rechnung getrennt

Ausgabengrenze **25 €**, konservative Reservierung des Laufs **23,67 €**. Preise vor Beginn anhand der [Modal-Preise](https://modal.com/pricing) und [offiziellen Gemini-Preise](https://ai.google.dev/gemini-api/docs/pricing) geprüft. Es wurden vorhandene Konten verwendet und keine GPUs/Regionen als Ausweichroute eingerichtet.

Der gefilterte Modal-Verbrauchsbericht meldete zum dokumentierten Abruf **0,22966928 USD gemessenen Verbrauch** für den bestehenden Qwen-Dienst und die Evaluation seit 11:53 UTC. Er enthält insbesondere den anfänglichen Modell-Kaltstart; spätere Kapazitätsfehler lieferten keine Modellantwort. Stündliche Buchungen können verzögert eintreffen. Der Betrag ist **keine endgültige Rechnung**, kein auf Euro umgerechneter Gesamtpreis und keine vollständige Kostenzusage.

Aus zurückgegebenen Gemini-Tokenzahlen ergeben sich **0,0133723 USD Listenpreis-Schätzung**. Das ist kein tatsächlich abgerechneter Betrag: Freikontingent, Guthaben, Rechnungszuordnung und Steuern wurden nicht abgeglichen. Gemini-Rechnung und abschließender Modal-Abgleich bleiben offen. Es wird kein vollständiger Ist-Kosten-Benchmark behauptet. Die öffentliche Demo benötigt pro Besucher keine bezahlten Modellaufrufe.

[Verbrauchsmessung](cost-metering.json) · [Modellmetriken](model-evaluation-summary.json) · [Rohantworten und Fehler](model-evaluation-run3/responses.jsonl) · [Laufmanifest](model-evaluation-run3/manifest.json)

Die zwei vorherigen Laufverzeichnisse dokumentieren verworfene Starts des Messwerkzeugs. Ein anfänglicher falscher POST nach Modal-303 wurde korrigiert; der endgültige Auswerter zählt pro Fall/Modell/Wiederholung den letzten Versuch. 81 Transportdatensätze ergeben 80 logische Einträge, darunter explizit nicht ausgeführte Aufrufe. Sie sind nicht 80 erfolgreiche Modellantworten.

## Reproduktion

```sh
npm run eval:portfolio
python3 scripts/summarize-model-evaluation.py docs/portfolio/model-evaluation-run3/responses.jsonl
```

Der Modellaufruf liegt im separaten Jura-Repository in `modal_portfolio_eval.py`. Er benötigt Modal-Secrets, tatsächliche Kapazität und Providerquote; ein erneuter Lauf ist kostenpflichtig. Der vorliegende Fehlernachweis rechtfertigt keinen automatischen weiteren Verbrauch. Das fachliche Reviewpaket ist in [lawyer-review-brief.md](lawyer-review-brief.md) vorbereitet, aber nicht bestätigt oder durchgeführt.
