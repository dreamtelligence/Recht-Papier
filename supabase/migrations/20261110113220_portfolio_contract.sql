-- Typed user inputs remain private under the existing owner RLS policies.
alter table public.cases add column termination_input jsonb
  check (termination_input is null or (jsonb_typeof(termination_input)='object' and octet_length(termination_input::text)<=100000));
alter table public.case_documents add column extracted_pages jsonb;
alter table public.case_analyses add column structured_result jsonb;
grant update (termination_input) on public.cases to authenticated;
drop trigger case_input_revision on public.cases;
create or replace function private.bump_case_revision() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'cases' then
    if new.description is distinct from old.description or new.termination_input is distinct from old.termination_input then
      new.input_revision := old.input_revision + 1;
    end if;
    return new;
  end if;
  update public.cases set input_revision = input_revision + 1
    where id = case when tg_op = 'DELETE' then old.case_id else new.case_id end;
  if tg_op = 'UPDATE' and old.case_id is distinct from new.case_id then
    update public.cases set input_revision = input_revision + 1 where id = old.case_id;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger case_input_revision before update of description, termination_input on public.cases
  for each row execute function private.bump_case_revision();
create or replace function public.start_case_analysis(p_case uuid, p_owner uuid, p_run uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare c public.cases; snapshot jsonb;
begin
  select * into c from public.cases where id=p_case and owner_id=p_owner for update;
  if not found then raise exception 'case_not_found'; end if;
  if c.active_run is not null and c.run_expires_at > now() then return null; end if;
  select jsonb_build_object('description', c.description, 'revision', c.input_revision, 'termination_input', c.termination_input,
    'facts', coalesce((select jsonb_agg(to_jsonb(f) order by f.id) from public.case_facts f
      where f.case_id=p_case and f.confirmed), '[]'::jsonb),
    'documents', coalesce((select jsonb_agg(to_jsonb(d) order by d.id) from public.case_documents d
      where d.case_id=p_case), '[]'::jsonb)) into snapshot;
  update public.cases set active_run=p_run, run_expires_at=now()+interval '25 minutes',
    status='in_pruefung', analysis_error=null where id=p_case;
  delete from private.case_analysis_jobs where case_id=p_case;
  insert into private.case_analysis_jobs(run_id,case_id,owner_id,snapshot)
    values(p_run,p_case,p_owner,snapshot);
  return snapshot;
end;
$$;

create or replace function public.finish_case_analysis(
  p_case uuid, p_owner uuid, p_run uuid, p_snapshot jsonb,
  p_answer text, p_model text, p_audit jsonb, p_source_audit jsonb,
  p_sources jsonb, p_deadlines jsonb, p_area text
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare c public.cases; analysis uuid; source uuid; item jsonb; released boolean;
begin
  select * into c from public.cases where id=p_case and owner_id=p_owner for update;
  if not found or c.active_run is distinct from p_run or c.run_expires_at <= now()
    then raise exception 'stale_analysis_run'; end if;
  if c.input_revision <> (p_snapshot->>'revision')::bigint
    then raise exception 'case_changed_during_analysis'; end if;
  if length(btrim(p_answer))=0 or jsonb_typeof(p_sources) <> 'array'
    then raise exception 'invalid_analysis'; end if;
  released := coalesce(p_audit->>'status'='pass'
    and (p_audit->>'material_claims')::integer > 0
    and jsonb_array_length(coalesce(p_source_audit->'missing_required','[]'::jsonb))=0
    and p_source_audit is not null and jsonb_array_length(p_sources)>0
    and p_model='controlled-termination/1.0'
    and p_audit->'structured_result'->>'version'='1.0'
    and p_audit->'structured_result'->>'technical_status'='pass', false);
  insert into public.case_analyses(case_id,question,answer,model,answer_audit,request_id,
    input_revision,input_snapshot,source_audit,released,structured_result)
  values(p_case,'Wie ist dieser Sachverhalt rechtlich einzuordnen?',p_answer,p_model,p_audit,
    p_run::text,c.input_revision,p_snapshot,p_source_audit,released,p_audit->'structured_result') returning id into analysis;
  for item in select value from jsonb_array_elements(p_sources) loop
    insert into public.case_sources(case_id,analysis_id,kind,reference,locator,title,url,
      valid_as_of,excerpt,relevance,citation_id)
    values(p_case,analysis,(item->>'kind')::public.source_kind,item->>'reference',item->>'locator',
      item->>'title',item->>'url',item->>'valid_as_of',item->>'excerpt',
      (item->>'relevance')::double precision,item->>'citation_id');
  end loop;
  -- Ein ungeprüftes Ergebnis darf keine operativen Fristen erzeugen.
  if released then
    for item in select value from jsonb_array_elements(p_deadlines) loop
      select id into source from public.case_sources where analysis_id=analysis
        and citation_id=item->>'citation_id' limit 1;
      insert into public.case_deadlines(case_id,analysis_id,label,due_on,basis,note,source_id)
        values(p_case,analysis,item->>'label',(item->>'due_on')::date,item->>'basis',item->>'note',source);
    end loop;
  end if;
  update public.cases set status=case when released then 'analysiert'::public.case_status
    else 'fehlgeschlagen'::public.case_status end, active_run=null, run_expires_at=null,
    analysis_error=case when released then null else 'Die technischen Prüfungen wurden nicht bestanden.' end,
    legal_area=case when p_area in ('arbeitsrecht','mietrecht') then p_area::public.legal_area
      else legal_area end where id=p_case;
  delete from private.case_analysis_jobs where run_id=p_run;
  return jsonb_build_object('analysis_id',analysis,'released',released);
end;
$$;

create or replace function public.save_case_document(p_case uuid,p_owner uuid,p_analysis uuid,
  p_kind text,p_title text,p_body text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare c public.cases; a public.case_analyses; result uuid;
begin
  select * into c from public.cases where id=p_case and owner_id=p_owner for update;
  if not found then raise exception 'case_not_found'; end if;
  select * into a from public.case_analyses where id=p_analysis and case_id=p_case;
  if not found or not a.released or a.input_revision is distinct from c.input_revision
    or c.active_run is not null then raise exception 'analysis_not_released_or_stale'; end if;
  if jsonb_array_length(coalesce(a.structured_result->'facts',a.input_snapshot->'facts','[]'::jsonb))=0
    then raise exception 'confirmed_facts_required'; end if;
  if length(btrim(p_body))=0 or length(p_body)>100000 then raise exception 'invalid_document'; end if;
  insert into public.generated_documents(case_id,analysis_id,kind,title,body,input_revision)
    values(p_case,p_analysis,p_kind,p_title,p_body,c.input_revision) returning id into result;
  return result;
end;
$$;
