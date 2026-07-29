-- Add greenbook_raw audit table to store immutable source payloads
CREATE TABLE public.greenbook_raw (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nafdac_product_id BIGINT,
  nafdac_number TEXT,
  raw_json JSONB NOT NULL,
  checksum TEXT NOT NULL,
  sync_batch_id UUID,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_greenbook_raw_nafdac_product_id ON public.greenbook_raw(nafdac_product_id);
CREATE INDEX IF NOT EXISTS idx_greenbook_raw_nafdac_number ON public.greenbook_raw(nafdac_number);

-- Restrict access: only service_role may write/read raw payloads by default
GRANT ALL ON public.greenbook_raw TO service_role;
REVOKE ALL ON public.greenbook_raw FROM anon, authenticated;

ALTER TABLE public.greenbook_raw ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert/read greenbook raw" ON public.greenbook_raw
  FOR ALL USING ( current_setting('role') = 'service_role' ) WITH CHECK ( current_setting('role') = 'service_role' );

-- Note: `current_setting('role')` condition is a light guard; the server-side client uses the service role key.
