
DROP POLICY "Anyone can record a sync run" ON public.sync_history;
REVOKE INSERT ON public.sync_history FROM anon, authenticated;
