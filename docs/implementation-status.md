# Implementierungsstand vom 6. September 2026

Dieser Stand trennt eingecheckte Implementierung, nachgemessene Werte und noch offene Arbeit.
Jede Zeile ist entweder aus dem Repository belegt oder an einem Lauf gemessen — was nur
plausibel wäre, steht nicht drin.

Er ersetzt den Stand vom 5. September, der den Expo-Client noch als „unverändertes
Standardgerüst, uncommittet" führte. Das war zum Zeitpunkt der Aufzeichnung richtig und ist es
seit den Commits `2131ebe` und folgenden nicht mehr.

## Recht & Papier

Branch `feat/case-file-auth-and-deletion`, Commit `2ef6c27`.

### Was durchläuft

Der Ende-zu-Ende-Pfad steht. Gemessen am 6. September 2026, ohne Nachhelfen, über
`supabase/tests/test_fall_einordnen.py`:

| Schritt | Ergebnis |
|---|---|
| Fall anlegen, PDF in den privaten Bucket, Dokumenteintrag | ok |
| `dokument-lesen` | 1.791 Zeichen aus dem Kündigungsschreiben, Umlaute intakt |
| `fall-einordnen` | 102 s, Status `analysiert` |
| `case_sources` | 11 Fundstellen, jede mit Rechtsstand |
| davon Pflichtnormen des Prüfprofils | BGB § 622, § 623 · KSchG § 1, § 4, § 23 · BetrVG § 102 — alle sechs |
| `cases.legal_area` | `arbeitsrecht`, aus der Antwort der Engine abgeleitet |
| `case_deadlines` | Klagefrist 21.09.2026, Grundlage § 4 KSchG, unbestätigt |
| Doppellauf-Schutz | bei bereits gesetztem `in_pruefung` → 409; gleichzeitiger Start nicht abgesichert (siehe Nachprüfung) |
| Fremder Fall | 404 |

### Eingecheckt

**Datenbank** — drei Migrationen. `20260905095138_case_file.sql` (sechs Tabellen),
`20260905130446_private_case_documents.sql` (privater Bucket, Storage-Policies auf den
UID-Präfix), `20260905214025_analyse_und_fristen.sql` (`case_deadlines`, Status
`fehlgeschlagen`, `case_documents.processed_at`/`processing_error`, `case_sources.analysis_id`
auf `not null`).

Alle sieben Tabellen erzwingen Row Level Security mit Owner-Policy über `owns_case()`.
`test_rls_isolation.py` legt zwei echte Nutzer an und prüft 26 Zugriffe mit deren Tokens,
seit dem 6. September einschließlich `case_analyses`, `case_sources` und `case_deadlines`.
Bestanden am 6. September 2026.

**Edge Functions** — vier, alle deployt:

| Function | Version | service_role? |
|---|---|---|
| `delete-account` | v2 | ja — `auth.admin.deleteUser` verlangt ihn |
| `recht-nachschlagen` | v2 | nein |
| `dokument-lesen` | v1 | nein |
| `fall-einordnen` | v4 | nein |

Drei von vier kommen mit dem Nutzertoken aus, weil RLS dieselbe Grenze zieht.

**Client** — 33 TypeScript-Dateien, zehn Routen, `npx tsc --noEmit` grün. Die Fallakte kann die
Einordnung auslösen, zeigt Status, Fristen und Fundstellen und öffnet Dokumente über eine
fünf Minuten gültige signierte Adresse.

**Tests** — fünf eigenständige Skripte gegen das echte Projekt:
`test_rls_isolation.py`, `test_account_deletion.py`, `test_beispielfall.py`,
`test_fall_einordnen.py`, `mess_audit.py`.

## Jura als Legal-Engine

Branch `qdrant-server-mode`, Commit `5df9a65`.

- **`POST /api/legal/analyze`** neu, in beiden Serving-Schichten. Grund: es gab keinen einzigen
  `@app.post` im Repository, und `?q=` nimmt 500 Zeichen — eine Fallschilderung ist ein
  Vielfaches davon. Gesucht wird mit einer verdichteten Anfrage, geantwortet auf den
  vollständigen Sachverhalt.
