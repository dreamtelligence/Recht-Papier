# Recht & Papier: ein abgeschlossenes Portfolio-Projekt für Recruiter

## 1. Verbindliches Ziel

**Recruiter sollen innerhalb von zwei Minuten verstehen, was das Produkt leistet und welche technische Arbeit dahintersteht.**

Dieser Plan ersetzt die vorherige Fassung vollständig. Version 1.0 umfasst:

- Eine öffentlich zugängliche Browser-Demo ohne Anmeldung.
- Einen vollständigen nativen iPhone-Ablauf, dokumentiert mit nativen Screenshots.
- Einen verständlichen Beispielbericht mit nachvollziehbaren Quellen.
- Eine Architekturseite, reproduzierbare Tests und einen belegten Vorher-/Nachher-Vergleich.
- Einen klar abgegrenzten, funktionierenden Anwendungsfall: **ordentliche Arbeitgeberkündigung aus Arbeitnehmersicht**.

Ein echter Pilot ist **kein Umsetzungsschritt dieses Releases**. Seine Voraussetzungen erscheinen ausschließlich als Ausblick im README.

## 2. Produktumfang und Demo

### Der Zwei-Minuten-Weg

Die Browser-Demo bietet drei ausgewählte fiktive Fälle:

1. Einen ausreichend dokumentierten Fall mit nachvollziehbarer Einordnung.
2. Einen Fall mit fehlenden Angaben und gezielten Rückfragen.
3. Einen widersprüchlichen Fall, bei dem die Anwendung eine sichere Schlussfolgerung verweigert.

Der Ablauf lautet: **Fall auswählen → Dokument ansehen → extrahierte Angaben bestätigen → Prüfung nachvollziehen → Bericht herunterladen.**

Die Ergebnisse werden vor Veröffentlichung durch die echte Analysepipeline erzeugt und geprüft. Die öffentliche Demo zeigt diese gespeicherten Ergebnisse unmittelbar an und kennzeichnet sie als solche. Keine simulierte Live-Analyse, keine künstliche Warteanimation und keine persönlichen Uploads.

Der tatsächliche Backend-Ablauf bleibt über die native App, ein dokumentiertes Ende-zu-Ende-Beispiel und reproduzierbare Integrationsprüfungen nachweisbar. Ein öffentlicher Live-Modellzugang gehört nicht zu Version 1.0.

### Bericht und fachliche Grenzen

Der Bericht enthält:

- Anliegen, bestätigte Tatsachen und Chronologie.
- Belegstellen aus den fiktiven Dokumenten.
- Rechtliche Prüfpunkte und verwendete Quellen.
- Nachvollziehbare Fristberechnungen mit ihren Voraussetzungen.
- Fehlende Unterlagen und Fragen für ein anwaltliches Gespräch.

Unterstützt werden zunächst PDFs mit Textebene. Scans und andere Dateiformate erhalten eine verständliche Meldung; OCR wird als spätere Erweiterung dokumentiert.

Die öffentliche Seite erhält Impressum, Datenschutzerklärung und den sichtbaren Hinweis auf fiktive Fälle und fehlende Rechtsberatung. Es gibt keine pauschale Behauptung „anwaltlich validiert“.

## 3. Technische Arbeit mit begrenztem Umfang

**Expo/React Native, TypeScript, Supabase und die vorhandene Python-Engine bleiben erhalten.** Ein kompletter Stackwechsel und die zuvor geplante neue Serverinfrastruktur entfallen.

Umgesetzt werden nur die für den abgeschlossenen Fall notwendigen Verbesserungen:

- Den benötigten Rechtsbestand vollständig und versioniert neu aufbauen; verlorene XML-Textstellen und das Überspringen aktualisierter Dokumente beheben. Den bestehenden Live-Index erst nach Vergleich und Rückrollmöglichkeit ersetzen.
- Berechnungsrelevante Angaben typisieren, mit Belegstellen verknüpfen und bestätigen lassen. Bestehende Freitextangaben bleiben erhalten, werden aber nicht automatisch zu verlässlichen Berechnungsgrundlagen.
- Fristen im Code aus bestätigten Angaben und ausdrücklich unterstützten Regeln berechnen. Unklare Tarifregelungen, Zugangsdaten oder Sonderfälle führen zu offenen Prüfpunkten.
- Modellformulierungen gegen diese berechneten Werte prüfen. Ein Widerspruch darf nicht durch passende Quellenverweise freigegeben werden.
- Fakten, Berechnungen, juristische Aussagen und Unsicherheiten in einem versionierten Ergebnisformat trennen. TypeScript-Typen und serverseitige Validierung verwenden denselben Schnittstellenvertrag.
- Browser-Speicherung, Dokumentansicht und PDF-Download ergänzen. Der iPhone-Ablauf verwendet weiterhin den vorhandenen Backend-Pfad.
- Öffentliche Demo-Artefakte vollständig von privaten Fallakten und Zugangsdaten trennen.

