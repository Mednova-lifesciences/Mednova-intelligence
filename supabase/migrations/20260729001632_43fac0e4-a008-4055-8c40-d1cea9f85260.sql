ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT 'Untitled note',
  ADD COLUMN IF NOT EXISTS author text NOT NULL DEFAULT 'MedNova User',
  ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS actor text NOT NULL DEFAULT 'MedNova User',
  ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE public.emails
  ADD COLUMN IF NOT EXISTS sent_by text NOT NULL DEFAULT 'MedNova User',
  ADD COLUMN IF NOT EXISTS opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS replied_at timestamptz;

DROP TRIGGER IF EXISTS notes_updated_at ON public.notes;
CREATE TRIGGER notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();