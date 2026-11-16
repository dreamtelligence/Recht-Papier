alter table public.profiles add column deletion_pending boolean not null default false;
revoke insert, update, delete on public.profiles from public, anon, authenticated;
grant update (display_name) on public.profiles to authenticated;
grant all on public.profiles to service_role;

create function private.active_document_owner() returns boolean
language plpgsql security definer set search_path = '' as $$
declare active boolean;
begin
  -- Hold a share lock until the Storage transaction ends; deletion waits for
  -- in-flight uploads before committing its barrier and listing originals.
  select not p.deletion_pending into active from public.profiles p
    where p.id=(select auth.uid()) for share;
  return coalesce(active,false);
end;
$$;
revoke all on function private.active_document_owner() from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.active_document_owner() to authenticated;

create function public.begin_account_deletion(p_owner uuid) returns boolean
language plpgsql security invoker set search_path = '' as $$
begin
  insert into public.profiles(id,deletion_pending) values(p_owner,true)
    on conflict(id) do update set deletion_pending=true;
  return true;
end;
$$;
revoke all on function public.begin_account_deletion(uuid) from public,anon,authenticated;
grant execute on function public.begin_account_deletion(uuid) to service_role;

alter policy case_documents_storage_insert on storage.objects
with check (
  bucket_id='case-documents'
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and (select private.active_document_owner())
  and not exists(select 1 from public.case_documents d where d.storage_path=name)
);
alter policy case_documents_storage_select on storage.objects
using (
  bucket_id='case-documents'
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and (select private.active_document_owner())
);
alter policy case_documents_storage_delete on storage.objects
using (
  bucket_id='case-documents'
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and (select private.active_document_owner())
);
