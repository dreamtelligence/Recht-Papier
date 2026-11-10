-- Original snapshots stay in the EU database; the Modal queue receives only a run UUID.
alter table public.cases add column analysis_error text;
create unique index cases_active_run_unique on public.cases(active_run) where active_run is not null;
create table private.case_analysis_jobs (
  run_id uuid primary key,
  case_id uuid not null unique references public.cases(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  snapshot jsonb not null,
  claim_id uuid
);
alter table private.case_analysis_jobs enable row level security;
revoke all on private.case_analysis_jobs from public,anon,authenticated;
grant usage on schema private to service_role;
grant select,insert,update,delete on private.case_analysis_jobs to service_role;

create or replace function public.start_case_analysis(p_case uuid, p_owner uuid, p_run uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare c public.cases; snapshot jsonb;
begin
  select * into c from public.cases where id=p_case and owner_id=p_owner for update;
  if not found then raise exception 'case_not_found'; end if;
  if c.active_run is not null and c.run_expires_at > now() then return null; end if;
  select jsonb_build_object('description', c.description, 'revision', c.input_revision,
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

create function public.get_case_analysis_job(p_run uuid, p_claim uuid default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare c public.cases; j private.case_analysis_jobs;
begin
  select * into c from public.cases where active_run=p_run for update;
  if not found or c.run_expires_at <= now() then return null; end if;
  select * into j from private.case_analysis_jobs where run_id=p_run and case_id=c.id and owner_id=c.owner_id;
  if not found then return null; end if;
  if p_claim is not null and j.claim_id is not null and j.claim_id<>p_claim then return null; end if;
  if p_claim is not null then update private.case_analysis_jobs set claim_id=p_claim where run_id=p_run; end if;
  return jsonb_build_object('case_id',j.case_id,'owner_id',j.owner_id,'run_id',j.run_id,'snapshot',j.snapshot,'claim_id',coalesce(p_claim,j.claim_id));
end;
$$;

create function public.fail_case_analysis_job(p_run uuid, p_error text)
returns void language plpgsql security invoker set search_path = '' as $$
declare j private.case_analysis_jobs;
begin
  select * into j from private.case_analysis_jobs where run_id=p_run;
  if not found then return; end if;
  update public.cases set status='fehlgeschlagen',active_run=null,run_expires_at=null,
    analysis_error=left(p_error,300)
    where id=j.case_id and owner_id=j.owner_id and active_run=p_run;
  delete from private.case_analysis_jobs where run_id=p_run;
end;
$$;
revoke all on function public.get_case_analysis_job(uuid,uuid), public.fail_case_analysis_job(uuid,text)
  from public,anon,authenticated;
grant execute on function public.get_case_analysis_job(uuid,uuid), public.fail_case_analysis_job(uuid,text)
  to service_role;

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
    and p_source_audit is not null and jsonb_array_length(p_sources)>0, false);
  insert into public.case_analyses(case_id,question,answer,model,answer_audit,request_id,
    input_revision,input_snapshot,source_audit,released)
  values(p_case,'Wie ist dieser Sachverhalt rechtlich einzuordnen?',p_answer,p_model,p_audit,
    p_run::text,c.input_revision,p_snapshot,p_source_audit,released) returning id into analysis;
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
    analysis_error=case when released then null else 'Die Einordnung hat die Quellenprüfung nicht bestanden.' end,
    legal_area=case when p_area in ('arbeitsrecht','mietrecht') then p_area::public.legal_area
      else legal_area end where id=p_case;
  delete from private.case_analysis_jobs where run_id=p_run;
  return jsonb_build_object('analysis_id',analysis,'released',released);
end;
$$;

-- Preserve the old worker RPC while cleaning its corresponding private job.
create or replace function public.fail_case_analysis(p_case uuid, p_owner uuid, p_run uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  update public.cases set status='fehlgeschlagen',active_run=null,run_expires_at=null
    where id=p_case and owner_id=p_owner and active_run=p_run;
  if found then delete from private.case_analysis_jobs where run_id=p_run; end if;
end;
$$;
