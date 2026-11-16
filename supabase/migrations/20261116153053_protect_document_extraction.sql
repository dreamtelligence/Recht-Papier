-- Original metadata remains owner-scoped; extraction evidence is server-owned.
revoke insert, update on public.case_documents from public, anon, authenticated;
grant insert (case_id,kind,file_name,storage_path,mime_type,byte_size)
  on public.case_documents to authenticated;
grant select, delete on public.case_documents to authenticated;
grant all on public.case_documents to service_role;

-- Old owner-writable caches have no trustworthy provenance; retain originals.
update public.case_documents
set extracted_text = null, extracted_pages = null, processed_at = null,
  processing_error = 'Belegtext bitte erneut aus dem Original lesen.'
where extracted_text is not null or extracted_pages is not null or processed_at is not null;

-- A deleted original cannot be replaced beneath an existing extracted record.
drop policy case_documents_storage_insert on storage.objects;
create policy case_documents_storage_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'case-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and not exists (
    select 1 from public.case_documents d where d.storage_path = name
  )
);
