#!/usr/bin/env python3
"""Local-only PostgreSQL integration checks; no ports/network/downloads/remote config."""
import concurrent.futures
import json
from pathlib import Path
import subprocess
import time
import uuid

ROOT = Path(__file__).resolve().parents[1]
DOCKER = '/Applications/Docker.app/Contents/Resources/bin/docker'
NAME = 'cc-scores-test-' + uuid.uuid4().hex[:12]
checks = []

def command(*args, input=None, check=True):
    result = subprocess.run([DOCKER, *args], input=input, text=True, capture_output=True)
    if check and result.returncode:
        raise RuntimeError(result.stderr.strip())
    return result

def sql(query, role=None, check=True):
    prefix = f'SET ROLE {role};\n' if role else ''
    return command('exec', '-i', NAME, 'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', input=prefix+query, check=check)

def value(query, role='service_role'):
    return sql(query, role).stdout.strip()

def rpc(name, args=''):
    return json.loads(value(f'SELECT public.cc_scores_{name}({args});'))

def ok(label, condition):
    assert condition, label
    checks.append(label)
    print('PASS', label, flush=True)

def reset():
    sql("UPDATE cc_scores_private.cache SET enabled=true, season=2026, week=4, snapshot=NULL, fetched_at=NULL, next_attempt_at=NULL, lease_token=NULL, lease_until=NULL, lease_season=NULL, lease_week=NULL,last_error=NULL;")

def ready():
    sql("UPDATE cc_scores_private.cache SET next_attempt_at=clock_timestamp()-interval '1 second',lease_until=clock_timestamp()-interval '1 second';")

def finish(token, snapshot='{"games":[]}', error=None, cooldown=60):
    # Test constants only; no external input.
    snap = 'NULL' if snapshot is None else "'"+snapshot.replace("'", "''")+"'::jsonb"
    err = 'NULL' if error is None else "'"+error.replace("'", "''")+"'"
    return value(f"SELECT public.cc_scores_finish('{token}',{snap},{err},{cooldown});") == 't'

