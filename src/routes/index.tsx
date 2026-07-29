import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, Card, PageTitle, dash, naira } from "@/components/mednova/AppShell";
import {
  fetchDashboardStats,
  fetchLastSync,
  fetchOpportunities,
} from "@/lib/mednova-queries";
import { syncGreenBook } from "@/lib/sync.functions";
import { backfillCompanyManufacturers } from "@/lib/maintenance.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CEO Dashboard | MedNova OS" },
      {
        name: "description",
        content:
          "Live view of NAFDAC Green Book intelligence, registered products and MedNova's commercial pipeline.",
      },
      { property: "og:title", content: "CEO Dashboard | MedNova OS" },
      {
        property: "og:description",
        content: "NAFDAC intelligence, product registrations and revenue pipeline in one view.",
      },
    ],
  }),
  component: Dashboard,
});

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card className="min-w-[220px] flex-1">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-bold tracking-tight text-foreground">{value}</div>
    </Card>
  );
}

function Dashboard() {
  const qc = useQueryClient();
  const stats = useQuery({ queryKey: ["dashboard-stats"], queryFn: fetchDashboardStats });
  const lastSync = useQuery({ queryKey: ["last-sync"], queryFn: fetchLastSync });
  const opportunities = useQuery({
    queryKey: ["opportunities", 8],
    queryFn: () => fetchOpportunities(8),
  });
  const runSync = useServerFn(syncGreenBook);
  const runBackfill = useServerFn(backfillCompanyManufacturers);
  const sync = useMutation({
    mutationFn: () => runSync(),
    onSuccess: () => {
      qc.invalidateQueries();
    },
  });
  const backfill = useMutation({
    mutationFn: () => runBackfill(),
    onSuccess: () => {
      qc.invalidateQueries();
    },
  });

  const s = stats.data;

  return (
    <AppShell>
      <PageTitle>CEO Dashboard</PageTitle>
      <p className="mt-2 text-muted-foreground">
        Live view of NAFDAC intelligence and MedNova's commercial pipeline.
      </p>

      <div className="mt-6 flex flex-wrap gap-4">
        <Kpi label="Manufacturers" value={s ? s.manufacturers.toLocaleString() : "—"} />
        <Kpi label="Registered products" value={s ? s.products.toLocaleString() : "—"} />
        <Kpi label="Revenue opportunities" value={s ? s.opportunities.toLocaleString() : "—"} />
        <Kpi label="Estimated pipeline" value={s ? naira(Number(s.pipeline)) : "—"} />
        <Kpi label="Expiring in 12 months" value={s ? s.expiring_12m.toLocaleString() : "—"} />
      </div>

      <Card className="mt-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h2 className="text-2xl font-bold text-foreground">Green Book refresh</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => sync.mutate()}
              disabled={sync.isPending}
              className="rounded-md bg-navy px-4 py-2 text-sm font-semibold text-navy-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {sync.isPending ? "Syncing…" : "Sync Green Book"}
            </button>
            <button
              onClick={() => backfill.mutate()}
              disabled={backfill.isPending}
              className="rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-opacity hover:bg-muted/80 disabled:opacity-60"
            >
              {backfill.isPending ? "Backfilling…" : "Backfill CRM companies"}
            </button>
          </div>
        </div>
        <p className="mt-4 text-muted-foreground">
          Run the existing sync pipeline manually and review the latest status.
        </p>
        <p className="mt-3 text-sm text-foreground">
          <span className="font-semibold">Last sync:</span>{" "}
          {lastSync.isLoading
            ? "loading…"
            : `${dash(lastSync.data?.status)} · ${lastSync.data?.records_added ?? 0} added`}
        </p>
      </Card>

      <Card className="mt-6">
        <h2 className="text-2xl font-bold text-foreground">Top revenue opportunities</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="px-3 py-2 font-semibold">Company</th>
                <th className="px-3 py-2 font-semibold">Category</th>
                <th className="px-3 py-2 font-semibold">Products</th>
                <th className="px-3 py-2 font-semibold">Value</th>
                <th className="px-3 py-2 font-semibold">Services</th>
                <th className="px-3 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {opportunities.isLoading && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-muted-foreground">
                    Loading opportunities…
                  </td>
                </tr>
              )}
              {opportunities.data?.map((o) => (
                <tr key={o.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-3">{dash(o.company)}</td>
                  <td className="px-3 py-3">{dash(o.category)}</td>
                  <td className="px-3 py-3">{o.product_count}</td>
                  <td className="px-3 py-3">{naira(Number(o.estimated_value))}</td>
                  <td className="px-3 py-3">{dash(o.services)}</td>
                  <td className="px-3 py-3">{dash(o.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-2xl font-bold text-foreground">Products by category</h2>
          <table className="mt-5 w-full text-sm">
            <tbody>
              {s?.by_category.map((c) => (
                <tr key={c.category} className="border-b border-border last:border-0">
                  <td className="px-3 py-3">{c.category}</td>
                  <td className="px-3 py-3 text-right">{c.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card>
          <h2 className="text-2xl font-bold text-foreground">Top renewal opportunities</h2>
          <table className="mt-5 w-full text-sm">
            <tbody>
              {s?.top_renewals.map((r) => (
                <tr key={r.applicant} className="border-b border-border last:border-0">
                  <td className="px-3 py-3">{r.applicant}</td>
                  <td className="px-3 py-3 text-right">{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </AppShell>
  );
}
