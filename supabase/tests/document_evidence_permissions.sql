BEGIN;
DO $$
DECLARE owner uuid; cid uuid; did uuid;
BEGIN
  SELECT id INTO owner FROM auth.users LIMIT 1;
  INSERT INTO public.cases(owner_id,title,description)
    VALUES(owner,'Synthetic evidence permissions','Fictional') RETURNING id INTO cid;
  PERFORM set_config('request.jwt.claim.sub',owner::text,true);
  ASSERT has_column_privilege('authenticated','public.case_documents','storage_path','insert');
  ASSERT NOT has_column_privilege('authenticated','public.case_documents','extracted_text','insert');
  ASSERT NOT has_column_privilege('authenticated','public.case_documents','extracted_pages','update');
  ASSERT NOT has_column_privilege('authenticated','public.case_documents','storage_path','update');
  SET LOCAL ROLE authenticated;
  INSERT INTO public.case_documents(case_id,file_name,storage_path)
    VALUES(cid,'fictional.pdf',owner::text||'/'||cid::text||'/fictional.pdf') RETURNING id INTO did;
  BEGIN
    UPDATE public.case_documents SET extracted_text='Forged extraction' WHERE id=did;
    RAISE EXCEPTION 'client_extraction_write_accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO storage.objects(bucket_id,name)
      VALUES('case-documents',owner::text||'/'||cid::text||'/fictional.pdf');
    RAISE EXCEPTION 'referenced_original_replacement_accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;
  SET LOCAL ROLE service_role;
  UPDATE public.case_documents SET extracted_text='Server extraction',extracted_pages='["Server extraction"]' WHERE id=did;
  ASSERT (SELECT extracted_text='Server extraction' FROM public.case_documents WHERE id=did);
  RESET ROLE;
END;
$$;
ROLLBACK;
