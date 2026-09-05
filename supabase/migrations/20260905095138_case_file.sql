-- Die persönliche Fallakte.
--
-- Leitsatz aus dem Domänenmodell: die Fallakte IST die Datenstruktur, der Chat
-- ist nur eine Oberfläche darauf. Schreiben entstehen später aus freigegebenen
-- Falldaten, nicht aus einem Gesprächsverlauf. Deshalb liegt hier alles
-- strukturiert und einzeln adressierbar.
--
-- Dieser erste Schritt deckt den Kern ab: Fall, Sachverhalt, Dokumente,
-- Quellenbelege und Analysen. Beteiligte, Zeitlinie, Beweismittel, Fristen und
-- Schreiben folgen, wenn der Ende-zu-Ende-Pfad steht.
--
-- Jede Tabelle ist mandantengetrennt. Ohne Policy kommt niemand an Zeilen
-- heran, auch nicht der eigene Client mit einem gültigen Token.

-- ---------------------------------------------------------------------------
-- Aufzählungen
-- ---------------------------------------------------------------------------

create type case_status as enum (
  'entwurf',        -- angelegt, noch nicht analysiert
  'in_pruefung',    -- Analyse läuft
  'analysiert',     -- Ergebnis liegt vor
  'abgeschlossen',
  'archiviert'
);

-- MVP 1 ist bewusst auf zwei Rechtsgebiete begrenzt.
create type legal_area as enum ('arbeitsrecht', 'mietrecht');

create type document_kind as enum (
  'anschreiben',    -- das Schreiben, um das es geht (Kündigung, Mieterhöhung, …)
  'vertrag',
  'nachweis',
  'korrespondenz',
  'sonstiges'
);

create type source_kind as enum ('gesetz', 'urteil');

-- ---------------------------------------------------------------------------
-- Hilfsfunktionen
-- ---------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profil
-- ---------------------------------------------------------------------------

create table profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Fall
-- ---------------------------------------------------------------------------

create table cases (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users (id) on delete cascade,
  title         text not null,
  -- Was der Nutzer selbst geschildert hat, unverändert. Die Grundlage für
  -- alles Weitere; nie durch generierten Text überschreiben.
  description   text not null,
  legal_area    legal_area,
  status        case_status not null default 'entwurf',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint cases_description_not_blank check (length(btrim(description)) > 0)
);

create index cases_owner_created_idx on cases (owner_id, created_at desc);

create trigger cases_updated_at
  before update on cases
  for each row execute function set_updated_at();

-- Eigentumsprüfung für alle Kindtabellen an einer Stelle. `security definer`,
-- damit die Prüfung selbst nicht wieder durch RLS läuft und sich im Kreis dreht.
create or replace function owns_case(target_case uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.cases
    where cases.id = target_case
      and cases.owner_id = auth.uid()
  );
$$;


-- ---------------------------------------------------------------------------
-- Dokumente
-- ---------------------------------------------------------------------------

