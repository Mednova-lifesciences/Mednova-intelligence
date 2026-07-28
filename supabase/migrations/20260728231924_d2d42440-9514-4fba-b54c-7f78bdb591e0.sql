
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_name TEXT NOT NULL,
  manufacturer TEXT,
  applicant TEXT,
  category TEXT,
  dosage_form TEXT,
  route TEXT,
  nafdac_number TEXT,
  registration_date DATE,
  approval_date DATE,
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'Active',
  strength TEXT,
  pack_size TEXT,
  composition TEXT,
  last_synced TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.sync_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'success',
  records_added INTEGER NOT NULL DEFAULT 0,
  records_updated INTEGER NOT NULL DEFAULT 0,
  message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company TEXT NOT NULL,
  category TEXT,
  product_count INTEGER NOT NULL DEFAULT 0,
  estimated_value NUMERIC NOT NULL DEFAULT 0,
  services TEXT,
  opportunity_type TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  priority TEXT NOT NULL DEFAULT 'low',
  probability INTEGER NOT NULL DEFAULT 40,
  close_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.renewals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  nafdac_number TEXT,
  category TEXT,
  applicant TEXT,
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_expiry ON public.products(expiry_date);
CREATE INDEX idx_products_name ON public.products(product_name);
CREATE INDEX idx_renewals_expiry ON public.renewals(expiry_date);

GRANT SELECT ON public.products TO anon, authenticated;
GRANT SELECT ON public.opportunities TO anon, authenticated;
GRANT SELECT ON public.renewals TO anon, authenticated;
GRANT SELECT, INSERT ON public.sync_history TO anon, authenticated;
GRANT ALL ON public.products TO service_role;
GRANT ALL ON public.opportunities TO service_role;
GRANT ALL ON public.renewals TO service_role;
GRANT ALL ON public.sync_history TO service_role;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renewals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products are publicly readable" ON public.products FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Opportunities are publicly readable" ON public.opportunities FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Renewals are publicly readable" ON public.renewals FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Sync history is publicly readable" ON public.sync_history FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can record a sync run" ON public.sync_history FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Seed Green Book style product data
INSERT INTO public.products (
  product_name, manufacturer, applicant, category, dosage_form, route,
  nafdac_number, registration_date, approval_date, expiry_date, status,
  strength, pack_size, composition, last_synced
)
SELECT
  base_name || ' ' || form || CASE WHEN i % 5 = 0 THEN '##' WHEN i % 7 = 0 THEN '**' ELSE '' END,
  CASE WHEN i % 23 = 0 THEN NULL ELSE company END,
  company,
  category,
  form,
  route,
  prefix || '-' || lpad(((i * 37) % 9000 + 100)::text, 4, '0'),
  (DATE '2026-04-28' - ((i % 900))::int),
  (DATE '2026-04-28' - ((i % 900))::int),
  (DATE '2026-08-02' + ((i * 13) % 1800)::int),
  CASE WHEN i % 6 = 0 THEN 'Inactive' ELSE 'Active' END,
  ((i % 9 + 1) * 25)::text || ' mg',
  CASE WHEN i % 4 = 0 THEN NULL ELSE (10 * (i % 5 + 1))::text || ' units' END,
  'Each ' || lower(form) || ' contains: ' || base_name || ' ' || ((i % 9 + 1) * 25)::text || ' mg',
  now()
FROM generate_series(1, 1400) AS i,
LATERAL (
  SELECT
    (ARRAY['Novartis Nigeria Limited','Emzor Pharmaceutical Industries Limited','Phillips Pharmaceuticals (Nigeria) Limited','Krishat Pharma Industries Limited','Drugfield Pharmaceuticals Limited','Onifam Laboratories Limited','Fidson Healthcare PLC','Afrab-Chem Limited','Mega Lifesciences Nigeria Limited','SKG - Pharma Ltd','Bio-Generics Nigeria Limited','Mankind Life-Sciences Limited','Me Cure Industries Limited','Geneith Pharmaceuticals Limited','Leotetra Healthcare Ltd','Savocent Pharma Ltd','Avro Pharma Limited','Nkoyo Chemists Ltd','Ajanta Pharma Nigeria Limited','Uche St. Pharmaceutical Company Limited','Freshborn Industries Ltd','Micro Nova Pharmaceuticals Ind Ltd','Morehope Pharma Limited','Emcure Nigeria Limited','SK Medicines Limited'])[(i % 25) + 1] AS company,
    (ARRAY['Drugs','Drugs','Drugs','Drugs','Medical devices','Herbals and Nutraceuticals','Vaccines and Biologics','Veterinary','N/A'])[(i % 9) + 1] AS category,
    (ARRAY['Tablet','Capsule','Gel','Cream','Ointment','Syrup','Injection','Solution/Drops','Powder for suspension'])[(i % 9) + 1] AS form,
    (ARRAY['Oral','Oral','Topical','Topical','Ophthalmic','Parenteral','Oral'])[(i % 7) + 1] AS route,
    (ARRAY['A4','B4','C4','04','A11'])[(i % 5) + 1] AS prefix,
    (ARRAY['Koyorine','Avrofen','Histolat','Bactend','Ursoliv','Pain Doctor','Dapostal','EMVIT-C','Quinine Sulphate','T-Bet','Zinafix','Flucytosine','Omeflux','Etoglob','Gramicol','Momento','G-Pent','Freshborn Ceftriaxone','Apmod','Crinone','Avro Paracetamol','Freshbact','Terlev-750','Amlodipine Besylate','Foseal-800','Glotraz','Unidexal-9','Sivotac','Aphazole','Tonomycin','Diabend','Taxiject','Terbinafine'])[(i % 33) + 1] AS base_name
) AS picks;

-- Seed opportunities generated from product data
INSERT INTO public.opportunities (company, category, product_count, estimated_value, services, opportunity_type, status, priority, probability, close_date)
SELECT
  manufacturer,
  'Drugs',
  count(*)::int,
  count(*) * 500000,
  'Registration support, renewal monitoring',
  'Manufacturer Renewal Watch',
  'active',
  CASE WHEN count(*) * 500000 > 5000000 THEN 'high' WHEN count(*) * 500000 > 1000000 THEN 'medium' ELSE 'low' END,
  CASE WHEN count(*) * 500000 > 5000000 THEN 80 WHEN count(*) * 500000 > 1000000 THEN 60 ELSE 40 END,
  (CURRENT_DATE + 90)
FROM public.products
WHERE manufacturer IS NOT NULL
GROUP BY manufacturer;

-- Seed renewals from products expiring
INSERT INTO public.renewals (product_id, product_name, nafdac_number, category, applicant, expiry_date, status)
SELECT id, product_name, nafdac_number, category, applicant, expiry_date, status
FROM public.products
WHERE expiry_date IS NOT NULL;

INSERT INTO public.sync_history (status, records_added, records_updated, message, started_at, finished_at)
VALUES ('success', 0, 0, 'Green Book sync completed', now() - interval '2 hours', now() - interval '2 hours');
