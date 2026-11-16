alter function public.set_updated_at() set search_path = '';

-- Session identity is constant for a statement, not a per-row computation.
alter policy profiles_self on public.profiles
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
alter policy cases_owner on public.cases
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

-- owns_case intentionally remains callable: RLS child policies use its
-- fixed-search-path, caller-identity-scoped boolean, never arbitrary data.
