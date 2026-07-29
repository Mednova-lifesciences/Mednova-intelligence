
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  manufacturer text,
  category text,
  country text,
  portfolio text,
  estimated_value numeric NOT NULL DEFAULT 0,
  priority text,
  probability integer NOT NULL DEFAULT 0,
  source_opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL,
  product text,
  status text NOT NULL DEFAULT 'Prospect',
  stage text NOT NULL DEFAULT 'Lead',
  score integer NOT NULL DEFAULT 0,
  website text,
  email text,
  phone text,
  linkedin text,
  description text,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  next_followup_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX companies_name_unique ON public.companies (lower(name));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO anon, authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Companies are publicly manageable" ON public.companies FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text,
  department text,
  email text,
  phone text,
  linkedin text,
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO anon, authenticated;
GRANT ALL ON public.contacts TO service_role;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Contacts are publicly manageable" ON public.contacts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  task_type text NOT NULL DEFAULT 'Follow-up',
  due_date date,
  assignee text,
  state text NOT NULL DEFAULT 'Not Started',
  completed_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO anon, authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tasks are publicly manageable" ON public.tasks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.pipeline_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  from_stage text,
  to_stage text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pipeline_stage_history TO anon, authenticated;
GRANT ALL ON public.pipeline_stage_history TO service_role;
ALTER TABLE public.pipeline_stage_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Stage history is publicly manageable" ON public.pipeline_stage_history FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO anon, authenticated;
GRANT ALL ON public.activities TO service_role;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Activities are publicly manageable" ON public.activities FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  to_address text,
  cc_address text,
  bcc_address text,
  subject text,
  body text,
  signature text,
  status text NOT NULL DEFAULT 'draft',
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emails TO anon, authenticated;
GRANT ALL ON public.emails TO service_role;
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Emails are publicly manageable" ON public.emails FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO anon, authenticated;
GRANT ALL ON public.notes TO service_role;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Notes are publicly manageable" ON public.notes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO anon, authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reports are publicly manageable" ON public.reports FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  due_date date,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.followups TO anon, authenticated;
GRANT ALL ON public.followups TO service_role;
ALTER TABLE public.followups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Followups are publicly manageable" ON public.followups FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER emails_updated_at BEFORE UPDATE ON public.emails FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.purge_deleted_tasks()
RETURNS void
LANGUAGE sql
SET search_path = public
AS $$
  DELETE FROM public.tasks WHERE state = 'Deleted' AND deleted_at IS NOT NULL AND deleted_at < now() - interval '2 days';
$$;
GRANT EXECUTE ON FUNCTION public.purge_deleted_tasks() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.crm_dashboard_stats()
RETURNS json
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT json_build_object(
    'companies_added', (SELECT count(*) FROM companies),
    'active_leads', (SELECT count(*) FROM companies WHERE stage = 'Lead'),
    'active_opportunities', (SELECT count(*) FROM companies WHERE stage NOT IN ('Won','Lost')),
    'won_clients', (SELECT count(*) FROM companies WHERE stage = 'Won'),
    'lost_clients', (SELECT count(*) FROM companies WHERE stage = 'Lost'),
    'tasks_due', (SELECT count(*) FROM tasks WHERE state IN ('Not Started','In Progress') AND due_date IS NOT NULL AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 3),
    'tasks_open', (SELECT count(*) FROM tasks WHERE state IN ('Not Started','In Progress')),
    'tasks_completed', (SELECT count(*) FROM tasks WHERE state = 'Completed'),
    'meetings_scheduled', (SELECT count(*) FROM tasks WHERE state <> 'Deleted' AND task_type = 'Meeting' AND due_date >= CURRENT_DATE),
    'pipeline_value', (SELECT COALESCE(sum(estimated_value),0) FROM companies WHERE stage <> 'Lost'),
    'weighted_value', (SELECT COALESCE(round(sum(estimated_value * probability / 100.0)),0) FROM companies WHERE stage <> 'Lost')
  );
$$;
GRANT EXECUTE ON FUNCTION public.crm_dashboard_stats() TO anon, authenticated, service_role;
