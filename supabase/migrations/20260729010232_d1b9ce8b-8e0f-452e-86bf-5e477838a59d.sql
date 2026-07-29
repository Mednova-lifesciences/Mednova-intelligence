CREATE TABLE public.gap_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Untitled assessment',
  client text NOT NULL DEFAULT '',
  assessor text NOT NULL DEFAULT '',
  assessment_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gap_assessments TO anon, authenticated;
GRANT ALL ON public.gap_assessments TO service_role;
ALTER TABLE public.gap_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gap assessments are publicly manageable" ON public.gap_assessments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.gap_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.gap_assessments(id) ON DELETE CASCADE,
  ref text NOT NULL,
  evidence text NOT NULL DEFAULT '',
  current_maturity smallint,
  target_maturity smallint NOT NULL DEFAULT 3,
  risk text NOT NULL DEFAULT '',
  finding text NOT NULL DEFAULT '',
  action text NOT NULL DEFAULT '',
  owner text NOT NULL DEFAULT '',
  due_date date,
  status text NOT NULL DEFAULT 'Open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, ref)
);

CREATE INDEX gap_responses_assessment_idx ON public.gap_responses(assessment_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gap_responses TO anon, authenticated;
GRANT ALL ON public.gap_responses TO service_role;
ALTER TABLE public.gap_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gap responses are publicly manageable" ON public.gap_responses FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_gap_assessments_updated_at BEFORE UPDATE ON public.gap_assessments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_gap_responses_updated_at BEFORE UPDATE ON public.gap_responses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();