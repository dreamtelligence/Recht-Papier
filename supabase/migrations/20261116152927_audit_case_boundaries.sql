-- Export validates the current case under the same row lock as approval.
create function public.export_case_document(p_document uuid,p_owner uuid)
returns public.generated_documents language plpgsql security invoker set search_path = '' as $$
declare d public.generated_documents; c public.cases;
begin
  select c0.* into c from public.cases c0 join public.generated_documents d0 on d0.case_id=c0.id
    where d0.id=p_document and c0.owner_id=p_owner for update of c0;
  if not found then raise exception 'document_not_found'; end if;
  select * into d from public.generated_documents where id=p_document;
  if d.approved_at is null or d.input_revision <> c.input_revision or c.active_run is not null
    or not exists(select 1 from public.case_analyses where id=d.analysis_id and released)
    then raise exception 'document_not_current_and_approved'; end if;
  return d;
end;
$$;
revoke all on function public.export_case_document(uuid,uuid) from public,anon,authenticated;
grant execute on function public.export_case_document(uuid,uuid) to service_role;
