# Beispielfälle für den Durchlauf im Simulator

Zwei fertige Anschreiben plus die Schilderung, die dazu gehört. Gedacht zum
Durchklicken der Fallakte im Simulator — nicht als juristisches Muster.

Alle Personen, Unternehmen und Sachverhalte in diesen Dateien sind erfundene Testdaten.
Es handelt sich weder um echte Mandatsunterlagen noch um juristisch freigegebene Muster.
Die PDFs können über die Dateien-App eines Simulators oder Testgeräts importiert werden.

---

## Fall 1 — Arbeitsrecht: `kuendigung-nordlicht-logistik.pdf`

Marlene Habicht, seit 01.03.2017 Disponentin bei der Nordlicht Logistik GmbH
(62 Beschäftigte, Betriebsrat vorhanden), bekommt am 31.08.2026 per Bote eine
betriebsbedingte Kündigung, datiert 28.08.2026, zum 30.09.2026.

**Schilderung zum Einfügen in „Was ist passiert?"**

> Ich arbeite seit dem 01.03.2017 als Disponentin bei der Nordlicht Logistik GmbH in
> Hamburg. Am 31.08.2026 hat mir ein Bote die Kündigung überbracht, datiert auf den
> 28.08.2026. Gekündigt wird zum 30.09.2026 mit der Begründung, mein Arbeitsplatz falle
> durch eine Umstrukturierung weg. Unterschrieben hat ein Personalreferent mit "i. A.",
> eine Vollmacht lag nicht bei. Im Betrieb arbeiten 62 Leute und es gibt einen Betriebsrat.

Das Schreiben ist absichtlich fehlerhaft. Was eine spätere Einordnung finden
müsste — hier steht es, damit sich das Ergebnis daran messen lässt:

| Ansatz | Fundstelle | Was im Schreiben steht |
|---|---|---|
| Kündigungsfrist zu kurz | § 622 Abs. 2 Nr. 3 BGB | 9 Jahre Betriebszugehörigkeit ⇒ 3 Monate zum Monatsende, also frühestens 31.12.2026 — gekündigt wird zum 30.09.2026 |
| KSchG anwendbar | § 1, § 23 Abs. 1 KSchG | 62 Beschäftigte, Wartezeit lange erfüllt |
| Sozialauswahl nicht dargelegt | § 1 Abs. 3 KSchG | nur pauschal „Umstrukturierung" |
| Betriebsratsanhörung nicht erwähnt | § 102 Abs. 1 S. 3 BetrVG | Betriebsrat existiert, Anhörung fehlt im Schreiben |
| Zurückweisung mangels Vollmacht | § 174 BGB | Unterschrift „i. A. Tobias Grewe", keine Vollmacht beigefügt |
| Klagefrist | § 4 KSchG | Zugang 31.08.2026 ⇒ drei Wochen, Ende 21.09.2026 |
| Urlaub / Freistellung | § 7 BUrlG | 14 Tage Resturlaub auf die Freistellung angerechnet |

## Fall 2 — Mietrecht: `mieterhoehung-hansa-wohnbau.pdf`

Jonas Petersen, 68,4 m² in Bremen, Mietvertrag seit 14.06.2019. Die Verwaltung
verlangt Zustimmung zu einer Erhöhung von 612,00 € auf 703,80 € (+15,0 %) ab
01.12.2026, begründet mit dem Mietspiegel Bremen 2025.

**Schilderung zum Einfügen**

> Ich wohne seit Juni 2019 zur Miete in der Hemmstraße in Bremen, 68,4 Quadratmeter.
> Am 04.09.2026 kam ein Schreiben der Hausverwaltung: die Kaltmiete soll ab dem
> 01.12.2026 von 612 auf 703,80 Euro steigen, begründet mit dem Mietspiegel.
> Die letzte Erhöhung war zum 01.05.2025. Ich weiß nicht, ob ich zustimmen muss.

