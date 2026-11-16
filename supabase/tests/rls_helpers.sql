BEGIN;
DO $$
DECLARE owner uuid; other_owner uuid:=gen_random_uuid(); own_case uuid; other_case uuid;
BEGIN
  SELECT id INTO owner FROM auth.users LIMIT 1;
  INSERT INTO auth.users(id) VALUES(other_owner);
  INSERT INTO public.cases(owner_id,title,description) VALUES(owner,'Synthetic own case','Fictional') RETURNING id INTO own_case;
  INSERT INTO public.cases(owner_id,title,description) VALUES(other_owner,'Synthetic foreign case','Fictional') RETURNING id INTO other_case;
  ASSERT (SELECT proconfig @> ARRAY['search_path=""'] FROM pg_proc WHERE oid='public.set_updated_at()'::regprocedure);
  ASSERT NOT has_function_privilege('anon','public.owns_case(uuid)','execute');
  PERFORM set_config('request.jwt.claim.sub',owner::text,true);
  SET LOCAL ROLE authenticated;
  ASSERT public.owns_case(own_case);
  ASSERT NOT public.owns_case(other_case);
  ASSERT (SELECT count(*)=1 FROM public.cases WHERE id IN(own_case,other_case));
  UPDATE public.cases SET title='Updated synthetic title' WHERE id=own_case;
  ASSERT (SELECT updated_at IS NOT NULL FROM public.cases WHERE id=own_case);
  PERFORM set_config('request.jwt.claim.sub',other_owner::text,true);
  ASSERT NOT public.owns_case(own_case);
  ASSERT public.owns_case(other_case);
  RESET ROLE;
END;
$$;
ROLLBACK;