try:
    command('run', '--detach', '--rm', '--pull', 'never', '--network', 'none', '--name', NAME,
            '--env', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:17-alpine')
    for _ in range(100):
        if command('exec', NAME, 'pg_isready', '-U', 'postgres', check=False).returncode == 0:
            break
        time.sleep(.1)
    else:
        raise RuntimeError('Local PostgreSQL did not become ready')
    sql((ROOT/'tests/db-local-bootstrap.sql').read_text())
    sql((ROOT/'db/schema.sql').read_text())
    print('PostgreSQL:', value('SHOW server_version;', None))
    for role in ('anon', 'authenticated'):
        for query in ('SELECT * FROM cc_scores_private.cache;', 'UPDATE cc_scores_private.cache SET enabled=true;',
                      'SELECT public.cc_scores_read();', 'SELECT public.cc_scores_claim();',
                      'SELECT public.cc_scores_finish(NULL);'):
            result = sql(query, role, check=False)
            ok(f'{role} denied {query.split(";")[0]}', result.returncode != 0 and 'permission denied' in result.stderr)
    ok('forced RLS enabled and zero policies', value("SELECT relrowsecurity AND relforcerowsecurity AND NOT EXISTS(SELECT 1 FROM pg_policy WHERE polrelid=c.oid) FROM pg_class c WHERE oid='cc_scores_private.cache'::regclass;") == 't')
    ok('all RPCs invoker with empty search_path', value("SELECT count(*)=3 AND bool_and(NOT prosecdef AND proconfig=ARRAY['search_path=\"\"']) FROM pg_proc WHERE proname IN ('cc_scores_read','cc_scores_claim','cc_scores_finish');") == 't')
    ok('service role cannot insert/delete or create in private schema', value("SELECT NOT has_table_privilege(current_user,'cc_scores_private.cache','INSERT') AND NOT has_table_privilege(current_user,'cc_scores_private.cache','DELETE') AND NOT has_schema_privilege(current_user,'cc_scores_private','CREATE');") == 't')
    default = rpc('read')
    ok('disabled seeded 2026 week 4 and no snapshot', default == dict(enabled=False, season=2026,week=4,snapshot=None,fetchedAt=None,nextAttemptAt=None,lastError=None))
    ok('disabled claim denied', not rpc('claim')['acquired'])
    reset()
    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
        claims = list(pool.map(lambda _: rpc('claim'), range(12)))
    winners = [c for c in claims if c['acquired']]
    ok('12 concurrent real connections grant exactly one lease', len(winners)==1)
    winner = winners[0]
    ok('60-second throttle and 15-second lease persisted', value("SELECT next_attempt_at-lease_until=interval '45 seconds' FROM cc_scores_private.cache;") == 't')
    ok('valid success accepted', finish(winner['token'], '{"games":[{"id":"last-good"}]}'))
    state = rpc('read')
    ok('success stores snapshot and timestamp without extending throttle', state['snapshot']['games'][0]['id']=='last-good' and state['fetchedAt'] and state['nextAttemptAt']==winner['nextAttemptAt'])
    ok('repeated token cannot finish', not finish(winner['token']))
    ok('immediate repeat claim throttled', not rpc('claim')['acquired'])
    ready()
    token = rpc('claim')['token']
    ok('provider failure accepted', finish(token, None, 'upstream'))
    ok('failure retains last good and fetched timestamp', all(rpc('read')[k]==state[k] for k in ('snapshot','fetchedAt')))
    ok('failed attempt throttles', not rpc('claim')['acquired'])
    ok('failure code persists in reads and claims', rpc('read')['lastError']=='upstream' and rpc('claim')['lastError']=='upstream')
    ready(); token=rpc('claim')['token']; finish(token)
    ok('successful refresh clears persisted error', rpc('read')['lastError'] is None)
    for seconds, expected in ((300,300),(-1,60),(99999,3600)):
        ready(); token=rpc('claim')['token']; finish(token,None,'rate_limited',seconds)
        ok(f'429 cooldown {seconds} clamps to {expected}', value(f"SELECT next_attempt_at-clock_timestamp() BETWEEN interval '{expected-5} seconds' AND interval '{expected} seconds' FROM cc_scores_private.cache;")=='t')
    ready(); token=rpc('claim')['token']
    sql("UPDATE cc_scores_private.cache SET lease_until=clock_timestamp()-interval '1 second';")
    ok('expired crash stays throttled', not rpc('claim')['acquired'])
    ok('expired completion denied', not finish(token))
    ready(); new_token=rpc('claim')['token']
    ok('crash retry after cooldown uses new token', new_token!=token)
    ok('old completion cannot overwrite new lease', not finish(token))
    sql('UPDATE cc_scores_private.cache SET enabled=false;')
    ok('kill switch blocks claim and active finish', not rpc('claim')['acquired'] and not finish(new_token))
    reset(); token=rpc('claim')['token']; finish(token)
    ready(); token=rpc('claim')['token']; finish(token,None,'upstream')
    ready(); token=rpc('claim')['token']; before_scope=rpc('read')
    sql('UPDATE cc_scores_private.cache SET week=5;')
    changed=rpc('read')
    ok('config change clears old snapshot timestamp and error', changed['snapshot'] is None and changed['fetchedAt'] is None and changed['lastError'] is None)
    ok('config change clears lease and preserves global cooldown', value('SELECT lease_token IS NULL AND lease_until IS NULL FROM cc_scores_private.cache;')=='t' and changed['nextAttemptAt']==before_scope['nextAttemptAt'] and not rpc('claim')['acquired'])
    ok('config change rejects old lease completion', not finish(token))
    ready(); token=rpc('claim')['token']; finish(token)
    before_scope=rpc('read'); sql('UPDATE cc_scores_private.cache SET season=2027;')
    changed=rpc('read')
    ok('season change also invalidates snapshot and preserves cooldown', changed['snapshot'] is None and changed['nextAttemptAt']==before_scope['nextAttemptAt'])
    for snapshot, error, expected in ((None,None,'invalid_response'),('{}',None,'invalid_response'),('{"games":{}}',None,'invalid_response'),('{"games":[],"pad":"'+'x'*262144+'"}',None,'oversized'),(None,'raw-secret-provider-body','upstream')):
        reset(); token=rpc('claim')['token']; ok(f'sanitized completion {expected}', finish(token,snapshot,error) and value('SELECT last_error FROM cc_scores_private.cache;')==expected)
    # Lock-boundary test: expiry is checked after waiting for a held row lock.
    reset(); token=rpc('claim')['token']
    sql("UPDATE cc_scores_private.cache SET lease_until=clock_timestamp()+interval '1 second';")
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        holding=pool.submit(sql,"BEGIN; SELECT 1 FROM cc_scores_private.cache FOR UPDATE; SELECT pg_sleep(2); COMMIT;")
        time.sleep(.25)
        ok('expiry checked after row lock wait', not finish(token))
        holding.result()
    print(f'ALL {len(checks)} DATABASE CHECKS PASSED')
finally:
    result=command('rm', '--force', NAME, check=False)
    print('Disposable container removed:', result.returncode == 0)
