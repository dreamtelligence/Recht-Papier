-- Worker-RPCs sind nur mit service_role aufrufbar. Die Edge Function übergibt
-- die mit getUser() geprüfte Identität; der Client kann keine Audits fälschen.
alter table public.cases
  add column input_revision bigint not null default 0,
  add column active_run uuid,
  add column run_expires_at timestamptz;
alter table public.case_analyses
  add column input_revision bigint,
  add column input_snapshot jsonb,
  add column source_audit jsonb,
  add column released boolean not null default false;
alter table public.case_sources add column citation_id text;

create schema if not exists private;
create function private.bump_case_revision() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'cases' then
    if new.description is distinct from old.description then
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
revoke all on function private.bump_case_revision() from public, anon, authenticated;
create trigger case_input_revision before update of description on public.cases
  for each row execute function private.bump_case_revision();
create trigger facts_input_revision after insert or update or delete on public.case_facts
  for each row execute function private.bump_case_revision();
create trigger documents_input_revision after insert or update or delete on public.case_documents
  for each row execute function private.bump_case_revision();

-- Auch REST darf den Workflowstatus oder serverseitige Ergebnisse nicht fälschen.
revoke update on public.cases from anon, authenticated;
grant update (title, description, legal_area) on public.cases to authenticated;
revoke insert on public.cases from anon, authenticated;
grant insert (owner_id,title,description,legal_area) on public.cases to authenticated;
revoke insert, update, delete on public.case_analyses, public.case_sources from anon, authenticated;

create function public.start_case_analysis(p_case uuid, p_owner uuid, p_run uuid)
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
  update public.cases set active_run=p_run, run_expires_at=now()+interval '4 minutes',
    status='in_pruefung' where id=p_case;
  return snapshot;
end;
$$;

create function public.fail_case_analysis(p_case uuid, p_owner uuid, p_run uuid)
returns void language sql security invoker set search_path = '' as $$
  update public.cases set status='fehlgeschlagen', active_run=null, run_expires_at=null
    where id=p_case and owner_id=p_owner and active_run=p_run;
$$;

create function public.finish_case_analysis(
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
    legal_area=case when p_area in ('arbeitsrecht','mietrecht') then p_area::public.legal_area
      else legal_area end where id=p_case;
  return jsonb_build_object('analysis_id',analysis,'released',released);
end;
$$;
revoke all on function public.start_case_analysis(uuid,uuid,uuid),
  public.fail_case_analysis(uuid,uuid,uuid),
  public.finish_case_analysis(uuid,uuid,uuid,jsonb,text,text,jsonb,jsonb,jsonb,jsonb,text)
  from public,anon,authenticated;
grant execute on function public.start_case_analysis(uuid,uuid,uuid),
  public.fail_case_analysis(uuid,uuid,uuid),
  public.finish_case_analysis(uuid,uuid,uuid,jsonb,text,text,jsonb,jsonb,jsonb,jsonb,text)
  to service_role;

create table public.generated_documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  analysis_id uuid not null references public.case_analyses(id) on delete cascade,
  kind text not null check(kind in ('bericht','anschreiben')),
  title text not null,
  body text not null,
  input_revision bigint not null,
  template_version text not null default '1',
  created_at timestamptz not null default now(),
  approved_at timestamptz
);
create index generated_documents_case_idx on public.generated_documents(case_id,created_at desc);
alter table public.generated_documents enable row level security;
create policy generated_documents_owner on public.generated_documents for select to authenticated
  using(public.owns_case(case_id));
grant select on public.generated_documents to authenticated;
revoke insert,update,delete on public.generated_documents from anon,authenticated;
grant all on public.generated_documents to service_role;
