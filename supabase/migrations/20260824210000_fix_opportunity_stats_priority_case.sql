-- opportunity_stats() compared priority against 'High' (capital H), but the
-- column is always written lowercase ('high'/'medium'/'low' -- see
-- src/lib/greenbook-sync.ts). Postgres string comparison is case-sensitive,
-- so high_priority always returned 0 regardless of actual data.
-- dashboard_stats() already used the correct lowercase comparison; this
-- just brings opportunity_stats() in line with it.
CREATE OR REPLACE FUNCTION public.opportunity_stats()
RETURNS json
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT json_build_object(
    'total', (SELECT count(*) FROM opportunities),
    'high_priority', (SELECT count(*) FROM opportunities WHERE priority = 'high'),
    'closing_soon', (SELECT count(*) FROM opportunities WHERE close_date IS NOT NULL AND close_date <= CURRENT_DATE + 90),
    'pipeline', (SELECT COALESCE(sum(estimated_value),0) FROM opportunities),
    'avg_value', (SELECT COALESCE(round(avg(estimated_value)),0) FROM opportunities)
  );
$$;