create table case_documents (
  id            uuid primary key default gen_random_uuid(),
  case_id       uuid not null references cases (id) on delete cascade,
  kind          document_kind not null default 'sonstiges',
  file_name     text not null,
  -- Pfad im Supabase-Storage-Bucket. Die Datei selbst liegt nie in der Datenbank.
  storage_path  text not null unique,
  mime_type     text,
  byte_size     bigint check (byte_size is null or byte_size >= 0),
  -- Aus dem Dokument extrahierter Text, sobald die Verarbeitung läuft.
  extracted_text text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index case_documents_case_idx on case_documents (case_id, created_at);

create trigger case_documents_updated_at
  before update on case_documents
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Sachverhalt in Einzelaussagen
-- ---------------------------------------------------------------------------

-- Der Sachverhalt wird in einzelne, prüfbare Aussagen zerlegt. Nur so lässt
-- sich später sagen, worauf eine rechtliche Einschätzung beruht und was davon
-- der Nutzer bestätigt hat.
create table case_facts (
  id            uuid primary key default gen_random_uuid(),
  case_id       uuid not null references cases (id) on delete cascade,
  statement     text not null,
  -- Wann das Geschilderte passiert ist, nicht wann es erfasst wurde.
  occurred_on   date,
  -- Vom Nutzer bestätigt. Unbestätigte Aussagen dürfen keine Schreiben tragen.
  confirmed     boolean not null default false,
  -- Woher die Aussage stammt: 'nutzer' oder 'extraktion'.
  origin        text not null default 'nutzer',
  source_document_id uuid references case_documents (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint case_facts_statement_not_blank check (length(btrim(statement)) > 0),
  constraint case_facts_origin_known check (origin in ('nutzer', 'extraktion'))
);

create index case_facts_case_idx on case_facts (case_id, occurred_on nulls last);

create trigger case_facts_updated_at
  before update on case_facts
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Analysen
-- ---------------------------------------------------------------------------

-- Eine Analyse ist eine Momentaufnahme: dieselbe Frage kann später zu einem
-- anderen Ergebnis führen, weil sich Rechtsstand oder Sachverhalt geändert
-- haben. Deshalb wird nichts überschrieben, sondern angehängt.
create table case_analyses (
  id            uuid primary key default gen_random_uuid(),
  case_id       uuid not null references cases (id) on delete cascade,
  question      text not null,
  answer        text,
  -- Welches Modell geantwortet hat, für Nachvollziehbarkeit und Vergleich.
  model         text,
  -- Ergebnis des deterministischen Answer-Audits aus der Engine, unverändert.
  answer_audit  jsonb,
  -- Request-ID, unter der die Anfrage durch alle Dienste lief.
  request_id    text,
  created_at    timestamptz not null default now(),
  constraint case_analyses_question_not_blank check (length(btrim(question)) > 0)
);

create index case_analyses_case_idx on case_analyses (case_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Quellenbelege
-- ---------------------------------------------------------------------------

-- Jede Analyse trägt die Fundstellen, auf die sie sich stützt. Ohne diese
-- Tabelle ließe sich die Invariante "keine rechtliche Aussage ohne Beleg"
-- nicht nachweisen.
create table case_sources (
  id            uuid primary key default gen_random_uuid(),
  case_id       uuid not null references cases (id) on delete cascade,
  analysis_id   uuid references case_analyses (id) on delete cascade,
  kind          source_kind not null,
  -- Gesetzeskürzel bzw. Gericht, z. B. 'KSchG' oder 'BAG'.
  reference     text not null,
  -- Paragraph bzw. Aktenzeichen.
  locator       text,
  title         text,
  url           text,
  -- Rechtsstand der Fundstelle. Muss dem Nutzer angezeigt werden.
  valid_as_of   text,
  excerpt       text,
  relevance     double precision,
  created_at    timestamptz not null default now()
);

create index case_sources_case_idx on case_sources (case_id, created_at desc);
create index case_sources_analysis_idx on case_sources (analysis_id);

-- ---------------------------------------------------------------------------
-- Mandantentrennung
-- ---------------------------------------------------------------------------

alter table profiles       enable row level security;
alter table cases          enable row level security;
alter table case_documents enable row level security;
alter table case_facts     enable row level security;
alter table case_analyses  enable row level security;
alter table case_sources   enable row level security;

create policy profiles_self on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy cases_owner on cases
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy case_documents_owner on case_documents
  for all using (owns_case(case_id)) with check (owns_case(case_id));

create policy case_facts_owner on case_facts
  for all using (owns_case(case_id)) with check (owns_case(case_id));

create policy case_analyses_owner on case_analyses
  for all using (owns_case(case_id)) with check (owns_case(case_id));

create policy case_sources_owner on case_sources
  for all using (owns_case(case_id)) with check (owns_case(case_id));

-- Neue Konten bekommen ihr Profil automatisch, damit der Client nach der
-- Registrierung nichts nachholen muss.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
