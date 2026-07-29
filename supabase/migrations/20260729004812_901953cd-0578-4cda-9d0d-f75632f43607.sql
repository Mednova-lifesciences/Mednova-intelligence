
CREATE TABLE public.icsr_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_ref text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'Open - triage',
  is_draft boolean NOT NULL DEFAULT false,
  assignee text,
  -- reporter
  reporter_name text,
  reporter_contact text,
  reporter_email text,
  source_type text,
  channel text,
  state text,
  country text DEFAULT 'Nigeria',
  received_date date,
  -- patient
  patient_initials text,
  patient_age text,
  patient_sex text,
  patient_weight text,
  patient_pregnancy text,
  patient_ethnicity text,
  -- product
  product text,
  manufacturer text,
  batch text,
  dose text,
  route text,
  dosage_form text,
  indication text,
  therapy_start date,
  therapy_stop date,
  product_id uuid,
  -- reaction
  event_description text,
  meddra_term text,
  onset_date date,
  stop_date date,
  outcome text,
  seriousness text,
  seriousness_criterion text,
  causality text,
  action_taken text,
  dechallenge text,
  rechallenge text,
  -- extra clinical
  medical_history text,
  concomitant_medication text,
  lab_results text,
  notes text,
  -- regulatory
  due_date date,
  submitted_date date,
  report_type text DEFAULT 'Initial',
  regulator text DEFAULT 'NAFDAC',
  submission_reference text,
  e2b_generated boolean NOT NULL DEFAULT false,
  cioms_generated boolean NOT NULL DEFAULT false,
  medwatch_generated boolean NOT NULL DEFAULT false,
  ai_narrative text,
  ai_medical_summary text,
  -- duplicate detection
  fingerprint text,
  duplicate_outcome text,
  duplicate_of text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.icsr_cases TO anon, authenticated;
GRANT ALL ON public.icsr_cases TO service_role;
ALTER TABLE public.icsr_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ICSR cases are publicly manageable" ON public.icsr_cases FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_icsr_cases_case_ref ON public.icsr_cases (case_ref);
CREATE INDEX idx_icsr_cases_status ON public.icsr_cases (status);
CREATE INDEX idx_icsr_cases_seriousness ON public.icsr_cases (seriousness);
CREATE INDEX idx_icsr_cases_product ON public.icsr_cases (product);
CREATE INDEX idx_icsr_cases_manufacturer ON public.icsr_cases (manufacturer);
CREATE INDEX idx_icsr_cases_country ON public.icsr_cases (country);
CREATE INDEX idx_icsr_cases_fingerprint ON public.icsr_cases (fingerprint);
CREATE INDEX idx_icsr_cases_created_at ON public.icsr_cases (created_at DESC);

CREATE TRIGGER trg_icsr_cases_updated_at BEFORE UPDATE ON public.icsr_cases
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.icsr_case_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES public.icsr_cases(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  message text NOT NULL,
  actor text NOT NULL DEFAULT 'MedNova User',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.icsr_case_events TO anon, authenticated;
GRANT ALL ON public.icsr_case_events TO service_role;
ALTER TABLE public.icsr_case_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ICSR events are publicly manageable" ON public.icsr_case_events FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_icsr_events_case ON public.icsr_case_events (case_id, created_at DESC);

CREATE TABLE public.icsr_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES public.icsr_cases(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text,
  file_size integer,
  storage_path text,
  uploaded_by text NOT NULL DEFAULT 'MedNova User',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.icsr_attachments TO anon, authenticated;
GRANT ALL ON public.icsr_attachments TO service_role;
ALTER TABLE public.icsr_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ICSR attachments are publicly manageable" ON public.icsr_attachments FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_icsr_attachments_case ON public.icsr_attachments (case_id);

CREATE TABLE public.icsr_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES public.icsr_cases(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Untitled note',
  body text NOT NULL,
  author text NOT NULL DEFAULT 'MedNova User',
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.icsr_notes TO anon, authenticated;
GRANT ALL ON public.icsr_notes TO service_role;
ALTER TABLE public.icsr_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ICSR notes are publicly manageable" ON public.icsr_notes FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_icsr_notes_case ON public.icsr_notes (case_id, created_at DESC);
CREATE TRIGGER trg_icsr_notes_updated_at BEFORE UPDATE ON public.icsr_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.icsr_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES public.icsr_cases(id) ON DELETE CASCADE,
  requested_at timestamptz NOT NULL DEFAULT now(),
  requested_by text NOT NULL DEFAULT 'MedNova User',
  due_date date,
  question text,
  response text,
  received_at timestamptz,
  email_id uuid,
  status text NOT NULL DEFAULT 'Requested',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.icsr_followups TO anon, authenticated;
GRANT ALL ON public.icsr_followups TO service_role;
ALTER TABLE public.icsr_followups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ICSR followups are publicly manageable" ON public.icsr_followups FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_icsr_followups_case ON public.icsr_followups (case_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.icsr_stats()
RETURNS json LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT json_build_object(
    'total', (SELECT count(*) FROM icsr_cases WHERE NOT is_draft),
    'drafts', (SELECT count(*) FROM icsr_cases WHERE is_draft),
    'unique_cases', (SELECT count(*) FROM icsr_cases WHERE NOT is_draft AND coalesce(duplicate_outcome,'') <> 'Confirmed duplicate'),
    'awaiting_dup_review', (SELECT count(*) FROM icsr_cases WHERE duplicate_outcome = 'Under review'),
    'serious', (SELECT count(*) FROM icsr_cases WHERE seriousness = 'Serious'),
    'submitted', (SELECT count(*) FROM icsr_cases WHERE submitted_date IS NOT NULL),
    'late', (SELECT count(*) FROM icsr_cases WHERE submitted_date IS NOT NULL AND due_date IS NOT NULL AND submitted_date > due_date),
    'overdue', (SELECT count(*) FROM icsr_cases WHERE submitted_date IS NULL AND due_date IS NOT NULL AND due_date < CURRENT_DATE),
    'open_cases', (SELECT count(*) FROM icsr_cases WHERE submitted_date IS NULL AND status <> 'Closed - duplicate' AND NOT is_draft),
    'by_channel', (SELECT COALESCE(json_agg(t), '[]'::json) FROM (
        SELECT COALESCE(channel,'—') AS label, count(*)::int AS count FROM icsr_cases GROUP BY 1 ORDER BY 2 DESC) t),
    'by_source', (SELECT COALESCE(json_agg(s), '[]'::json) FROM (
        SELECT COALESCE(source_type,'—') AS label, count(*)::int AS count FROM icsr_cases GROUP BY 1 ORDER BY 2 DESC) s)
  );
$$;
