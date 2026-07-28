ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS opportunity_id bigint,
  ADD COLUMN IF NOT EXISTS manufacturer text,
  ADD COLUMN IF NOT EXISTS product text,
  ADD COLUMN IF NOT EXISTS service_type text,
  ADD COLUMN IF NOT EXISTS recommendation text,
  ADD COLUMN IF NOT EXISTS expiry_date date,
  ADD COLUMN IF NOT EXISTS source_product_id uuid REFERENCES public.products(id) ON DELETE CASCADE;

CREATE SEQUENCE IF NOT EXISTS public.opportunities_opportunity_id_seq OWNED BY public.opportunities.opportunity_id;
ALTER TABLE public.opportunities ALTER COLUMN opportunity_id SET DEFAULT nextval('public.opportunities_opportunity_id_seq');
GRANT USAGE, SELECT ON SEQUENCE public.opportunities_opportunity_id_seq TO anon, authenticated, service_role;

CREATE INDEX IF NOT EXISTS opportunities_opportunity_id_idx ON public.opportunities (opportunity_id);
CREATE INDEX IF NOT EXISTS opportunities_manufacturer_idx ON public.opportunities (manufacturer);
CREATE INDEX IF NOT EXISTS opportunities_service_type_idx ON public.opportunities (service_type);
CREATE INDEX IF NOT EXISTS opportunities_expiry_date_idx ON public.opportunities (expiry_date);

CREATE OR REPLACE FUNCTION public.opportunity_stats()
RETURNS json
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT json_build_object(
    'total', (SELECT count(*) FROM opportunities),
    'high_priority', (SELECT count(*) FROM opportunities WHERE priority = 'High'),
    'closing_soon', (SELECT count(*) FROM opportunities WHERE close_date IS NOT NULL AND close_date <= CURRENT_DATE + 90),
    'pipeline', (SELECT COALESCE(sum(estimated_value),0) FROM opportunities),
    'avg_value', (SELECT COALESCE(round(avg(estimated_value)),0) FROM opportunities)
  );
$$;