Der Bericht wird aus dem strukturierten Ergebnis erzeugt. Modell- und Quellenprüfung heißen ausdrücklich **technische Prüfungen**; Nutzerbestätigung und anwaltliche Prüfung werden nicht miteinander vermischt.

## 4. Qualität, fachlicher Beitrag und Kosten

### Kleine, aussagekräftige Evaluation

Wir verwenden **24 fiktive Referenzfälle**: 16 Entwicklungsfälle und acht zurückgehaltene Abnahmefälle. Sie decken insbesondere Fristen, fehlende Vollmacht, unbekannte Betriebsratsanhörung, widersprüchliche Dokumente und fehlende Voraussetzungen ab.

Verglichen werden genau zwei Modelle:

- Das bisherige Qwen-Modell als Ausgangspunkt.
- Das vorhandene Gemini-Modell als Herausforderer (Nutzeränderung vom 10.11.2026; kein neuer Mistral-Zugang).

Beide erhalten dieselben Eingaben und Quellen. Die zurückgehaltenen Fälle werden jeweils dreimal geprüft. Veröffentlicht werden fachliche Fehler, unbelegte Aussagen, korrekt erkannte Unsicherheit, Latenz und tatsächliche Kosten. Kein Modellwechsel erfolgt stillschweigend.

Aktuelle Preise werden vor dem Benchmark nochmals geprüft; Entwicklungs- und Modelltests erhalten zunächst eine Ausgabengrenze von **25 €**. Die öffentliche Demo benötigt keine bezahlten Modellaufrufe pro Besucher. [Offizielle Gemini-Preise](https://ai.google.dev/gemini-api/docs/pricing) · [Modal-Preise](https://modal.com/pricing)

### Begrenzter Beitrag der Anwältin

Geplant ist ein klar umrissener Review:

- Drei repräsentative Fallauswertungen.
- Ein Beispielbericht.
- Die fachlichen Grenzen und besonders kritischen Annahmen.

Vorher wird ihr Fachgebiet geklärt. Dokumentiert wird ausschließlich, was sie tatsächlich geprüft hat. „Fachlich begleitet“ wird nur mit ihrer Zustimmung verwendet; eine Namensnennung benötigt eine gesonderte Zustimmung. Der technische Portfolio-Abschluss hängt nicht von einer umfassenden kostenlosen Begutachtung ab.

### Abnahmekriterien

- Keine falschen Berechnungen in den unterstützten Fristregeln.
- Keine erfundenen Quellen oder unbemerkten Widersprüche in den veröffentlichten Beispielen.
- Fehlerfälle zeigen nachvollziehbare Grenzen.
- Ein echtes Ende-zu-Ende-Beispiel läuft durch die Analyse bis zum PDF.
- Browser-Demo und native Darstellung werden visuell geprüft.
- Relevante Tests sind reproduzierbar; für einen grünen GitHub-CI-Nachweis muss die bestehende Abrechnungssperre behoben sein.

Ein Modell, das die Anforderungen nicht erfüllt, erhält keine Freigabe für freie juristische Schlussfolgerungen. Dann formuliert es ausschließlich kontrollierte Prüfergebnisse und offene Fragen.

## 5. Drei Meilensteine bis zum Release

| Meilenstein | Konkreter Abschluss |
|---|---|
| **1. Fachlichen Kern abschließen** | Vollständige Quellen, bestätigte Eingaben, getestete Fristlogik und Auswertung der 24 Referenzfälle. |
| **2. Produkt vorführbar machen** | Drei vollständige Browser-Beispiele, echter nativer Backend-Ablauf und sauberer PDF-Bericht. |
| **3. Portfolio veröffentlichen** | Demo-Link, native iPhone-Screenshots, Beispielbericht, Architekturseite, Testergebnisse und Release-Tag `v1.0.0`. |

Das README beginnt mit Demo, native Screenshots und Bericht. Danach folgen Architektur, eigene technische Beiträge und der Vorher-/Nachher-Nachweis: ursprünglicher Denkfehler → Regressionstest → Korrektur → nachgemessenes Ergebnis. Umfang und Grenzen stehen sichtbar daneben.

**Nicht gebaut werden:** Anwalt-Prüferportal, echter Pilot, Abrechnung, allgemeiner Rechtsassistent oder zusätzliche Rechtsgebiete. Datenschutz- und Betriebsanforderungen für echte Fälle werden im Ausblick benannt, aber nicht als bereits umgesetzt dargestellt.

**Offen bleibt:** Die fachliche Qualität muss die beschriebenen Prüfungen erst bestehen. Das Release belegt ein abgeschlossenes Portfolio-Produkt; es ist keine Freigabe für echte Rechtsberatung.
