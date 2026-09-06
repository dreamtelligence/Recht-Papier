create function public.save_case_document(p_case uuid,p_owner uuid,p_analysis uuid,
  p_kind text,p_title text,p_body text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare c public.cases; a public.case_analyses; result uuid;
begin
  select * into c from public.cases where id=p_case and owner_id=p_owner for update;
  if not found then raise exception 'case_not_found'; end if;
  select * into a from public.case_analyses where id=p_analysis and case_id=p_case;
  if not found or not a.released or a.input_revision is distinct from c.input_revision
    or c.active_run is not null then raise exception 'analysis_not_released_or_stale'; end if;
  if jsonb_array_length(coalesce(a.input_snapshot->'facts','[]'::jsonb))=0
    then raise exception 'confirmed_facts_required'; end if;
  if length(btrim(p_body))=0 or length(p_body)>100000 then raise exception 'invalid_document'; end if;
  insert into public.generated_documents(case_id,analysis_id,kind,title,body,input_revision)
    values(p_case,p_analysis,p_kind,p_title,p_body,c.input_revision) returning id into result;
  return result;
end;
$$;

create function public.approve_case_document(p_document uuid,p_owner uuid) returns public.generated_documents
language plpgsql security invoker set search_path = '' as $$
declare d public.generated_documents; c public.cases;
begin
  select c0.* into c from public.cases c0 join public.generated_documents d0 on d0.case_id=c0.id
    where d0.id=p_document and c0.owner_id=p_owner for update of c0;
  if not found then raise exception 'document_not_found'; end if;
  select * into d from public.generated_documents where id=p_document;
  if d.input_revision <> c.input_revision or c.active_run is not null
    or not exists(select 1 from public.case_analyses where id=d.analysis_id and released)
    then raise exception 'document_stale'; end if;
  update public.generated_documents set approved_at=now() where id=p_document returning * into d;
  return d;
end;
$$;
revoke all on function public.save_case_document(uuid,uuid,uuid,text,text,text)
  from public,anon,authenticated;
grant execute on function public.save_case_document(uuid,uuid,uuid,text,text,text) to service_role;
revoke all on function public.approve_case_document(uuid,uuid) from public,anon,authenticated;
grant execute on function public.approve_case_document(uuid,uuid) to service_role;
