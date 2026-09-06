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
| Doppellauf-Schutz | zweiter Aufruf während `in_pruefung` → 409 |
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
