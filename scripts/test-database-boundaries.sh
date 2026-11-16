#!/usr/bin/env bash
# Real Postgres permissions/RPC checks with minimal Auth/Storage schema adapters.
set -euo pipefail
cd "$(dirname "$0")/.."
container="recht-papier-db-test-${RANDOM}-${RANDOM}"
docker run --detach --rm --name "$container" --network none \
  --env POSTGRES_HOST_AUTH_METHOD=trust \
  postgres:17-alpine@sha256:a77aa70e641402a21411b92b721c58d10f23b50ae5fdd2333efd22d166e1e5f7 >/dev/null
trap 'docker rm --force "$container" >/dev/null' EXIT
for attempt in {1..30}; do
  if docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
sql() { docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 -q; }
sql <<'SQL'
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
grant usage on schema public to anon,authenticated,service_role;
alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
alter default privileges in schema public grant all on sequences to anon,authenticated,service_role;
create schema auth;
create table auth.users(id uuid primary key default gen_random_uuid(),raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth to anon,authenticated,service_role;
grant execute on function auth.uid() to anon,authenticated,service_role;
create schema storage;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
alter table storage.objects enable row level security;
create function storage.foldername(text) returns text[] language sql immutable as $$select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1]$$;
grant usage on schema storage to anon,authenticated,service_role;
grant all on all tables in schema storage to anon,authenticated,service_role;
SQL
for migration in supabase/migrations/*.sql; do
  if [[ "$migration" == *protect_document_extraction.sql ]]; then
    sql <<'SQL'
insert into auth.users(id) values('00000000-0000-0000-0000-000000000002');
insert into public.cases(id,owner_id,title,description) values('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000002','Legacy cache','Fictional');
insert into public.case_documents(case_id,file_name,storage_path,extracted_text,extracted_pages,processed_at)
values('00000000-0000-0000-0000-000000000003','legacy.pdf','legacy-original','Untrusted legacy','["Untrusted legacy"]',now());
insert into storage.objects(bucket_id,name) values('case-documents','legacy-original');
SQL
  fi
  sql < "$migration"
  if [[ "$migration" == *protect_document_extraction.sql ]]; then
    sql <<'SQL'
do $$begin
  assert (select extracted_text is null and extracted_pages is null and processed_at is null and processing_error is not null from public.case_documents where storage_path='legacy-original');
  assert (select input_revision=2 from public.cases where id='00000000-0000-0000-0000-000000000003');
  assert exists(select 1 from storage.objects where name='legacy-original');
end$$;
delete from auth.users where id='00000000-0000-0000-0000-000000000002';
delete from storage.objects where name='legacy-original';
SQL
  fi
done
sql <<'SQL'
insert into auth.users(id) values('00000000-0000-0000-0000-000000000001');
SQL
for check in supabase/tests/document_evidence_permissions.sql supabase/tests/export_revision.sql supabase/tests/portfolio_contract.sql supabase/tests/async_analysis_job.sql; do
  sql < "$check"
done
echo 'Postgres 17: migrations, extraction privileges, revision and job RPC checks passed (Auth/Storage adapters; no hosted API).'
