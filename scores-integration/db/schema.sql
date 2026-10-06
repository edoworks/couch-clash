-- REVIEW PROPOSAL ONLY. Not a generated Supabase migration; never auto-apply remotely.
-- Assumes existing Supabase anon/authenticated/service_role roles. service_role must
-- have BYPASSRLS (standard Supabase). No auth identities or bootstrap here.
BEGIN;
CREATE SCHEMA cc_scores_private;
REVOKE ALL ON SCHEMA cc_scores_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA cc_scores_private TO service_role;
CREATE TABLE cc_scores_private.cache (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  enabled boolean NOT NULL DEFAULT false,
  season integer NOT NULL DEFAULT 2026 CHECK (season BETWEEN 2000 AND 2200),
  week integer NOT NULL DEFAULT 4 CHECK (week BETWEEN 1 AND 22),
  snapshot jsonb,
  fetched_at timestamptz,
  next_attempt_at timestamptz,
  lease_token uuid,
  lease_until timestamptz,
  lease_season integer,
  lease_week integer,
  last_error text CHECK (last_error IN ('unauthorized','rate_limited','upstream','timeout','invalid_response','oversized','unavailable')),
  CHECK (snapshot IS NULL OR (jsonb_typeof(snapshot) = 'object' AND
    jsonb_typeof(snapshot->'games') = 'array' AND snapshot ? 'games' AND
    octet_length(snapshot::text) <= 262144))
);
ALTER TABLE cc_scores_private.cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE cc_scores_private.cache FORCE ROW LEVEL SECURITY;
REVOKE ALL ON cc_scores_private.cache FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, UPDATE ON cc_scores_private.cache TO service_role;
INSERT INTO cc_scores_private.cache (singleton) VALUES (true);

-- Administrator scope edits cannot expose a previous week's snapshot or lease.
-- Keep next_attempt_at intact: changing configuration cannot evade global throttling.
CREATE FUNCTION cc_scores_private.invalidate_scope() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF NEW.season IS DISTINCT FROM OLD.season OR NEW.week IS DISTINCT FROM OLD.week THEN
    NEW.snapshot := NULL;
    NEW.fetched_at := NULL;
    NEW.last_error := NULL;
    NEW.lease_token := NULL;
    NEW.lease_until := NULL;
    NEW.lease_season := NULL;
    NEW.lease_week := NULL;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION cc_scores_private.invalidate_scope() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION cc_scores_private.invalidate_scope() TO service_role;
CREATE TRIGGER invalidate_scope BEFORE UPDATE OF season, week ON cc_scores_private.cache
FOR EACH ROW EXECUTE FUNCTION cc_scores_private.invalidate_scope();

CREATE FUNCTION public.cc_scores_read() RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT jsonb_build_object('enabled', enabled, 'season', season, 'week', week,
    'snapshot', snapshot, 'fetchedAt', fetched_at, 'nextAttemptAt', next_attempt_at, 'lastError', last_error)
  FROM cc_scores_private.cache WHERE singleton = true;
$$;

CREATE FUNCTION public.cc_scores_claim() RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE r cc_scores_private.cache%ROWTYPE; t timestamptz; token uuid;
BEGIN
  SELECT * INTO STRICT r FROM cc_scores_private.cache WHERE singleton = true FOR UPDATE;
  t := clock_timestamp();
  IF NOT r.enabled OR r.next_attempt_at > t OR r.lease_until > t THEN
    RETURN public.cc_scores_read() || jsonb_build_object('acquired', false);
  END IF;
  token := gen_random_uuid();
  UPDATE cc_scores_private.cache SET lease_token = token,
    lease_until = t + interval '15 seconds', lease_season = season, lease_week = week,
    next_attempt_at = t + interval '60 seconds' WHERE singleton = true;
  RETURN public.cc_scores_read() || jsonb_build_object('acquired', true, 'token', token);
END;
$$;

CREATE FUNCTION public.cc_scores_finish(p_token uuid, p_snapshot jsonb DEFAULT NULL,
  p_error text DEFAULT NULL, p_cooldown_seconds integer DEFAULT 60) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE r cc_scores_private.cache%ROWTYPE; t timestamptz; error_code text;
BEGIN
  SELECT * INTO STRICT r FROM cc_scores_private.cache WHERE singleton = true FOR UPDATE;
  t := clock_timestamp();
  IF NOT r.enabled OR p_token IS NULL OR r.lease_token IS DISTINCT FROM p_token
    OR r.lease_until IS NULL OR r.lease_until <= t
    OR r.lease_season IS DISTINCT FROM r.season OR r.lease_week IS DISTINCT FROM r.week THEN
    RETURN false;
  END IF;
  -- Only enumerated error codes ever persist; raw provider bodies cannot be logged here.
  IF p_error IS NOT NULL THEN
    error_code := CASE WHEN p_error IN ('unauthorized','rate_limited','upstream','timeout',
      'invalid_response','oversized','unavailable') THEN p_error ELSE 'upstream' END;
  ELSIF p_snapshot IS NULL OR jsonb_typeof(p_snapshot) <> 'object'
    OR NOT (p_snapshot ? 'games') OR jsonb_typeof(p_snapshot->'games') <> 'array' THEN
    error_code := 'invalid_response';
  ELSIF octet_length(p_snapshot::text) > 262144 THEN
    error_code := 'oversized';
  END IF;
  UPDATE cc_scores_private.cache SET
    snapshot = CASE WHEN error_code IS NULL THEN p_snapshot ELSE snapshot END,
    fetched_at = CASE WHEN error_code IS NULL THEN t ELSE fetched_at END,
    next_attempt_at = CASE WHEN error_code IS NULL THEN next_attempt_at ELSE
      greatest(next_attempt_at, t + make_interval(secs => greatest(60, least(3600, coalesce(p_cooldown_seconds,60))))) END,
    last_error = error_code, lease_token = NULL, lease_until = NULL,
    lease_season = NULL, lease_week = NULL WHERE singleton = true;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.cc_scores_read() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cc_scores_claim() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cc_scores_finish(uuid,jsonb,text,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cc_scores_read(), public.cc_scores_claim(),
  public.cc_scores_finish(uuid,jsonb,text,integer) TO service_role;
COMMIT;
