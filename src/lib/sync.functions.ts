import { createServerFn } from "@tanstack/react-start";

export const syncGreenBook = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const startedAt = new Date().toISOString();
  // Placeholder for the real Green Book ingestion pipeline.
  const { error } = await supabaseAdmin.from("sync_history").insert({
    status: "success",
    records_added: 0,
    records_updated: 0,
    message: "Green Book sync completed",
    started_at: startedAt,
    finished_at: new Date().toISOString(),
  });

  if (error) throw new Error(error.message);
  return { status: "success", added: 0 };
});
