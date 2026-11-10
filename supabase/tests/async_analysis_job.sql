-- Every write is rolled back; only a synthetic case is touched. No LLM calls.
BEGIN;
do $$
declare owner uuid; cid uuid; run uuid := gen_random_uuid(); other uuid := gen_random_uuid();
  claim uuid := gen_random_uuid(); snapshot jsonb; result jsonb;
begin
  select id into owner from auth.users limit 1;
  if owner is null then raise exception 'A test user is required'; end if;
  insert into public.cases(owner_id,title,description) values(owner,'Synthetic async regression','Fictional test only') returning id into cid;
  assert not has_function_privilege('authenticated','public.get_case_analysis_job(uuid,uuid)','execute');
  assert not has_function_privilege('anon','public.fail_case_analysis_job(uuid,text)','execute');
  assert not has_table_privilege('authenticated','private.case_analysis_jobs','select');
  set local role service_role;
  snapshot := public.start_case_analysis(cid,owner,run);
  assert snapshot is not null;
  assert public.start_case_analysis(cid,owner,other) is null;
  assert public.get_case_analysis_job(run,claim) is not null;
  assert public.get_case_analysis_job(run,claim) is not null; -- lost response retry
  assert public.get_case_analysis_job(run,gen_random_uuid()) is null; -- duplicate dispatcher
  -- A fake source kind must roll back the complete write.
  begin
    perform public.finish_case_analysis(cid,owner,run,snapshot,'Synthetic answer','synthetic-test',
      '{"status":"pass","material_claims":1}', '{"missing_required":[]}',
      '[{"kind":"invalid","reference":"BGB","locator":"§ 622"}]','[]','arbeitsrecht');
    raise exception 'Invalid source was accepted';
  exception when invalid_text_representation then null; end;
  assert not exists(select 1 from public.case_analyses where case_id=cid);
  result := public.finish_case_analysis(cid,owner,run,snapshot,'Synthetic answer [1]','synthetic-test',
    '{"status":"pass","material_claims":1}','{"missing_required":[]}',
    '[{"kind":"gesetz","reference":"BGB","locator":"§ 622","citation_id":"1"}]','[]','arbeitsrecht');
  assert result->>'released'='false'; -- Free model/synthetic results cannot bypass the portfolio contract.
  assert public.get_case_analysis_job(run,null) is null;
  -- A late error callback cannot overwrite the completed result.
  perform public.fail_case_analysis_job(run,'Late failure');
  assert (select status='fehlgeschlagen' from public.cases where id=cid);
  snapshot := public.start_case_analysis(cid,owner,other);
  update public.cases set description='Changed fictional input' where id=cid;
  begin
    perform public.finish_case_analysis(cid,owner,other,snapshot,'Stale','synthetic-test',
      '{"status":"pass","material_claims":1}','{"missing_required":[]}','[]','[]','arbeitsrecht');
    raise exception 'Stale snapshot was accepted';
  exception when raise_exception then
    if sqlerrm <> 'case_changed_during_analysis' then raise; end if;
  end;
  perform public.fail_case_analysis_job(other,'Inputs changed');
  assert (select status='fehlgeschlagen' and analysis_error='Inputs changed' from public.cases where id=cid);
  run := gen_random_uuid();
  perform public.start_case_analysis(cid,owner,run);
  update public.cases set run_expires_at=now()-interval '1 second' where id=cid;
  assert public.get_case_analysis_job(run,claim) is null;
  assert public.start_case_analysis(cid,owner,gen_random_uuid()) is not null;
  reset role;
end;
$$;

ROLLBACK;
