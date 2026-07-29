import { createServerFn } from "@tanstack/react-start";

export const syncGreenBook = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { runGreenBookSync } = await import("@/lib/greenbook-sync");

  // Delegate to the new sync engine
  const result = await runGreenBookSync(supabaseAdmin);
  return result;
});
