# Kanzleiabläufe und Marktvergleich: vom Erstkontakt zur prüfbaren Arbeitsmappe

Recherchestand: **16. November 2026**. Verantwortlich: Recherche im Rahmen des
Recht-&-Papier-Systemaudits. Gegenstand sind öffentlich zugängliche
Herstellerdokumentationen und Primärquellen; keine Produktkonten wurden eröffnet,
keine Anbieter kontaktiert und keine vertraulichen Mandatsdaten übertragen.

## Ergebnis

Der wirtschaftlich interessante Arbeitsgegenstand ist eine **vollständige,
belegte und weiterbearbeitbare Fallvorbereitung**. Die wesentlichen Muster der
untersuchten Systeme sind strukturierte Mandatsaufnahme, Dokumentensammlung,
aktenbezogene Informationsgewinnung, wiederverwendbare Vorlagen und die Übergabe
in die bestehende Arbeitsumgebung. Die Kanzlei soll weniger suchen, nachfragen
und übertragen müssen. Sie muss Tatsachen, Rechtsausführungen, Quellen und
Strategie weiterhin eigenverantwortlich prüfen.

Das Nutzerziel „nur noch Punkte prüfen und unterschreiben“ lässt sich deshalb
als Produktziel so konkretisieren: **Die Kanzlei erhält eine revisionsgebundene
Prüfmappe mit Originalbelegen, offenen Fragen, berechneten Vorschlägen und einem
bearbeitbaren Entwurf.** Ein automatischer Status „rechtlich korrekt“ oder eine
stille anwaltliche Freigabe wird daraus nicht abgeleitet.