- **Kein stiller Anbieterwechsel mehr.** `provider_order()` liefert einen Anbieter, außer
  `LLM_ALLOW_FALLBACK=1` ist gesetzt; der Query-Rewriter folgt derselben Regel und spricht jetzt
  Gemini; die DeepSeek- und Anthropic-Secrets sind nicht mehr an Modal eingehängt.
- 151 Tests grün (`tests/`, ohne `test_retrieval_quality.py` und `test_ingestion.py` — beide
  laden Modelle und liefen hier nicht).

### Nachgemessene Latenz

| Aufruf | Zeit |
|---|---|
| `/health`, ohne Schlüssel | 0,6 s — wärmt den GPU-Container ausdrücklich **nicht** auf |
| `/api/legal/stats`, kalt | 47 s |
| `/api/legal/analyze`, kalt | 98–121 s |
| `/api/legal/analyze`, warm | 10–37 s |

Das Zeitlimit in `fall-einordnen` steht deshalb auf 170 s.

## Offen

### Blockierend

- **Gemini-Kontingent.** `gemini-2.5-flash-lite` deckelt im Gratis-Tarif bei **20 Anfragen pro
  Tag und Projekt** (`GenerateRequestsPerDayPerProjectPerModel-FreeTier`) und drosselt
  zusätzlich pro Minute. Am 5. und 6. September jeweils nach wenigen Testläufen erschöpft.
  Seit dem Anbieter-Lock fällt das sichtbar aus, statt still an DeepSeek zu gehen — gewollt,
  aber damit ist Abrechnung Voraussetzung für alles Weitere, auch für einen Review-Zugang.
- **Mietrecht ist nicht lieferbar.** Der ausgelieferte Index trägt `Mietrecht: 0` von 17.024
  Dokumenten. Der Fix liegt seit Juras Commit `923a713` im Code, aber kein Skript hat den
  Korpus neu extrahiert. MVP 1 sagt zwei Rechtsgebiete zu und liefert eines.
- **Falltext läuft über Modal.** `LEGAL_ENGINE_URL` zeigt auf den Modal-Endpunkt, ohne gesetzte
  Region. `AGENTS.md` verlangt für diesen Pfad den EU-CPU-Container; der `legal-engine`-Dienst
  in `infra/docker-compose.yml` steht auskommentiert, ein Serving-Image gibt es nicht. Bis
  dahin laufen ausschließlich die erfundenen Beispielfälle.

### Ungeklärt

- **`answer_audit` als Sperre.** Jeder bisherige Lauf steht auf `fail`, auch der mit allen sechs
  Pflichtnormen. Fast alle Beanstandungen sind `missing_claim_citation`; die Stichprobe zeigt
  überwiegend falsch positive — Begrüßung, Zwischenüberschriften, und Sätze, die eine Tatsache
  aus dem Sachverhalt wiedergeben statt eine Rechtsaussage zu treffen. Letzteres ist neu: das
  Modell markiert Falltatsachen mit `[Sachverhalt]`, und `_is_material_claim` in
  `answer_audit.py` kennt nur `[1]`-Nummern. Belegquote über alle Läufe: 57–59 %.
  Die Messreihe (`mess_audit.py`) ist am Kontingent hängengeblieben, drei von vier getakteten
  Aufrufen liefen in 429. Die Regel bleibt offen; heute sperrt der Status nichts.

### Noch nicht gebaut

- `case_facts` bleibt leer — es gibt keine Oberfläche, mit der jemand eine Angabe bestätigt.
- DOCX und Bilder werden nicht gelesen. `dokument-lesen` vermerkt das in `processing_error`,
  statt es zu übergehen. Bilder bräuchten OCR.
