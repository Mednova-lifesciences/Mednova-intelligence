import { createServerFn } from "@tanstack/react-start";

/**
 * Processes one page of the Green Book sync. Vercel serverless functions
 * have a hard execution time limit that the full ~17k-product catalog
 * cannot complete within in a single call, so the client calls this
 * repeatedly (see the dashboard's sync mutation) until `done` is true.
 */
export const syncGreenBookBatch = createServerFn({ method: "POST" })
  .inputValidator((input: { batchId: string; start: number; length?: number }) => input)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { syncGreenBookBatch: run } = await import("@/lib/greenbook-sync");
    return run(supabaseAdmin, data.batchId, data.start, data.length ?? 200);
  });

export const finalizeGreenBookSync = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { added: number; updated: number; unchanged: number; startedAt: string }) => input,
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { finalizeGreenBookSync: finalize } = await import("@/lib/greenbook-sync");
    return finalize(supabaseAdmin, data, data.startedAt);
  });

export const recordGreenBookSyncFailure = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { message: string; startedAt: string; added: number; updated: number }) => input,
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { recordSyncFailure } = await import("@/lib/greenbook-sync");
    await recordSyncFailure(supabaseAdmin, data.message, data.startedAt, data);
    return { ok: true };
  });
