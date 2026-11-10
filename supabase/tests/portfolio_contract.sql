BEGIN;
do $$
declare owner uuid; cid uuid; run uuid:=gen_random_uuid(); snapshot jsonb; result jsonb; before_revision bigint;
begin
  select id into owner from auth.users limit 1;
  insert into public.cases(owner_id,title,description) values(owner,'Synthetic portfolio regression','Fictional') returning id into cid;
  select input_revision into before_revision from public.cases where id=cid;
  update public.cases set termination_input='{"version":"1.0","as_of":"2026-11-10","facts":[]}' where id=cid;
  assert (select input_revision=before_revision+1 from public.cases where id=cid);
  assert has_column_privilege('authenticated','public.cases','termination_input','update');
  assert not has_column_privilege('authenticated','public.case_analyses','structured_result','update');
  set local role service_role;
  snapshot:=public.start_case_analysis(cid,owner,run);
  assert snapshot->'termination_input'->>'version'='1.0';
  result:=public.finish_case_analysis(cid,owner,run,snapshot,'Controlled report','controlled-termination/1.0',
    '{"status":"pass","material_claims":1,"structured_result":{"version":"1.0","technical_status":"pass","facts":[]}}',
    '{"missing_required":[]}', '[{"kind":"gesetz","reference":"KSchG","locator":"§ 4","citation_id":"1"}]',
    '[{"label":"Synthetic deadline","due_on":"2026-12-01","basis":"§ 4 KSchG","citation_id":"1"}]','arbeitsrecht');
  assert result->>'released'='true';
  assert (select structured_result->>'version'='1.0' from public.case_analyses where case_id=cid);
  assert (select count(*)=1 from public.case_deadlines where case_id=cid);
  snapshot:=public.start_case_analysis(cid,owner,gen_random_uuid());
  update public.cases set termination_input='{"version":"1.0","as_of":"2026-11-11","facts":[]}' where id=cid;
  begin
    perform public.finish_case_analysis(cid,owner,(select active_run from public.cases where id=cid),snapshot,'Old result','controlled-termination/1.0',
      '{"status":"pass","material_claims":1}', '{"missing_required":[]}', '[]','[]','arbeitsrecht');
    raise exception 'Stale typed inputs accepted';
  exception when raise_exception then
    if sqlerrm <> 'case_changed_during_analysis' then raise; end if;
  end;
  reset role;
end;
$$;
ROLLBACK;