- Urteile kommen aus der Engine mit leerem `gesetz` zurück, weil ihr Antwortkontext nur
  Abkürzung und Paragraph liest. `fall-einordnen` überspringt solche Zitate, statt einen Beleg
  ohne Angabe in die Akte zu schreiben. Rechtsprechung ist damit faktisch nicht zitierbar.
- Beteiligte, Zeitlinie, Beweismittel und Schreiben aus dem Domänenmodell.
- Alles aus `docs/apple-app-review-readiness.md`: StoreKit, Privacy Labels, Impressum,
  Datenschutzerklärung, RDG-Freigabe, Einreichungs-Entität.

## Nachprüfung: Produktionsreife und Modellwahl, 6. September 2026

Geprüft: lokaler Produktstand `6424bfc`, Jura `5df9a65`, relevante Semantica-Architektur
und Domänenmodell sowie unten verlinkte Herstellerdokumentation. Die obigen Live-Messungen
wurden nicht wiederholt. Kein Modell wurde deployt oder auf Rechtsqualität getestet;
die folgenden Schritte sind Empfehlungen, keine abgeschlossene Umsetzung.

### Zusätzliche Befunde aus dem Code

- **Parallelität:** `fall-einordnen/index.ts` liest den Status und setzt ihn später ohne
  Bedingung. Zwei Anfragen können beide starten. Der bestehende Test setzt den Status vorab;
  er testet keine Parallelität. Nötig: atomare Übernahme eines Analyseauftrags mit Lauf-ID,
  Ablaufzeit und kontrollierter Wiederaufnahme nach Abbruch.
- **Unvollständige Akten trotz Erfolg:** Fehler beim Lesen der Dokumente/Fakten und beim
  Schreiben der Quellen, Fristen und des Abschlussstatus werden nicht durchgehend geprüft.
  Analyse, Quellen, Fristen und Abschluss gehören in eine gemeinsame DB-Transaktion mit
  Eigentümerprüfung und eindeutigem Laufbezug. Test: Quellen-Insert scheitert → kein Erfolg
  und keine teilweise freigegebene Analyse.
- **Verlorener Falltext:** `pseudonymisieren(...).slice(0, 8000)` kürzt den zusammengesetzten
  Sachverhalt still. Auch Quellentexte werden in `build_ask_context()` nach 3.000 Zeichen
  abgeschnitten. Ein größeres Modell sieht diese verlorenen Angaben nicht. Vollständigkeit
  prüfen, relevante Abschnitte mit Herkunft auswählen und bei fehlendem Pflichtkontext
  Rückfragen oder einen sichtbaren Fehler liefern.
- **Audit hat auch falsch negative Ergebnisse:** `_split_claims()` überspringt Text nach
  „Zusammenfassend“. Lokal reproduziert: `Zusammenfassend\nDie Kündigung ist garantiert
  unwirksam.` ergibt eine leere Claim-Liste. Zusammenfassungen müssen mitgeprüft werden.
  `[Sachverhalt]` darf umgekehrt keine pauschale Ausnahme erhalten: Eine Rechtsbehauptung
  wird durch diese Modellmarkierung nicht zur belegten Falltatsache.
- **Modellwechsel braucht drei Anschlussstellen:** Juras `answering.py`, der separate
  `query_rewriter.py` und die Gemini-Erlaubnisliste in `fall-einordnen`. Ein unbekannter
  `LLM_PROVIDER=qwen` wird derzeit zu Gemini normalisiert. Ein neuer Endpunkt allein reicht
  also nicht. Anbieter vor der Übertragung festlegen; Antwortmodell-Prüfung verhindert
  keinen bereits erfolgten Datentransfer.

### Empfehlung: Qwen3.8-27B-FP8 als begrenzter Test

