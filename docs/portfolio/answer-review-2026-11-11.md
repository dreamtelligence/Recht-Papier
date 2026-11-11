# Antwortprüfung vom 11.11.2026

Die technische und inhaltliche Vorprüfung bestätigt weiterhin **keine Freigabe
freier Modellantworten**. Geprüft wurden gespeicherte fiktive Gemini-Antworten
vom 10.11.2026, ihre bestätigten Falldaten und amtliche Normtexte. Das sind keine
neuen Antworten aus dem neuen Kandidatenindex und keine unabhängige anwaltliche
Prüfung. Es gab keine neuen bezahlten Modellaufrufe.

## Konkrete Befunde

| Fall | Tatsächliche Modellausgabe | Prüfung anhand von Fakten und Quellen |
| --- | --- | --- |
| `dev-10`, `dev-11`, `acc-01` zweimal | Unwirksamkeit, wenn die Kündigung **nicht sozial ungerechtfertigt** sei; jeweils mit passender Norm-ID. | Die Aussage kehrt die Voraussetzung in [§ 1 Abs. 1 KSchG](https://www.gesetze-im-internet.de/kschg/__1.html) um. Der allgemeine Kündigungsschutz setzt außerdem seinen Anwendungsbereich voraus. Vier echte Antworten enthalten den beobachteten Fehler. |
| `dev-10` | Kündigungsende 30.09.2026; Betriebszugehörigkeit angeblich unbekannt. | Bestätigt sind Beschäftigung seit 01.01.2006, Zugang am 31.08.2026 und ausschließlich gesetzliche Frist. Aus [§ 622 Abs. 2 Nr. 7 BGB](https://www.gesetze-im-internet.de/bgb/__622.html) folgt für diese bestätigte Konstellation eine siebenmonatige Frist zum Monatsende: 31.03.2027. Das im Schreiben genannte Ende ersetzt die Berechnung nicht. |
| `dev-11` | Konkretes Kündigungsende und konkrete Klagefrist. | Zugang und Beschäftigungsbeginn fehlen; das Fristregime ist unbekannt. Ein konkretes Ergebnis ist aus diesen Daten nicht ableitbar. Für [§ 4 KSchG](https://www.gesetze-im-internet.de/kschg/__4.html) ist insbesondere der Zugang der schriftlichen Kündigung erforderlich. |
| `dev-14` | Das spätere der widersprüchlichen Zugangsdaten sei maßgeblich; trotzdem werden konkrete Termine berechnet. | Beide Zugangsdaten sind als bestätigt hinterlegt. Der Widerspruch ist aufzuklären; weder die bloße Reihenfolge noch ein plausibler Termin entscheidet, welcher Sachverhalt zutrifft. Der kontrollierte Pfad berechnet bis zur Klärung keine Fristen. |
| `dev-15` | Unwirksamkeit wegen angeblich erfolgter unverzüglicher Zurückweisung sowie unterbliebener Betriebsratsanhörung. | Die fehlende Vollmachtsurkunde ist bestätigt; eine Zurückweisung ist nicht belegt. [§ 174 BGB](https://www.gesetze-im-internet.de/bgb/__174.html) enthält weitere Voraussetzungen und einen Ausschlusstatbestand. Die Falldaten bestätigen außerdem **keinen Betriebsrat**. Die behauptete unterbliebene Anhörung nach [§ 102 BetrVG](https://www.gesetze-im-internet.de/betrvg/__102.html) ist daher kein belegter Unwirksamkeitsgrund dieses Falls. |

Die Tabelle prüft diese Aussagen, nicht die Gesamtwirksamkeit realer Kündigungen.
Die zukünftigen Daten im Fall `acc-01` gehören zu einer ausdrücklich fiktiven
Regression; daraus wird keine Kenntnis zukünftiger Rechtsänderungen abgeleitet.

## Konkrete Verbesserung

Im Jura-Repository erkennt `src/retrieval/answer_audit.py` jetzt die tatsächlich
beobachtete sprachliche Umkehrung als schweren Befund
`reversed_kschg_social_justification`. Eine passende Quellen-ID kann diesen
Befund nicht aufheben. Regressionen prüfen den Originalfehler, korrekte positive
und negative Formulierungen sowie ein ausdrücklich verworfenes Gegenbeispiel.

Alle 17 gespeicherten Antworten mit gültiger Ausgabestruktur wurden erneut durch
diesen Guard geführt. Er erkennt die vier betroffenen Antworten aus drei Fällen.
Dazu wurden ausschließlich die vorhandenen strukturierten Quellen-IDs in
nummerierte Inline-Belege übersetzt; weder die ursprüngliche Aussage noch die
gespeicherten Antworten wurden geändert.

Dieser enge Guard ist keine allgemeine Prüfung juristischer Folgerichtigkeit.
Er erkennt nicht jede denkbare Umkehrung und prüft keine ungenannten Tatsachen.
Die Ergebnisse für Fristen, fehlende Daten und Widersprüche bleiben durch den
vorhandenen deterministischen Pfad abgesichert. `npm run eval:portfolio` wurde
erneut ausgeführt: **24 Referenzfälle, 40 Ausführungen, null Abweichungen**.

[Rohantworten](model-evaluation-run3/responses.jsonl) ·
[Prüfsummen, Guard-Auswertung und geprüfte Falldaten](answer-review-2026-11-11.json) ·
[Vorbereitete, weiterhin offene anwaltliche Abnahme](lawyer-review-brief.md)
