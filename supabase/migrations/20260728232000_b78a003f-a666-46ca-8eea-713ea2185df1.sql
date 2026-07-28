
CREATE OR REPLACE FUNCTION public.dashboard_stats()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'manufacturers', (SELECT count(DISTINCT manufacturer) FROM products WHERE manufacturer IS NOT NULL),
    'products', (SELECT count(*) FROM products),
    'opportunities', (SELECT count(*) FROM opportunities),
    'pipeline', (SELECT COALESCE(sum(estimated_value),0) FROM opportunities),
    'avg_value', (SELECT COALESCE(round(avg(estimated_value)),0) FROM opportunities),
    'high_priority', (SELECT count(*) FROM opportunities WHERE priority = 'high'),
    'expiring_12m', (SELECT count(*) FROM products WHERE expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 365),
    'by_category', (SELECT COALESCE(json_agg(t), '[]'::json) FROM (
        SELECT COALESCE(category,'N/A') AS category, count(*)::int AS count
        FROM products GROUP BY 1 ORDER BY 2 DESC) t),
    'top_renewals', (SELECT COALESCE(json_agg(r), '[]'::json) FROM (
        SELECT COALESCE(applicant,'—') AS applicant, count(*)::int AS count
        FROM renewals WHERE expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 365
        GROUP BY 1 ORDER BY 2 DESC LIMIT 8) r)
  );
$$;

GRANT EXECUTE ON FUNCTION public.dashboard_stats() TO anon, authenticated;