Das offizielle [Qwen3.8-27B](https://huggingface.co/Qwen/Qwen3.8-27B) und seine
[FP8-Version](https://huggingface.co/Qwen/Qwen3.8-27B-FP8) sind verfügbar, Apache-2.0
lizenziert und über vLLM/SGLang betreibbar. Für quellengestützte Einordnungen und
Schreibentwürfe ist das ein plausibler Kandidat. Die Hersteller-Benchmarks belegen jedoch
keine Eignung für deutsches Arbeits- und Mietrecht. Bereitgestellte Gesetze ersetzen weder
Subsumtion noch die Prüfung von Ausnahmen, fehlenden Tatsachen und Fristen.

Erster Versuch: eine L40S mit 48 GB, FP8, zunächst 16k Kontext und eine gleichzeitige Anfrage.
Die Speicherwahl ist eine Abschätzung: rund 27 GB für 27 Milliarden Gewichte bei einem Byte,
zuzüglich weiterer Parameter, Laufzeit und Kontextspeicher; tatsächlichen VRAM messen.
24-GB-L4/A10 wären ein späterer 4-Bit-Vergleich mit eigener Qualitätsprüfung.
Modellrevision und kompatible Serving-Version beim Versuch festschreiben.
Analyse zunächst mit `reasoning_effort="medium"` testen; reine Formulierung aus geprüften
Angaben ohne Thinking vergleichen. Thinking ist beim Modell standardmäßig aktiv und kann
das Zeit- und Tokenbudget aufbrauchen. Abgeschnittene oder leere Ausgaben verwerfen.

### Kosten und Entwicklungsbudget

[Modal-Listenpreise](https://modal.com/pricing), USD, ohne CPU/RAM/Speicher/Steuern:

| GPU | GPU-Kosten je Stunde | Mit Containerregion `eu` (1,15×) |
|---|---:|---:|
| L4 | 0,80 $ | 0,92 $ |
| A10 | 1,10 $ | 1,27 $ |
| L40S | 1,95 $ | 2,24 $ |

Beispielrechnung, keine gemessene Leistung: 60–120 abgerechnete Sekunden auf einer
L40S in `eu` ergeben etwa 0,037–0,075 $ GPU-Kosten. Kaltstart, Warmhaltezeit und weitere
Engine-Aufrufe zählen zusätzlich. 30 $ reichen rechnerisch für 13,4 reine GPU-Stunden,
praktisch weniger; das genannte 30-EUR-Guthaben wurde nicht im Konto geprüft und nicht
in USD umgerechnet.

Zunächst höchstens 5 $ für Start, Speicher und erste Fälle verplanen; danach anhand der
Kosten pro vollständigem Fall weiterentscheiden. `min_containers=0`, `max_containers=1`,
kurzes `scaledown_window` und gebündelte Testläufe. [Warmhalten kostet ebenfalls](https://modal.com/docs/guide/cold-start).
Vor dem Versuch [Workspace-Nutzungslimit und Spend Limit](https://modal.com/docs/guide/budgets)
prüfen: Verbrauchslimit gilt vor Credits, Spend Limit nach Credits; Guthaben allein ist
kein Ausgabenstopp. Bestehende andere Workloads beim Limit berücksichtigen.

Kostenvergleich: [Gemini 2.5 Flash-Lite](https://ai.google.dev/gemini-api/docs/pricing#gemini-2.5-flash-lite)
kostet im Standard-Paid-Tarif 0,10 $/Mio. Eingabe- und 0,40 $/Mio. Ausgabetokens.
10.000 hinein + 2.000 hinaus ergeben 0,0018 $ je Generierung, ohne weitere Aufrufe/Tools.
Bei wenigen Entwicklungsanfragen ist das deutlich günstiger als dedizierte GPU-Zeit.
Self-Hosting lohnt hier zunächst wegen Kontrolle und Modellvergleich, nicht wegen eines
nachgewiesenen Kostenvorteils. Ein neuer Gemini-Key allein behebt kein Projektkontingent.

### Datenfluss und Reihenfolge bis zur Freigabe

Modal unterstützt [EU-Compute und EU-Routing](https://modal.com/docs/guide/region-selection).
Nur `region="eu"` genügt nicht: Standardrouting ist USA. Außerdem liegen laut
[Datenresidenz-Dokumentation](https://modal.com/docs/guide/data-residency) Logs und
Modal-Speicherprodukte in den USA; bei Functions gilt das auch für asynchrone Payloads
und Payloads über 2 MiB. Für den Versuch ausschließlich synthetische Fälle verwenden.
Echte Fälle brauchen einen vollständig geprüften Datenfluss einschließlich Vertrag,
Aufbewahrung und Löschung. Die bestehende Produktionsentscheidung für den EU-Pfad wird
durch diesen Modellvorschlag nicht ersetzt; Regex-Pseudonymisierung ist kein Nachweis
vollständiger Anonymisierung.

1. **Verlässliche Grundlage:** Mietrechtsindex neu aufbauen und Coverage messen,
   Urteile mit Gericht/Aktenzeichen/Datum durchgängig zitierbar machen, atomare
   Verarbeitung und Eingabevollständigkeit sichern.
2. **Prüfbare Einordnung:** Audit-Lücken und Fehlalarme mit Gegenbeispielen korrigieren;
   fehlende Pflichtquellen, Auditfehler und schwere Beanstandungen verhindern Freigabe.
   Rückfragen bei fehlenden entscheidenden Tatsachen; Fristen aus bestätigten Ereignissen
   und fachlich geprüften Regeln berechnen und vor Übernahme prüfen.
3. **Dokumente fertigstellen:** Faktenbestätigung in der Akte; Bericht mit Sachverhalt,
   Einordnung, offenen Punkten und Quellenanhang; ein fachlich freigegebener Schreibentyp.
   Namen, Daten und Beträge aus bestätigten Feldern, Text aus freigegebener Analyse,
   PDF/DOCX über feste Vorlagen. Vor Export Vorschau und Nutzerfreigabe; Fall-, Quellen-,
   Modell- und Vorlagenversion zum Dokument speichern. Fehlende Dokumentlesbarkeit sichtbar
   behandeln und DOCX/OCR ergänzen, bevor diese Formate als unterstützt gelten.
4. **Modell abnehmen:** vorhandene `regression_guard`-Fälle plus synthetische Fälle mit
   widersprüchlichen Angaben, fehlenden Daten, Prompt-Injection im Dokument und langen
   Eingaben auswerten. Retrieval und Generierung getrennt messen; Fachprüfung der
   Rechtsaussagen zusätzlich zum Regex-Audit. Kosten/Fall und kalte/warme Latenz erfassen.
5. **Produkt freigeben:** Datenfluss und fachanwaltliches Leistungsbild bestätigen,
   App-Review-Gates aus dem bestehenden Dokument erfüllen. Ein funktionierender
   Kündigungs-Testfall ist noch keine Freigabe für allgemeine Rechtsberatung.

## Umsetzung der fünf Punkte, 6. September 2026

Die Nachprüfung oben nennt Befunde und Empfehlungen. Was davon inzwischen
umgesetzt ist, steht hier — mit dem, was gemessen wurde, und dem, was offen
blieb. Reihenfolge wie im Plan.

### 1. Mietrechtskorpus und zitierbare Urteile

`Jura/scripts/repair_mietrecht.py` ordnet das Rechtsgebiet in `documents.json`,
im Wissensgraphen und in den Qdrant-Payloads neu — ohne neue Embeddings, weil
sich nur Metadaten geändert haben. Ergebnis der Neuordnung: **162 Mietrechts­punkte**
statt vorher keiner, bei 17.024 Dokumenten.

`Jura/scripts/fetch_mietrecht.py` lädt BetrKV, HeizkostenV und WoFlV über den
vorhandenen Scraper — lokal, weil gesetze-im-internet.de Rechenzentrums-IPs
sperrt. `src/config.py` führt die drei jetzt in `PRIORITY_LAWS`.

Das allein hätte den Korpus nicht vollständig gemacht: die 27 Normen lagen als
JSON *neben* dem Index. `Jura/scripts/ingest_mietrecht_zusatz.py` trägt sie
inkrementell nach — nur die neuen Dokumente werden eingebettet, die
vorhandenen 17.024 bleiben unangetastet.

| | vorher | nachher |
|---|---:|---:|
| Dokumente | 17.024 | **17.051** |
| davon Mietrecht | 0 | **189** |

Nachgemessen am 06.09.2026, nicht geschätzt. Der so gebaute Index ist in das
Volume `legal-rag-data` übernommen worden, aus dem die laufende Engine liest;
der alte Stand liegt weiter lokal in `~/Jura/legal_rag_storage`.

Urteile sind jetzt zitierbar: `build_ask_context()` gibt je Fundstelle `kind`,
`reference`, `locator`, `gericht`, `aktenzeichen` und `datum` zurück statt nur
Gesetz und Paragraph. Ein Urteil trug vorher ein leeres `gesetz`-Feld und war
damit im Beleg nicht identifizierbar.

### 2. Audit prüft Zusammenfassungen mit

`_split_claims()` übersprang alles nach „Zusammenfassend" bis zu einem
Schlusssatz, der oft nicht kam. Lokal reproduziert: `Zusammenfassend\nDie
Kündigung ist garantiert unwirksam.` ergab eine leere Claim-Liste — also
`pass`, weil nichts geprüft wurde.

Jetzt fällt nur noch die Überschriftszeile selbst weg, der Text darunter wird
geprüft. `_is_material_claim()` nimmt Sätze mit „zusammenfassend" nicht mehr
pauschal aus. `pytest tests/test_answer_audit.py tests/test_provider_lock.py`:
32 bestanden.

### 3. Gleichzeitige Analysen und atomare Speicherung

Migration `20260906054106_analyse_runs_und_berichte.sql`: `cases.active_run`
mit Ablaufzeit, `start_case_analysis` / `finish_case_analysis` /
`fail_case_analysis` als Worker-RPCs nur für `service_role`. Analyse, Quellen,
Fristen und Abschlussstatus entstehen in einer Transaktion; ein Fehler beim
Schreiben der Quellen rollt alles zurück.

`cases.input_revision` wird von Triggern auf `cases`, `case_facts` und
`case_documents` hochgezählt. Eine Analyse, deren Snapshot nicht mehr zur
Revision passt, wird beim Abschluss abgewiesen.

`supabase/tests/test_analysis_atomic.py` misst das mit echter Parallelität
(zwei Threads): genau ein Lauf gewinnt, ein Speicherfehler lässt nichts
Teilweises stehen, ein alter Lauf entsperrt den neuen nicht, und der Client
kann sich weder ein bestandenes Audit noch den Status `analysiert` selbst
eintragen.

### 4. Kein stilles Abschneiden mehr

Drei Stellen kürzten Text, ohne es zu sagen:

| Stelle | vorher | jetzt |
|---|---|---|
| `dokument-lesen` | `text.slice(0, MAX_TEXT)`, Vermerk im Fehlerfeld | HTTP 413, `extracted_text` bleibt `null` |
| `fall-einordnen` | Sachverhalt auf 8.000 Zeichen gekürzt | HTTP 413 mit Bitte, die Unterlagen einzugrenzen |
| `build_ask_context()` | Quellentext nach 3.000 Zeichen mit „…" | keine Kürzung; über 60.000 Zeichen ein Fehler |

Eine gekürzte Norm ist der gefährlichere Fall: Ausnahmen und Rückausnahmen
stehen dort regelmäßig am Ende.

### 5. Von bestätigten Angaben zum Dokument

Die Strecke steht ganz — Datenbank, Edge Function und App.

**Datenbank.** `generated_documents` mit `input_revision`, `template_version`
und `approved_at`. `save_case_document` und `approve_case_document`
(Migration `20260906055357_dokument_freigabe.sql`) sind nur mit `service_role`
aufrufbar und weisen ab, was nicht zusammenpasst: keine freigegebene Analyse,
eine Analyse zu einem anderen Eingabestand, ein noch laufender Analyseauftrag
oder null bestätigte Angaben.

**Herkunft der Angaben** (Migration `20260906060321_angaben_und_fristen_herkunft.sql`).
Der Client durfte `case_facts.origin` frei setzen und damit eine aus dem
Schreiben extrahierte Aussage als eigene ausgeben; bei `case_deadlines` waren
`basis`, `origin` und `analysis_id` schreibbar — eine Rechtsgrundlage, die der
Client selbst schreiben kann, ist keine. Jetzt gilt spaltengenau: Angaben
anlegen mit `case_id`, `statement`, `occurred_on`, ändern nur `statement`,
`occurred_on`, `confirmed`; an einer Frist nur `confirmed` und `note`.

**Edge Function `dokument-erstellen`.** Baut Bericht oder Schreibenvorlage aus
bestätigten Angaben, freigegebener Analyse und deren Quellen. Der Text
entsteht serverseitig aus fester Vorlage; die Function formuliert keine neue
Rechtsfolge und rät keine Namen oder Adressen. `action: "approve"` gibt frei.
Fall- und Analysebezug, Modell und Vorlagenversion stehen im Dokument.

**App.** Angaben sind antippbar bestätigbar; die Fallakte zeigt an, wenn eine
Einordnung die Quellenprüfung nicht bestanden hat oder zu einem alten
Eingabestand gehört, und bietet dann „Erneut einordnen" an. Ein neuer
Abschnitt führt Bericht und Schreiben; die Vorschau (`app/(app)/schreiben/[id].tsx`)
zeigt den Text vollständig und unverändert, gibt frei und exportiert danach
als PDF über `expo-print` und `expo-sharing`. Der Export prüft die Freigabe
selbst — eine Datei, die einmal aus der App heraus ist, kommt nicht zurück.

`supabase/tests/test_dokument_freigabe.py` geht die Strecke einmal ganz durch
und prüft die Sperren einzeln: 24 Prüfungen, alle bestanden. Der Modellaufruf
wird dabei umgangen, weil hier die Regeln gemessen werden und nicht die
Qualität einer Einordnung.

### Was dabei an den Tests korrigiert wurde

Zwei Tests bildeten das alte Sicherheitsmodell ab und schlugen nach den
Migrationen fehl — zu Recht:

- `test_rls_isolation.py` legte Analyse, Fundstelle und Frist als Nutzer an.
  Das geht nicht mehr und darf nicht mehr gehen. Der Test prüft jetzt beides:
  dass der Client es *nicht* kann, und dass die Trennung auch für die
  serverseitig angelegten Zeilen hält.
- `test_beispielfall.py` prüfte, dass `fall-einordnen` mit 404 antwortet —
  geschrieben, als die Function noch nicht deployt war. Er prüft jetzt, dass
  sie erreichbar ist und eine Anfrage ohne Fall-ID ablehnt, bevor etwas
  Kostenpflichtiges beginnt.

Läufe am 06.09.2026: `test_analysis_atomic`, `test_dokument_freigabe`,
`test_rls_isolation`, `test_account_deletion` und `test_beispielfall` alle
bestanden.

### Offen

- **Modellabnahme Qwen.** Der Server ist deployt (`recht-papier-qwen`,
  EU-Routing, `min_containers=0`), lief am 06.09.2026 aber noch **nicht**
  erfolgreich an. Drei Befunde, jeder einen Build teuer:

  1. Das fertige `vllm/vllm-openai`-Image lässt sich von Modal nicht
     auflösen; `add_python` installiert dort einen zweiten Interpreter *ohne*
     die site-packages des Images, worauf `huggingface_hub` fehlt.
  2. `--disable-log-requests` gibt es in vLLM 0.28 nicht mehr — der Server
     bricht beim Argument-Parsen ab. Nachgemessen an den Dataclass-Feldern des
     deployten Images: weder `disable_log_requests` noch `enable_log_requests`
     existieren dort. Der Zweck, kein Falltext im Log, wird jetzt über
     `--max-log-len 0` und `--disable-uvicorn-access-log` erreicht; Prompts
     werden ohne `--enable-log-outputs` ohnehin nicht protokolliert.
  3. Mit `debian_slim` lädt das Modell zwar vollständig (27,64 GiB auf der
     L40S, Gewichte in 88 s), dann bricht der Engine-Start ab:
     `Could not find nvcc and default cuda_home='/usr/local/cuda' doesn't
     exist`. Die pip-Wheels bringen die CUDA-*Laufzeit* mit, nicht den
     Compiler, den die FP8-Kernel zur Laufzeit brauchen.

  `modal_qwen.py` steht deshalb jetzt auf `nvidia/cuda:13.0.2-devel-ubuntu24.04`
  — CUDA 13.0, weil `torch` aus vLLM 0.28 als `2.13.0+cu130` gebaut ist. Die
  Gewichte liegen außerdem in einem Volume statt im Image: vorher lud jede
  Änderung an einer Serverzeile 27 GB neu, und das ist bei begrenztem Guthaben
  der teuerste Weg, ein Flag zu korrigieren. Einmalig nötig:
  `modal run modal_qwen.py::lade_modell`.

  **Damit läuft der Server** (06.09.2026, nachgemessen): `/v1/models` antwortet
  mit HTTP 200 und `Qwen/Qwen3.8-27B-FP8`, `max_model_len` 16384. Kaltstart
  201 s einschließlich GPU-Zuteilung und Laden der Gewichte aus dem Volume;
  eine warme Antwort mit 516 Ausgabetokens dauerte 36 s. `enable_thinking:
  false` greift — `reasoning_tokens` ist 0.

  **Die erste inhaltliche Probe ist trotzdem durchgefallen.** Ein synthetischer
  Betriebskostenfall (Abrechnung für 2024, zugegangen am 01.03.2026) ergab
  eine Antwort, die die Ausschlussfrist des § 556 Abs. 3 BGB durchgehend als
  „Verjährung" bezeichnet — eine andere Rechtskategorie mit anderen Folgen —
  und die Abrechnungsfrist des Vermieters mit der Einwendungsfrist der
  Mieterin vermischt. Das Modell korrigierte sich mitten in der Antwort
  sichtbar selbst („Korrektur der Analyse"), obwohl Thinking abgeschaltet war,
  und die zweite angebotene Quelle (BetrKV) kam nicht vor.

  Zwei Schlüsse daraus. Erstens: für dieses Rechtsgebiet ist das Modell in
  dieser Konfiguration nicht einsetzbar; die Herstellerbenchmarks sagen über
  deutsches Mietrecht nichts aus, und diese Probe bestätigt das. Zweitens, und
  wichtiger: **die falsche Antwort trug die Fundstelle `[1]` und hätte das
  Regex-Audit passiert.** Das Audit prüft, *ob* belegt wird, nicht *ob der
  Beleg die Aussage trägt. Eine fachliche Prüfung ist dadurch nicht ersetzbar.

  Eine systematische Abnahme gegen die `regression_guard`-Fälle steht weiter
  aus; eine einzelne Probe ist keine. `LLM_PROVIDER` bleibt auf `gemini`.
- **L40S-Kapazität in `region="eu"`.** Modal meldete beim ersten Start, dass
  auf einen GPU-Worker gewartet wird. Das Zeitbudget eines Kaltstarts ist
  damit nicht vorhersagbar und muss vor einer Nutzung gemessen werden.
- **Gemini-Kontingent erschöpft.** Der Beispielfall bekam am 06.09.2026
  `429 RESOURCE_EXHAUSTED`. Das ist die dokumentierte Grenze des Gratis-Tarifs
  und keine Störung — aber es heißt, dass eine Einordnung mit echtem
  Modellaufruf heute nicht mehr messbar ist.
- Alles Übrige aus der Liste am Ende der Nachprüfung: Rückfragen bei fehlenden
  entscheidenden Tatsachen, fachliche Prüfung der Fristenregeln, DOCX/OCR,
  Modellabnahme gegen `regression_guard`, sowie sämtliche Gates aus
  `docs/apple-app-review-readiness.md`.