Die folgende Planung ist eine Empfehlung. Sie ist keine Beschreibung bereits
implementierter Funktionen und kein Nachweis einer Zeitersparnis. Der heute
verbindliche Recht-&-Papier-Umfang bleibt laut [Agent Guide](../../AGENTS.md)
und [Architektur](../architecture.md) der kontrollierte Arbeitnehmer-Kündigungsfall;
öffentliche Fallstudie, native private App und allgemeine LEX-Engine haben
unterschiedliche Freigabegrenzen. Der separate
[App-/Fallaktenaudit](2026-11-16-app-casefile-audit.md) und der
[Engineaudit](https://github.com/dreamtelligence/Jura/blob/main/docs/research/2026-11-16-engine-audit.md)
bewerten die tatsächliche Implementierung.

## Recherchequalität und Grenzen

- **Dokumentierter Ablauf:** Hilfe-/Produktdokumentation beschreibt eine konkrete
  Bedienhandlung. Das ist ein besserer Funktionsbeleg als ein Werbeslogan, bleibt
  aber eine Herstellerangabe und wurde hier nicht in einem bezahlten Konto getestet.
- **Produktversprechen:** Leistungs-/Marketingseiten belegen, was der Hersteller
  anbietet oder ankündigt. Sie beweisen keine juristische Richtigkeit,
  Sicherheitszertifizierung oder Zeitersparnis im Recht-&-Papier-Anwendungsfall.
- **Eigene Ableitung:** Anforderungen, Reihenfolge und Abnahmekriterien unten sind
  aus dem Vergleich abgeleitete Vorschläge. Es sind keine Nutzerinterviews oder
  unabhängigen Wirksamkeitsmessungen.
- Suchergebnisse dienten zur Quellensuche. Die nachstehend verwendeten Seiten
  wurden geöffnet und inhaltlich gelesen. Den aktuellen BRAK-Leitfaden habe ich
  nach einem Abruffehler des Webwerkzeugs direkt vom offiziellen PDF-Endpunkt
  heruntergeladen und als Text gelesen, insbesondere Abschnitte 2 bis 4.
- Es wurde keine Aussage aus einer bloßen Suchtrefferüberschrift als geprüfte
  Produktfunktion übernommen. Preise, Marktanteile und Modellranglisten wurden
  nicht untersucht, weil sie dieses Arbeitspaket nicht entscheiden.

## Vergleich von elf relevanten Angeboten

| Angebot / Kategorie | Dokumentiertes oder angebotenes Muster | Übertragbarer Nutzen für Recht & Papier | Grenze des Nachweises |
| --- | --- | --- | --- |
| **JUPUS – Aufnahme** | Digitale Fragebögen, Dokumentenupload, Vorlagen für Vollmacht und Vergütungsvereinbarung sowie geräteübergreifende Signatur werden im Helpdesk beschrieben. [S1] | Rechtsgebietsspezifisches Aufnahme-Paket, fehlende Angaben gezielt sammeln, Antworten ohne erneutes Abtippen übernehmen. | Signatur im Aufnahmeprozess ist kein Beleg für formwirksame gerichtliche Einreichung. |
| **Actaport + JUPUS – Übergabe** | Actaport beschreibt die Übernahme gesammelter Daten und Dokumente nach Mandatsannahme in eine neue Akte; zudem werden KI-Entwürfe als Vorbereitung eingeordnet. [S2] | Ein abgestimmtes Übergabeformat ist nützlicher als eine zweite isolierte Akte. | Konkrete Integrationsfunktionen sind herstellerseitig beschrieben; API-Zugang, Rechte und tatsächliche Datenfelder wurden nicht getestet. |
| **Legalvisio – Organisation/DMS** | Die FAQ beschreibt aktenbezogene Kommunikation, Office-Anbindung, Versionierung und Aufgaben zur Prüfung oder Gegenzeichnung. [S3] | Dokument, verantwortliche Person, Arbeitsauftrag und Bearbeitungsstand zusammenführen. | Das Mandantenportal wird in derselben FAQ als zukünftiges Zusatzangebot bezeichnet; deshalb hier nicht als verfügbare Funktion gewertet. |
| **DATEV Anwalt classic – Kontrollabläufe** | Das Onboarding unterscheidet Fristerfassung, Bestätigung, Abvermerk, Erledigung und Überwachung. Die Produktinformation nennt Kollisionsprüfung und ein elektronisches Postbuch. [S4, S5] | Ein Fristvorschlag braucht einen bestätigenden Menschen und einen Lebenszyklus. Beteiligtenprüfung und Eingangsnachweis gehören vor die finale Bearbeitung. | Softwareunterstützung beweist keine korrekte Frist im Einzelfall. Die Produktinformation trägt den Stand 01.05.2025; die Funktionen wurden mit dem aktuellen Onboarding abgeglichen. |
| **RA-MICRO KI Widget – Aktenkontext** | Herstellerseite: dokumentenübergreifende Aktenanalyse, Quellenverweise und Weiterverarbeitung von Entwürfen in E-Akte, Word, PDF oder E-Mail. [S6] | Originalakte als Kontext erhalten und ein Ergebnis in den vorhandenen Kanzleiablauf zurückgeben. | Quellenanzahl und Qualitätsaussagen sind Werbung, kein unabhängiger Genauigkeitsbenchmark. |
| **AnNoText – Fallbearbeitung** | Hersteller beschreibt Quellenverlinkung aus Dokumenten, Dokumentvergleich und Einbindung in die Akte. [S7] | Quellenprüfung und Vergleich gehören in die Dokumentenarbeit, nicht in eine davon getrennte Chat-Unterhaltung. | Die Abschnitte zur digitalen Mandatsaufnahme und zu KYC stehen als **Ankündigung** mit älterem Q4/2025-Hinweis auf der Seite. Aktuelle Auslieferung daraus nicht ableiten. |
| **Beck-Noxtua – Quellen/Entwurf** | Produktseite beschreibt anklickbare Dokumentfundstellen mit markierter Passage, Änderungen mit Begründung sowie Annahme/Ablehnung und Export. [S8] | Von einer rechtlichen Aussage direkt zum verwendeten Beleg springen; Entwurfsänderungen einzeln beurteilen. | Geschlossener Fachbestand ist nicht automatisch allgemein verfügbar oder für eigene Indexierung lizenziert. Rechtsrichtigkeit der Werbung wurde nicht unabhängig geprüft. |
| **Legora – Review/Word** | Tabellarische Dokumentprüfung mit Review-Status, Zellsperren und Zusammenarbeit; Word-Erweiterung mit Vorlagen und Änderungsprüfung. [S9, S10] | Prüfmatrix mit Zuständigkeit, Bearbeitungsstatus und Bearbeitung im vertrauten Dokumentformat. | International ausgerichtetes Angebot; keine Aussage, dass deutsche Fristen oder deutsche Gerichtsformate in unserem Fall korrekt abgedeckt wären. |
| **Harvey – aufgabenspezifische Werkzeuge** | Hilfe beschreibt strukturierte Review-Tabellen und gespeicherte Arbeitsabläufe; sie nennt ausdrücklich Grenzen bei Rechenaufgaben und Widerspruchserkennung in Threads. [S11] | Extraktion, Quellenprüfung, Berechnung und Widerspruchsprüfung als getrennte prüfbare Aufgaben behandeln. | Ein allgemeiner Chat beantwortet nicht automatisch die Frage, ob zwei Dokumente einander widersprechen. Eigene Testfälle sind nötig. |
| **advocado – Verbraucherübergabe** | Ablauf: Anliegen schildern, telefonische Ersteinschätzung durch einen Partneranwalt, anschließend gegebenenfalls ein gesondertes Angebot und Beauftragung. [S14] | Orientierung, Kostenangebot und Auftrag als unterschiedliche Schritte zeigen; klar benennen, wer reagiert. | Die beworbene kostenlose Ersteinschätzung und Rückmeldezeit gelten mit Bedingungen; keine 24/7-Bearbeitungszusage daraus ableiten. |
| **Flightright – enger Verbraucherprozess** | FAQ: fallbezogene Fragen, sichtbare Vergütung vor Beauftragung, Nachreichung von Dokumenten und Statusportal. [S15] | Wenige verständliche Fragen für einen bestimmten Falltyp, kontrolliertes Nachreichen und nachvollziehbarer Bearbeitungsstand. | Der Portalcheck und eine Nichtbearbeitung sind keine verbindliche Aussage, dass ein Anspruch besteht oder nicht besteht. Das Erfolgsmodell ist keine allgemeine kostenlose anwaltliche Vertretung. |

**Nicht übernehmen:** beworbene Einsparungen wie „53 %“, „85 %“ oder „90 %“.
Es fehlt ein vergleichbarer, unabhängig geprüfter Ablauf für unseren Umfang.
Auch „DSGVO-konform“ auf einer Produktseite ersetzt nicht die Prüfung des eigenen
Datenflusses und der konkreten Anbietervereinbarungen.

## Was einer Kanzlei tatsächlich Arbeit abnimmt

Die folgende Prozesskette ist eine **eigene Synthese** aus den dokumentierten
Mustern. Sie beschreibt einen vorgeschlagenen Zielablauf für einen eng begrenzten
Falltyp, keine vollständige Kanzleiverwaltung.

| Schritt | Vorzubereitende Arbeit | Menschliche Entscheidung / Kontrolle | Konkreter Abnahmenachweis |
| --- | --- | --- | --- |
| 1. Dringlichkeit erkennen | Zugang, Ereignisdatum, laufende Schreiben und gewünschtes Ziel früh erfragen; drohende Frist sichtbar machen. | Welche Frist gilt und welche sofortige Handlung nötig ist. | Unbekanntes Zugangsdatum wird nicht durch Upload- oder Dokumentdatum ersetzt; dringende Fälle landen nicht unbemerkt in einer normalen Warteschlange. |
| 2. Beteiligte erfassen | Namen, Rollen, Unternehmen, Gegenpartei und vorhandene Aktennummern strukturiert sammeln. | Kanzlei prüft Interessenkollision und Annahme. | Alias-/Namensvarianten werden als Kandidaten gezeigt; „kein Treffer“ bei unvollständigen Daten ist keine Bestätigung „kollisionsfrei“. |
| 3. Auftrag abgrenzen | Gewünschte Hilfe, Vertretungsumfang, Unterlagen und gegebenenfalls Vollmacht zusammenstellen. | Mandat, Vollmacht, Vergütung und Leistungsumfang akzeptieren. | Anfrage, angenommenes Mandat und konkrete Freigabe sind unterschiedliche Zustände; Upload allein bewirkt keinen Auftrag. |
| 4. Unterlagen vollständig sammeln | Dokumenttypen erkennen, Dubletten vorschlagen, fehlende Seiten oder erforderliche Dokumente auflisten. | Unterlagen auf Echtheit, Relevanz und Vollständigkeit beurteilen. | Fehlende Rückseite, unlesbarer Scan und widersprüchliche Vertragsversion verhindern eine stillschweigende Vollständigkeitsanzeige. |
| 5. Fakten und Zeitachse bilden | Ereignisse, Beträge und Beteiligte mit Dokument-/Seitenbeleg als Vorschlag bereitstellen. | Tatsachenbehauptung, Dokumentinhalt und bestrittenen Sachverhalt auseinanderhalten. | Zwei widersprechende Zugangsangaben bleiben nebeneinander sichtbar; Bestätigung eines Werts löscht den Gegenbeleg nicht. |
| 6. Rückfragen bündeln | Nur entscheidungsrelevante Lücken in eine priorisierte Rückfragenliste überführen. | Kanzlei entscheidet, welche Frage tatsächlich gestellt wird. | Keine wiederholte Frage nach bereits belegtem Fakt; jede Frage benennt den betroffenen Prüfschritt und akzeptiert „weiß ich nicht“. |
| 7. Rechtsfragen vorbereiten | Für jeden unterstützten Prüfpunkt Voraussetzungen, Quellen, Ergebnisvorschlag und Ungewissheit nebeneinanderstellen. | Rechtliche Einordnung, Anwendbarkeit, Argumentation und Strategie prüfen. | Ein formal passendes Zitat ohne passende Aussage erhält keinen Freigabestatus; fehlende Voraussetzung bleibt offen. |
| 8. Entwurf vorbereiten | Kanzleivorlage mit belegten Daten, geordneten Anlagen und kenntlich gemachten offenen Stellen befüllen. | Gesamten Text, Anträge, Adressat, Form und Risiken beurteilen. | Keine erfundenen Tatsachen oder Aktenzeichen; jeder sachverhaltsbezogene Absatz ist zu seinen Grundlagen zurückverfolgbar. |
| 9. Prüfen und freigeben | Änderungen, Verantwortliche und erledigte Prüfpunkte nachvollziehbar anzeigen. | Verantwortlicher Anwalt prüft und gibt eine konkrete Fassung frei. | Dokumentänderung nach Freigabe setzt die Freigabe zurück; eine alte Analyse kann einen neuen Entwurf nicht freigeben. |
| 10. Übergeben und nachverfolgen | Bearbeitbare Datei, Quellen-/Anlagenverzeichnis und Prüfvermerk exportieren. | Signatur, Versandweg, Empfänger und Zugang kontrollieren. | Export, Signatur, Versand und gerichtlicher Eingang haben getrennte Status; eine heruntergeladene PDF ist keine eingereichte Klage. |

Die größte kurzfristig prüfbare Entlastung liegt voraussichtlich in Schritten
4–6 und der belegten Übergabe in 8–10. Diese Erwartung muss mit echten
Bearbeitungszeiten validiert werden. Mandatsgewinnung, Buchhaltung, Telefon-KI
und ein eigener beA-Client würden viele zusätzliche Produkt- und Betriebsgrenzen
eröffnen; sie sind keine Voraussetzung für diesen ersten vollständigen Ablauf.

## Die vorgeschlagene anwaltliche Prüfmappe

Ein Chatverlauf sollte eine Ansicht auf dieselbe Fallakte sein. Das zentrale
Arbeitsprodukt ist eine kompakte Mappe, die sich am dokumentierten
Fallaktenvertrag orientiert. Bestehende bestätigte Fakten, Eingaberevisionen,
Originaldokumente und deterministische Berechnungen werden wiederverwendet;
neue parallele Datenwahrheiten würden zusätzlichen Abgleich erzeugen.

### Inhalt der Mappe

1. **Deckblatt:** Mandats-/Anfragestatus, gewünschtes Ziel, Beteiligte, verantwortliche
   Person, Prüfstand und Zeitpunkt. Dringlichkeit und unbekannte Angaben sind
   sofort sichtbar. Ein Ampelsymbol enthält immer auch einen Klartextstatus.
2. **Dokumentenverzeichnis:** Originalname, Dokumenttyp, Datum, Version, Seiten,
   Verarbeitungsstatus und Prüfsumme. Original und nachbearbeitete OCR-Fassung
   bleiben unterscheidbar; spätere Verarbeitung ersetzt das Original nicht.
3. **Belegte Zeitachse:** Ereignis, behauptendes Subjekt, Datum/Unsicherheit,
   Dokument, Seite und wörtlicher Ausschnitt. „Nicht angegeben“ wird nicht als
   „nein“ interpretiert.
4. **Prüftabelle:** Prüffrage, Voraussetzungen, Quellen und Geltungsstand,
   Ergebnisvorschlag, Gegenargument, offene Frage, fachlicher Prüfer und Entscheidung.
5. **Entwurf mit Anlagen:** Bearbeitbare Fassung und geordnete Anlagen, verknüpft
   mit genau der geprüften Eingaberevision. Im Arbeitsentwurf sind Unsicherheiten
   sichtbar; vor einer freigegebenen Ausgangsfassung müssen sie fachlich entschieden
   oder zulässig behandelt worden sein.
6. **Freigabevermerk:** Wer welche Fassung wann geprüft hat; geänderte Stellen;
   noch offene Bedingungen; Export-/Versandstatus. Ein Modellurteil kann keine
   menschliche Unterschrift und keine Versandbestätigung erzeugen.

### Beispiel für den bestehenden Kündigungsfokus

| Prüffrage | Was die Mappe vorbereitet | Was vor einer gesicherten Aussage geklärt sein muss |
| --- | --- | --- |
| Wann ging die Kündigung zu? | Zwei Dokumentbelege und Mandantenangabe gegebenenfalls als Widerspruch anzeigen. | Tatsächlicher Zugang; Dokumentdatum und Uploadzeit reichen nicht. |
| Welcher gesetzliche Vergleichstermin ist berechenbar? | Unterstützte deterministische Regel mit Eingabewerten und Rechenweg. | Beschäftigungsbeginn, Zugang, relevante Vertrags-/Tarifregeln und Grenzen des unterstützten Modells. |
| Ist eine Klagefrist zu beachten? | Vorschlag aus bestätigten Daten, mit Kalender-/Zuständigkeitsgrenze. | Gericht, anwendbare Regel, Zugang und besondere Fallumstände; keine Verallgemeinerung des NRW-Kalenders. |
| Liegt eine Vollmachtsfrage vor? | Quelle und Voraussetzungen als offenen Prüfpunkt darstellen. | Tatsächliche Unterzeichnung/Vertretung, Bevollmächtigung und mögliche Ausnahmen. |
| Welche Unterlagen fehlen? | Kündigung, Vertrag/Nachträge und verfügbare Nachweise als Liste. | Nicht vorhandene Unterlagen bedeuten nicht, dass ein gesetzlich erforderlicher Vorgang nicht stattgefunden hat. |

Dies erweitert die bestehende enge Berechnung nicht automatisch zu einer
allgemeinen Wirksamkeitsprüfung. Die Tabelle ist eine Darstellungs- und
Arbeitsanforderung für die anwaltliche Prüfung, keine neue fachliche Regel.

## Endverbrauchersicht: vor der Kanzleiübergabe

### Gelesene Verbrauchermodelle und daraus abgeleitete Prioritäten

**advocado:** Die Ablaufseite trennt die Anfrage von einer anwaltlichen
Ersteinschätzung und dem anschließenden Leistungs-/Kostenangebot. Die beworbene
Rückmeldung innerhalb von zwei Stunden ist im Seitenfuß auf erfolgreiche
Weiterleitung an einen Partneranwalt und Werktage außer Samstag, 9–18 Uhr,
eingeschränkt. Die eigentliche Beauftragung folgt erst nach dem Angebot. Das ist
ein Herstellerablauf, kein getestetes Service-Level. [S14]

**Flightright:** Die FAQ beschreibt einen strukturierten Eingabeprozess und
benötigte bzw. gegebenenfalls später nachgeforderte Buchungsunterlagen. Dokumente
können bei der Eingabe oder im Portal ergänzt werden. Vergütung und gegebenenfalls
Anwaltszuschlag werden vor Beauftragung angezeigt; Neuigkeiten kommen per E-Mail
und Statusportal. Eine feste Gesamtdauer wird ausdrücklich nicht zugesagt.
Eine negative automatische Vorprüfung bedeutet zunächst nur Nichtbearbeitung
durch das Portal, nicht den verbindlichen Ausschluss eines Anspruchs. [S15]

**Eigene Ableitung für Recht & Papier, in dieser Reihenfolge:**

1. **Fristentriage vor Warteversprechen:** Zugang und relevante Ereignisse früh
   erfragen. Für unklare oder nahe Fristen einen menschlichen Ausweichweg zeigen;
   die Anzeige „Anfrage versandt“ darf keinen Fristenschutz suggerieren.
2. **Zustände und Empfänger:** Vor dem Senden anzeigen, welche konkrete Kanzlei
   welche Angaben bekommt. Eingang technisch bestätigen; anwaltliche Annahme
   erst nach tatsächlicher Erklärung dieser Kanzlei zeigen.
3. **Preis und Umfang vor Auftrag:** Orientierung, vorbereiteter Bericht und
   anwaltliche Vertretung verständlich unterscheiden. Ein konkretes Angebot
   muss Umfang, Kosten und mögliche Bedingungen zeigen; keine allgemeine
   Gratis- oder Rechtsschutzdeckungszusage aus einem Plattformvergleich übernehmen.
4. **Gezieltes Nachreichen:** Offene Dokumente/Antworten einzeln auflisten und
   ihren Eingang sichtbar bestätigen. Neue Angaben ändern die Eingaberevision
   und gegebenenfalls den Prüfstand; sie verschwinden nicht in einer freien Nachricht.
5. **Belastbare Reaktionserwartung:** Wer bearbeitet die Anfrage, in welchen Zeiten,
   wann ist die nächste Rückmeldung vorgesehen und was geschieht bei Überschreitung?
   Nur vereinbarte und operativ nachgewiesene Zeiten zusagen. Eine Prognose ist
   von einer bindenden Zusage zu unterscheiden.

Legalbird wurde ergänzend angefragt, aber die direkt geöffneten Seiten lieferten
dem Abrufwerkzeug nur eine JavaScript-Aktivierungsaufforderung. Suchauszüge
reichen hier nicht für eine zusätzliche vollständig gelesene Produktbewertung;
Legalbird ist deshalb nicht in den elf Angeboten oder im Quellenregister gezählt.

Diese Anforderungen sind Produktvorschläge für eine spätere operative Aufnahme:

- **Sofort verständliche nächste Handlung:** „Welches Schreiben hast du erhalten?“,
  „Wann hast du es tatsächlich erhalten?“, „Was möchtest du erreichen?“ Der Nutzer
  muss keine juristische Anspruchsgrundlage auswählen.
- **Früher Rettungsweg:** Bei naher/unklarer Frist oder nicht unterstütztem Fall
  muss ein verständlicher Hinweis zur zeitnahen menschlichen Hilfe sichtbar sein.
  Ein langer Chat darf keine sichere Bearbeitung suggerieren.
- **Dokumentenverarbeitung sichtbar:** Nicht nur „hochgeladen“, sondern
  „gespeichert“, „Text lesbar“, „Angaben vorgeschlagen“, „von dir bestätigt“.
  Unlesbare Fotos oder fehlende Seiten führen zu einem konkreten nächsten Schritt.
- **Bestätigung mit Kontext:** Originalpassage neben vorgeschlagenem Fakt anzeigen;
  Korrektur und „weiß ich nicht“ ermöglichen. Zustimmung ist keine Erklärung,
  alle rechtlichen Folgen verstanden zu haben.
- **Klarer Übergabestatus:** „Anfrage erstellt“, „von Kanzlei erhalten“, „angenommen“
  und „wird bearbeitet“ auseinanderhalten. Eine Anbieter-/Kanzleizusage darf erst
  erscheinen, wenn die konkrete Bestätigung tatsächlich vorliegt.
- **Kein doppeltes Erzählen:** Bereits strukturierte Angaben und Originale gemeinsam
  übertragen; Kanzlei kann Ergänzungen gezielt anfordern. Ein freier Chat allein
  macht das Paket nicht vollständig.
- **Privatsphäre als Bedienhandlung:** Empfänger und übertragener Umfang vor der
  Übergabe zeigen, Fehlzuordnungen korrigierbar machen und Löschung/Export
  verständlich anbieten. Weitergabe benötigt eine nachvollziehbare Berechtigung.

## Grenzen von „nur noch unterschreiben“

Der aktuelle [BRAK-Leitfaden, Stand Oktober 2026][S12], wurde im November 2026
neu veröffentlicht. Er verlangt eigenverantwortliche anwaltliche Endkontrolle;
insbesondere sollen KI-Inhalte und Quellen umfassend geprüft werden, nicht nur
stichprobenartig. Er behandelt außerdem Verschwiegenheit, die sorgfältige Auswahl
von Dienstleistern und vertragliche Schutzvorkehrungen. **Produktfolgerung:**
Recht & Papier muss Kontrolle ermöglichen und Prüfaufwand verkürzen; es darf sie
nicht durch eine Vertrauensampel ersetzen. Konkrete Zulässigkeit, Verträge und
Verarbeitung bleiben vor echtem Kanzleibetrieb fachlich zu prüfen.

Für gerichtliche Dokumente erläutert der [beA-Support im Auftrag der BRAK][S13]
unterschiedliche Signatur-/Versandwege: Bei einfacher Signatur muss grundsätzlich
die verantwortende anwaltliche Person selbst über den sicheren Weg versenden;
bei arbeitsteiliger Versendung ist die qualifizierte elektronische Signatur
relevant. **Produktfolgerung:** Formular-eSignatur, anwaltliche Freigabe und
beA-Einreichung sind verschiedene Schritte. Ein Klick im eigenen System belegt
keinen formwirksamen Versand und keinen Eingang.

Die technische Ausgestaltung sollte deshalb zunächst bei einem kontrollierten
Export enden. Eine spätere beA-/DMS-Integration benötigt eine gesonderte,
versionspassende technische und rechtliche Prüfung. Der Versandnachweis muss
auch dann aus dem tatsächlich verwendeten Kanal stammen.

## Sinnvolle Umsetzungsreihenfolge

Die folgenden Pakete sind **vorgeschlagen**, nicht in diesem Recherchelauf gebaut:

| Priorität | Abgegrenztes Paket | Fertig, wenn … |
| --- | --- | --- |
| **P0** | Einheitliche technische Antwortfreigabe in allen allgemeinen Engine-Pfaden. | Fehlender/schwerer Auditbefund kann weder JSON-Ausgabe noch Streaming oder Fallback passieren; der kontrollierte Pfad bleibt erhalten. Details im Engineaudit. |
| **P0** | Verbindliche Zuordnung von Original, Fakt, Analyse und Dokumentfassung. | Eine geänderte Eingabe oder neues Dokument eine frühere Freigabe nicht unbemerkt weiterverwendet. |
| **P1** | Ein vollständiges Aufnahme- und Rückfragenpaket für den bestehenden Falltyp. | Unbekannte/strittige Angaben klar bleiben; Nutzer eine fehlende Unterlage oder Antwort gezielt nachreichen kann. |
| **P1** | Kanzlei-Prüfmappe und Review-Status. | Jeder entscheidende Fakt zum Beleg und jede rechtliche Passage zur tatsächlich verwendeten Quelle führt; Zuständigkeit, Entscheidung und offene Frage dokumentiert werden. |
| **P1** | Bearbeitbarer Entwurf und geordnete Übergabe. | Ein Anwalt den Text ohne Abtippen bearbeiten kann; Anlagen, Fassungen und Prüfstand zusammenpassen; keine automatische Einreichung behauptet wird. |
| **P2** | Ein echter Adapter in die von einer Testkanzlei genutzte Software. | Feldabbildung, Rechte, Fehlerfälle, Dubletten und sichere Wiederholung mit einem vereinbarten Testszenario nachgewiesen sind. |
| **P2** | Bestätigte Aufgaben-/Fristenübergabe in den vorhandenen Kanzleikalender. | Vorschlag, Bestätigung, Zuständigkeit und Erledigung getrennt sowie importierte Werte kontrollierbar sind. |

Die Prüfung von Betreiberidentität, Datenverarbeitung, Providervereinbarungen,
Zugriffstrennung und Rechtsdienstleistungsgrenzen ist eine Freigabevoraussetzung
für echte Nutzung, kein nachträgliches UI-Arbeitspaket. Dafür genügt ein EU-Hosting-
Label nicht. Diese Recherche trifft keine Entscheidung über einen neuen
Infrastrukturanbieter.

## Wie eine echte Entlastung gemessen werden sollte

Alle nachstehenden Ziele sind **geplante Abnahmekriterien**, keine erreichten
Messwerte oder Marktbehauptungen. Vor dem Test werden Fallset, Grenzen und
Fehlerklassen festgelegt. Fachanwaltlich definierte Referenzentscheidungen sind
notwendig, wenn juristische Qualität gemessen werden soll.

| Messung | Praktischer Versuchsaufbau | Erfolgsmaß / Abbruchkriterium |
| --- | --- | --- |
| **Aktive Vorbereitungszeit** | Dieselbe Art fiktiver/entsprechend freigegebener Fälle einmal wie bisher, einmal mit Prüfmappe; unterschiedliche Reihenfolge und Dokumentation der Erfahrung. | Minuten bis zu einem fachlich akzeptierten Entwurf messen, einschließlich Korrekturzeit. Keine Ersparnis aus reiner Modellantwortzeit ableiten. |
| **Nachfragen** | Offene Pflichtangaben vor dem Ersttermin und nach erster anwaltlicher Sichtung zählen. | Zahl vermeidbarer Nachfragen sinkt; wichtige Fragen dürfen nicht zugunsten kurzer Laufzeit fehlen. |
| **Belegtreue** | Gespeicherte Originale, Dateiversionen, Seiten und Zitate gegen vorgeschlagene Fakten kontrollieren. | Jeder entscheidende verwendete Fakt besitzt einen passenden, zugänglichen Beleg oder eine ausdrücklich bezeichnete Mandantenbehauptung. Kein falscher Dokumentverweis. |
| **Unbekannte und Widersprüche** | Gegenläufige Datumsangaben, fehlende Rückseiten, zwei Vertragsfassungen und unlesbare Dateien einbauen. | Keine stille Auswahl eines günstigen Werts; alle vorab definierten kritischen Widersprüche erzeugen einen sichtbaren Prüfpunkt. |
| **Rechtsquellen** | Jede im Entwurf verwendete Quelle nach Existenz, Textpassage, Datum/Fassung und Anwendbarkeit prüfen. | Keine erfundenen Fundstellen. Korrektes Zitieren allein zählt nicht als korrekte Subsumtion. |
| **Fristen** | Unterstützte und bewusst nicht unterstützte Regionen/Jahre, Zugang unklar, Sonderregeln und Feiertagsgrenzen prüfen. | Unterstützte Referenzfälle stimmen; außerhalb der Grenze keine sichere Berechnung. Fristvorschlag und bestätigter Kanzleitermin bleiben getrennt. |
| **Revision/Freigabe** | Nach Review ein Datum ändern, eine neue Dokumentversion hochladen oder Entwurf bearbeiten. | Abhängige Freigabe wird zurückgesetzt; alte Ergebnisse bleiben nachvollziehbar, aber sind nicht aktuell freigegeben. |
| **Übergabe** | Export importieren oder durch Kanzleipersonal weiterbearbeiten lassen; kontrollierte Unterbrechung und erneute Übertragung. | Keine verlorenen Anlagen, falsche Aktenzuordnung oder doppelten Mandate; Fehler bleibt sichtbar und sicher wiederholbar. |
| **Zugriff/Datenschutz** | Testmandate unterschiedlicher Nutzer/Rollen in einer isolierten Umgebung und bewusst falsche IDs. | Unberechtigte Zugriffe werden abgelehnt; Auditdaten enthalten keine unnötigen Mandatsinhalte; Löschung und Aufbewahrung werden gesondert geprüft. |

Ein kleiner erster Test mit einigen verschiedenen Kanzleimitarbeitern ist ein
Machbarkeits- und Bedienungstest. Er rechtfertigt keine allgemeine Einsparungsquote.
Auch ein positives Ergebnis ersetzt keinen unabhängigen fachlichen Review oder
Last-/Sicherheitsnachweis des vollständigen Produktpfads.

## Quellenregister

Alle Quellen zuletzt in diesem Lauf am **16.11.2026** gelesen. Links führen direkt
zur Primärquelle. Herstellerangaben bleiben ausdrücklich Herstellerangaben.

- **S1 – JUPUS Helpdesk:** [Dokumente & Fragebögen](https://hilfe.jupus.de/de/articles/dokumente-and-fragebogen-oSwwhmqS69EE), Seitenstand 24.07.2026. Konkrete Aufnahme-, Upload- und Signaturabläufe.
- **S2 – Actaport:** [JUPUS-Integration](https://www.actaport.de/apps/jupus), undatierte aktuelle Produktseite. Daten-/Dokumentenübernahme nach Mandatsannahme.
- **S3 – Legalvisio:** [FAQ](https://www.legalvisio.de/faq/), undatierte aktuelle FAQ. DMS, Office, Zuständigkeiten und Status; Zukunftshinweis zum Mandantenportal berücksichtigt.
- **S4 – DATEV:** [Ihr Start mit DATEV Anwalt classic](https://www.datev.de/web/de/berufsgruppenuebergreifend/service-und-support/themen/ihr-start-mit-datev-anwalt-classic), aktueller Hilfe-Einstieg. Fristenlebenszyklus und aktenbezogene Arbeit.
- **S5 – DATEV:** [Produktinformation Anwalt classic](https://www.datev.de/content/dam/markenassets/themen-und-produktgruppen/zielgruppen/rechtsanw%C3%A4lte/produktinfo/Produktinformation_DATEVAnwalt_classic.pdf), Stand 01.05.2025, zwei Seiten. Kollisionsprüfung, Postbuch und Word-Anbindung; keine aktuelle Preisempfehlung daraus abgeleitet.
- **S6 – RA-MICRO:** [KI Widget](https://www.ra-micro.de/produkte/arbeiten-mit-ki/ki-widget.html), aktuelle Produktseite; [Veröffentlichung vom 16.07.2026](https://www.ra-micro.de/artikel/news/das-neue-ra-micro-ki-widget-suchen-sie-noch-oder-kommunizieren-sie-schon-mit-ihrer-e-akte.html). Aktenkontext und Export.
- **S7 – Wolters Kluwer / AnNoText:** [Künstliche Intelligenz in Kanzleien](https://www.wolterskluwer.com/de-de/solutions/annotext/kuenstliche-intelligenz-ki-fuer-anwaelte-kanzleien). Quellenverlinkung/Dokumentvergleich; alte Ankündigungen ausdrücklich nicht als ausgeliefert gewertet.
- **S8 – Beck-Noxtua:** [Produkt](https://www.beck-noxtua.de/produkt/) und [Service-FAQ](https://www.beck-noxtua.de/service/), aktuelle Produktdokumentation. Belegnavigation und Entwurfsänderungen.
- **S9 – Legora:** [Tabular Review](https://legora.com/product/tabular-review), aktuelle Produktseite. Gemeinsame Prüfung, Review-Status und Zellsperren.
- **S10 – Legora:** [Word Add-in](https://legora.com/product/word-add-in), aktuelle Produktseite. Vorlagen und dokumentbezogene Bearbeitung.
- **S11 – Harvey Help:** [Getting Started with Harvey](https://help.harvey.ai/articles/getting-started-with-harvey), zuletzt aktualisiert 29.10.2026. Tabellen, Arbeitsabläufe und ausdrücklich dokumentierte Grenzen; keine pauschale Überlegenheit unterstellt.
- **S12 – Bundesrechtsanwaltskammer:** [Hinweise zum KI-Einsatz, Stand Oktober 2026](https://www.brak.de/fileadmin/service/publikationen/Handlungshinweise/BRAK_Leitfaden_mit_Hinweisen_zum_KI-Einsatz_Stand_10_2026.pdf), insbesondere Abschnitte 2–4; [Veröffentlichungsmitteilung](https://www.brak.de/newsroom/newsletter/nachrichten-aus-berlin/2026/ausgabe-23-2026-v-11112026/kuenstliche-intelligenz-in-anwaltskanzleien-brak-hinweise-aktualisiert/), Erstveröffentlichung 11.11., Seitenanzeige 13.11.2026. Berufsrechtliche Orientierung, keine Einzelprüfung unseres Betriebsmodells.
- **S13 – beA-Support im Auftrag der BRAK:** [Die Signatur im beA](https://portal.beasupport.de/fragen-antworten/kategorie/erstellen-und-versand-von-nachrichten/signatur-im-bea), aktueller Hilfeartikel, Suchnummer 6301. Signatur, persönlicher Versand und arbeitsteilige Versendung.
- **S14 – advocado:** [So funktioniert advocado](https://www.advocado.de/wie-es-funktioniert.html), aktuell geöffnete Ablauf-/FAQ-Seite. Anfrage, begrenzte Ersteinschätzung und anschließendes Angebot/Beauftragung; die Zeit-/Werktagsbedingungen wurden zusätzlich im direkt geladenen offiziellen HTML-Seitenfuß gelesen.
- **S15 – Flightright:** [FAQ](https://www.flightright.de/faq), aktuell geöffnete Prozesshilfe. Eingabe, Kosten vor Beauftragung, Unterlagennachreichung, Status und Grenzen der automatischen Vorprüfung. Gebührenmodell nur im beschriebenen Umfang berücksichtigt, keine Übernahme in unser Produkt beschlossen.

[S1]: https://hilfe.jupus.de/de/articles/dokumente-and-fragebogen-oSwwhmqS69EE
[S2]: https://www.actaport.de/apps/jupus
[S3]: https://www.legalvisio.de/faq/
[S4]: https://www.datev.de/web/de/berufsgruppenuebergreifend/service-und-support/themen/ihr-start-mit-datev-anwalt-classic
[S5]: https://www.datev.de/content/dam/markenassets/themen-und-produktgruppen/zielgruppen/rechtsanw%C3%A4lte/produktinfo/Produktinformation_DATEVAnwalt_classic.pdf
[S6]: https://www.ra-micro.de/produkte/arbeiten-mit-ki/ki-widget.html
[S7]: https://www.wolterskluwer.com/de-de/solutions/annotext/kuenstliche-intelligenz-ki-fuer-anwaelte-kanzleien
[S8]: https://www.beck-noxtua.de/produkt/
[S9]: https://legora.com/product/tabular-review
[S10]: https://legora.com/product/word-add-in
[S11]: https://help.harvey.ai/articles/getting-started-with-harvey
[S12]: https://www.brak.de/fileadmin/service/publikationen/Handlungshinweise/BRAK_Leitfaden_mit_Hinweisen_zum_KI-Einsatz_Stand_10_2026.pdf
[S13]: https://portal.beasupport.de/fragen-antworten/kategorie/erstellen-und-versand-von-nachrichten/signatur-im-bea
[S14]: https://www.advocado.de/wie-es-funktioniert.html
[S15]: https://www.flightright.de/faq

## Nicht geprüft

Keine tatsächliche Bedienung der Konkurrenzprodukte, keine Lizenz- oder
Vertragsprüfung, keine unabhängigen Nutzerinterviews, keine Einsparungsmessung,
kein beA-Versand und keine juristische Abnahme. Die Marktanalyse bewertet
Arbeitsmuster; sie bescheinigt weder den Anbietern noch Recht & Papier
allgemeine Rechtsrichtigkeit, Datenschutzkonformität oder Produktionsreife.
