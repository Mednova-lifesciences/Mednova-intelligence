import { createFileRoute } from "@tanstack/react-router";

/**
 * Unattended Green Book sync trigger. Called on a schedule by an external
 * scheduler (see .github/workflows/greenbook-sync-cron.yml) rather than
 * Vercel's own Cron Jobs, because Hobby-plan Vercel cron is capped at
 * once-per-day and this needs to run every few hours. Runs entirely on
 * Vercel's servers -- no browser tab or user machine involved.
 *
 * Protected by CRON_SECRET so the public internet can't trigger it (this
 * repo is public, so the route path itself is not a secret).
 */
export const Route = createFileRoute("/api/cron-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.CRON_SECRET;
        const auth = request.headers.get("authorization");
        if (!secret || auth !== `Bearer ${secret}`) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { runCronSync } = await import("@/lib/greenbook-sync");

        try {
          const result = await runCronSync(supabaseAdmin);
          return Response.json(result);
        } catch (err: any) {
          return Response.json({ status: "error", message: err?.message ?? String(err) }, { status: 500 });
        }
      },
    },
  },
});
