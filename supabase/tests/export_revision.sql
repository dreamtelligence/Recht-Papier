-- Real Postgres RPC/role assertions; synthetic rows only, rolled back.
BEGIN;
DO $$
declare owner uuid; cid uuid; aid uuid; did uuid; d public.generated_documents;
begin
  select id into owner from auth.users limit 1;
  insert into public.cases(owner_id,title,description) values(owner,'Synthetic export regression','Fictional') returning id into cid;
  insert into public.case_analyses(case_id,question,answer,model,released,input_revision)
    values(cid,'Synthetic','Controlled answer','controlled-termination/1.0',true,0) returning id into aid;
  insert into public.generated_documents(case_id,analysis_id,kind,title,body,input_revision)
    values(cid,aid,'bericht','Synthetic','Reviewed exact text',0) returning id into did;
  assert not has_function_privilege('authenticated','public.export_case_document(uuid,uuid)','execute');
  assert not has_function_privilege('anon','public.export_case_document(uuid,uuid)','execute');
  set local role service_role;
  begin
    perform public.export_case_document(did,owner);
    raise exception 'Unapproved export accepted';
  exception when raise_exception then
    if sqlerrm <> 'document_not_current_and_approved' then raise; end if;
  end;
  perform public.approve_case_document(did,owner);
  d := public.export_case_document(did,owner);
  assert d.body='Reviewed exact text' and d.approved_at is not null;
  begin
    perform public.export_case_document(did,gen_random_uuid());
    raise exception 'Foreign owner export accepted';
  exception when raise_exception then
    if sqlerrm <> 'document_not_found' then raise; end if;
  end;
  update public.cases set active_run=gen_random_uuid() where id=cid;
  begin
    perform public.export_case_document(did,owner);
    raise exception 'Active analysis export accepted';
  exception when raise_exception then
    if sqlerrm <> 'document_not_current_and_approved' then raise; end if;
  end;
  update public.cases set active_run=null,description='Changed original input' where id=cid;
  assert (select approved_at is not null from public.generated_documents where id=did);
  begin
    perform public.export_case_document(did,owner);
    raise exception 'Previously approved stale export accepted';
  exception when raise_exception then
    if sqlerrm <> 'document_not_current_and_approved' then raise; end if;
  end;
  reset role;
end;
$$;
ROLLBACK;
