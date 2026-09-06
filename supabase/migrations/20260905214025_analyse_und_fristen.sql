-- Was die Fallakte braucht, damit eine Einordnung in ihr landen kann.
--
-- Die erste Migration hat den Kern angelegt und Beteiligte, Zeitlinie,
-- Beweismittel, Fristen und Schreiben ausdrücklich vertagt, „wenn der
-- Ende-zu-Ende-Pfad steht". Er steht jetzt an, und dabei zeigt sich: von den
-- fünf ist genau eine nicht vertagbar.
--
-- Beim Kündigungsfall ist das Ergebnis der Prüfung keine Einschätzung, sondern
-- ein Datum. Drei Wochen nach Zugang endet die Klagefrist des § 4 KSchG, und
-- danach ist die Kündigung wirksam, gleich wie fehlerhaft sie war. Eine
-- Analyse, die das nur im Fließtext erwähnt, kann nicht daran erinnern.

-- ---------------------------------------------------------------------------
-- Ein Fall kann scheitern
-- ---------------------------------------------------------------------------

-- `case_status` kannte bisher keinen Fehlerzustand. Bricht die Einordnung ab —
-- Engine nicht erreichbar, Kaltstart über dem Zeitlimit, Modell antwortet
-- nicht —, bliebe der Fall auf `in_pruefung` stehen. Für die Oberfläche sieht
-- das aus wie „läuft noch", für immer, und ein zweiter Versuch wäre nicht von
-- einem Doppelklick zu unterscheiden.
alter type case_status add value if not exists 'fehlgeschlagen';

-- ---------------------------------------------------------------------------
-- Dokumente werden gelesen
-- ---------------------------------------------------------------------------

-- `extracted_text` gibt es seit der ersten Migration, gefüllt hat es nie
-- jemand. Ohne einen Vermerk, wann die Verarbeitung lief, lässt sich „noch
-- nicht gelesen" nicht von „gelesen, aber leer" unterscheiden — und ein
-- gescanntes Anschreiben ohne Textebene ist genau dieser zweite Fall.
alter table case_documents
  add column if not exists processed_at timestamptz,
  add column if not exists processing_error text;

-- Der Teilindex trägt nur die unverarbeiteten Zeilen. Sie sind die Minderheit
-- und die einzigen, nach denen jemand sucht.
create index if not exists case_documents_unverarbeitet_idx
  on case_documents (created_at)
  where processed_at is null;

-- ---------------------------------------------------------------------------
-- Fristen
-- ---------------------------------------------------------------------------

create table if not exists case_deadlines (
  id            uuid primary key default gen_random_uuid(),
  case_id       uuid not null references cases (id) on delete cascade,
  -- Aus welcher Analyse die Frist stammt. Wird die Analyse verworfen, geht die
  -- Frist mit: eine Frist ohne die Prüfung, die sie berechnet hat, ist eine
  -- Behauptung.
  analysis_id   uuid references case_analyses (id) on delete cascade,
  -- Wofür die Frist gilt, in der Sprache des Mandanten.
  label         text not null,
  due_on        date not null,
  -- Die Rechtsgrundlage, z. B. '§ 4 KSchG'. Ohne sie wäre die Frist eine Zahl
  -- ohne Herkunft, und das verbietet dieselbe Invariante wie bei jeder anderen
  -- rechtlichen Aussage.
  basis         text not null,
  source_id     uuid references case_sources (id) on delete set null,
  -- Woher der Wert kommt: 'analyse' oder 'nutzer'.
  origin        text not null default 'analyse',
  -- Vom Mandanten bestätigt. Eine vom Modell gerechnete Frist ist ein
  -- Vorschlag, keine Zusage — dieselbe Regel wie bei `case_facts.confirmed`.
  -- Unbestätigte Fristen dürfen keine Erinnerung auslösen.
  confirmed     boolean not null default false,
  note          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint case_deadlines_label_not_blank check (length(btrim(label)) > 0),
  constraint case_deadlines_basis_not_blank check (length(btrim(basis)) > 0),
  constraint case_deadlines_origin_known check (origin in ('analyse', 'nutzer'))
);

-- Die nächste fällige Frist eines Falls ist die einzige Abfrage, die diese
-- Tabelle heute kennt.
create index if not exists case_deadlines_case_idx
  on case_deadlines (case_id, due_on);

create trigger case_deadlines_updated_at
  before update on case_deadlines
  for each row execute function set_updated_at();

alter table case_deadlines enable row level security;

create policy case_deadlines_owner on case_deadlines
  for all using (owns_case(case_id)) with check (owns_case(case_id));

-- ---------------------------------------------------------------------------
-- Keine Quelle ohne ihre Analyse
-- ---------------------------------------------------------------------------

-- `case_sources.analysis_id` war nullable. Die Invariante lautet „keine
-- rechtliche Aussage ohne Beleg" — sie ist aber nur halb gesichert, solange
-- ein Beleg ohne die Aussage stehen kann, zu der er gehört. Beim Löschen einer
-- Analyse blieben solche Zeilen liegen und die Fallakte zeigte Fundstellen zu
-- einer Prüfung, die es nicht mehr gibt.
--
-- Vorhandene verwaiste Zeilen fallen zuerst. Zum Zeitpunkt dieser Migration
-- gibt es keine, weil noch nie eine Analyse geschrieben wurde; der Schritt
-- steht hier, damit die Migration auch auf einem Projekt läuft, auf dem es
-- anders ist.
delete from case_sources where analysis_id is null;

alter table case_sources
  alter column analysis_id set not null;