| Ansatz | Fundstelle | Was zu prüfen wäre |
|---|---|---|
| Zustimmungsverlangen, keine einseitige Erhöhung | § 558 Abs. 1 BGB | Miete steigt erst mit Zustimmung |
| Jahressperrfrist | § 558 Abs. 1 S. 2 BGB | letzte Erhöhung 01.05.2025 — eingehalten |
| Kappungsgrenze | § 558 Abs. 3 BGB | +15,0 % in drei Jahren; 15 % gilt nur in Gebieten nach Landesverordnung, sonst 20 % |
| Begründung per Mietspiegel | § 558a Abs. 2 Nr. 1 BGB | Mietspiegel 2025 — Aktualität und Einordnungsfeld prüfen |
| Überlegungsfrist | § 558b Abs. 2 BGB | Ende des zweiten Kalendermonats nach Zugang, hier 30.11.2026 |
| Form | § 558a Abs. 1 BGB | Textform genügt, Unterschrift nicht erforderlich |

---

## Wo die Sachen landen

Beim Tippen auf **Fall anlegen** schreibt `createCase`
(`apps/mobile/src/features/faelle/api.ts`) an drei Stellen — in dieser Reihenfolge,
und der Fehlerpfad räumt rückwärts wieder auf:

| Schritt | Ziel | Inhalt |
|---|---|---|
| 1 | `public.cases` | `owner_id`, `title` (erste 80 Zeichen der Schilderung), `description` (Schilderung unverändert), `status = 'entwurf'`, `legal_area = null` |
| 2 | Storage-Bucket `case-documents`, privat | Pfad `<auth-uid>/<case-id>/<dateiname>` |
| 3 | `public.case_documents` | `kind = 'anschreiben'`, `file_name`, `storage_path`, `mime_type`, `byte_size`; `extracted_text` bleibt leer |

Die Fallakte zieht danach fünf Abfragen parallel: `cases`, `case_documents`,
`case_facts`, `case_analyses`, `case_sources`.

Nach **Rechtlich einordnen** kommen drei weitere Schritte dazu:

| Schritt | Ziel | Inhalt |
|---|---|---|
| 4 | `case_documents.extracted_text` | `dokument-lesen` zieht das PDF aus dem Bucket und schreibt den Text — beim Kündigungsschreiben rund 1.800 Zeichen |
| 5 | `case_analyses` | Antworttext, Modell, `request_id` und der `answer_audit` **unverändert** |
| 6 | `case_sources` · `case_deadlines` | eine Zeile je Fundstelle mit Rechtsstand; Fristen nur, wenn die Analyse sie selbst genannt hat |

`case_facts` bleibt leer: es gibt noch keine Oberfläche, mit der jemand eine
Angabe bestätigt.

**Was der Kündigungsfall im Lauf vom 06.09.2026 lieferte** — elf Fundstellen,
darunter alle sechs Pflichtnormen des Prüfprofils (BGB § 622, § 623, KSchG § 1,
§ 4, § 23, BetrVG § 102), Rechtsgebiet `arbeitsrecht` erkannt, und die
Klagefrist zum **21.09.2026** unter Fristen, unbestätigt und mit § 4 KSchG als
Grundlage.

**Was noch nicht stimmt:** `answer_audit` steht in jedem bisherigen Lauf auf
`fail`. Die Stichprobe zeigt überwiegend falsch positive Beanstandungen —
Begrüßung, Zwischenüberschriften und Sätze, die eine Tatsache aus dem
Sachverhalt wiedergeben statt eine Rechtsaussage zu treffen. Deshalb sperrt der
Status heute nichts; die Regel dafür wird erst festgelegt, wenn genug Läufe
vorliegen (`mess_audit.py`).

Nachprüfen, ohne zu tippen — legt ein Wegwerfkonto an, geht denselben Weg und
räumt hinterher auf:

```
python3 supabase/tests/test_beispielfall.py              # bis zum Dokument
python3 supabase/tests/test_fall_einordnen.py            # bis zur Einordnung
python3 supabase/tests/test_fall_einordnen.py --behalten # Fall stehen lassen
```

Beide letzten kosten echte Modellaufrufe. Der Gratis-Tarif deckelt bei 20 pro
Tag und Projekt; danach meldet die App „Die Einordnung ist zurzeit ausgelastet".
