"""Real Postgres overlap: account deletion waits for an in-flight Storage write."""
import subprocess
import sys
import time
import uuid

container = sys.argv[1]
assert container.startswith("recht-papier-db-test-"), "Disposable test container required"


def query(sql, *, check=True):
    result = subprocess.run(["docker", "exec", "-i", container, "psql", "-U", "postgres", "-At", "-v", "ON_ERROR_STOP=1"],
                            input=sql, capture_output=True, text=True, timeout=15)
    if check:
        assert result.returncode == 0, result.stderr
    return result


owner = str(uuid.uuid4())
query(f"insert into auth.users(id) values('{owner}');")
upload = subprocess.Popen(["docker", "exec", "-i", "-e", "PGAPPNAME=recht-papier-storage-race", container,
                           "psql", "-U", "postgres", "-At", "-v", "ON_ERROR_STOP=1"],
                          stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
try:
    upload.stdin.write(f"begin; set local role authenticated; select set_config('request.jwt.claim.sub','{owner}',true); "
                       f"insert into storage.objects(bucket_id,name) values('case-documents','{owner}/in-flight.pdf'); "
                       "select pg_sleep(3); commit;")
    upload.stdin.close()
    limit = time.monotonic() + 10
    while time.monotonic() < limit:
        if query("select exists(select 1 from pg_stat_activity where application_name='recht-papier-storage-race' and wait_event='PgSleep');").stdout.strip() == "t":
            break
        time.sleep(0.03)
    else:
        raise AssertionError("Storage write did not reach the synchronization point")
    blocked = query(f"set lock_timeout='100ms'; set role service_role; select public.begin_account_deletion('{owner}');", check=False)
    assert blocked.returncode != 0 and "lock timeout" in blocked.stderr, blocked.stderr
    assert upload.wait(timeout=15) == 0, upload.stderr.read()
    assert query(f"set role service_role; select public.begin_account_deletion('{owner}');").stdout.strip().endswith("t")
    late = query(f"set role authenticated; select set_config('request.jwt.claim.sub','{owner}',false); "
                 f"insert into storage.objects(bucket_id,name) values('case-documents','{owner}/late.pdf');", check=False)
    assert late.returncode != 0 and "row-level security" in late.stderr, late.stderr
    assert query(f"select count(*) from storage.objects where name like '{owner}/%';").stdout.strip() == "1"
    print("Concurrent Storage write holds the barrier; deletion waits, then late writes are denied.")
finally:
    if upload.poll() is None:
        upload.terminate()
        upload.wait(timeout=15)
    query(f"delete from storage.objects where name like '{owner}/%'; delete from auth.users where id='{owner}';")
