-- Private Originaldokumente der Fallakte. Der erste Pfadteil ist immer die
-- Auth-UUID; damit kann Storage dieselbe Mandantengrenze wie Postgres erzwingen.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'case-documents',
  'case-documents',
  false,
  20971520,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/*'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy case_documents_storage_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'case-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy case_documents_storage_select
on storage.objects for select to authenticated
using (
  bucket_id = 'case-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy case_documents_storage_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'case-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- SECURITY DEFINER-Funktionen sind keine öffentliche Client-API.
alter function public.owns_case(uuid) set search_path = '';
revoke all on function public.owns_case(uuid) from public, anon;
grant execute on function public.owns_case(uuid) to authenticated;

alter function public.handle_new_user() set search_path = '';
revoke all on function public.handle_new_user() from public, anon, authenticated;
