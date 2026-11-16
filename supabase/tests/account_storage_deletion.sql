BEGIN;
DO $$
DECLARE owner uuid; path text;
BEGIN
  SELECT id INTO owner FROM auth.users LIMIT 1;
  path:=owner::text||'/synthetic-delete/no-metadata.pdf';
  ASSERT NOT has_function_privilege('authenticated','public.begin_account_deletion(uuid)','execute');
  ASSERT NOT has_column_privilege('authenticated','public.profiles','deletion_pending','update');
  PERFORM set_config('request.jwt.claim.sub',owner::text,true);
  SET LOCAL ROLE authenticated;
  INSERT INTO storage.objects(bucket_id,name) VALUES('case-documents',path);
  RESET ROLE;
  ASSERT public.begin_account_deletion(owner);
  ASSERT public.begin_account_deletion(owner); -- Retrying cleanup does not reopen uploads.
  SET LOCAL ROLE authenticated;
  BEGIN
    INSERT INTO storage.objects(bucket_id,name) VALUES('case-documents',path||'.second');
    RAISE EXCEPTION 'pending_deletion_upload_accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  ASSERT NOT EXISTS(SELECT 1 FROM storage.objects WHERE name=path);
  BEGIN
    DELETE FROM public.profiles WHERE id=owner;
    RAISE EXCEPTION 'client_deleted_deletion_barrier';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;
  DELETE FROM storage.objects WHERE name=path;
  DELETE FROM auth.users WHERE id=owner;
  SET LOCAL ROLE authenticated;
  BEGIN
    INSERT INTO storage.objects(bucket_id,name) VALUES('case-documents',path||'.old-token');
    RAISE EXCEPTION 'deleted_account_token_upload_accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;
END;
$$;
ROLLBACK;
