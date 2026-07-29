import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Target,
  BarChart2,
  TrendingUp,
  CheckSquare,
  Users,
  ArrowUpRight,
} from "lucide-react";
import { CrmShell, CrmHeader, CrmCard, btnPrimary, btnGhost, ngn } from "@/components/crm/CrmShell";
import { fetchCrmStats, fetchCompanies, fetchTasks, fetchActivities } from "@/lib/crm-queries";

export const Route = createFileRoute("/crm/")({
  head: () => ({
    meta: [
      { title: "Business Development Overview | MedNovaOS CRM" },
      {
        name: "description",
        content:
          "CRM workspace for MedNovaOS — companies from regulatory intelligence, pipeline value, tasks and activity.",
      },
      { property: "og:title", content: "Business Development Overview | MedNovaOS CRM" },
      {
        property: "og:description",
        content: "Companies from regulatory intelligence, pipeline, tasks and next actions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CrmDashboard,
});

function Kpi({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: typeof Building2;
}) {
  return (
    <CrmCard>
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold tracking-wider text-muted-foreground">
          {label.toUpperCase()}
        </span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-3 text-3xl font-bold text-foreground">{value}</div>
      <div className="mt-2 text-xs text-muted-foreground">{note}</div>
    </CrmCard>
  );
}

function PanelHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-base font-bold text-foreground">{title}</h2>
      {action}
    </div>
  );
}

function CrmDashboard() {
  const { data: stats } = useQuery({ queryKey: ["crm-stats"], queryFn: fetchCrmStats });
  const { data: companies } = useQuery({ queryKey: ["crm-companies"], queryFn: () => fetchCompanies() });
  const { data: tasks } = useQuery({ queryKey: ["crm-tasks", "all"], queryFn: () => fetchTasks() });
  const { data: activities } = useQuery({ queryKey: ["crm-activities"], queryFn: () => fetchActivities(12) });

  const recent = (companies ?? []).slice(0, 5);
  const openDeals = (companies ?? []).filter((c) => c.stage !== "Won" && c.stage !== "Lost").slice(0, 5);
  const upcoming = (tasks ?? [])
    .filter((t) => t.state === "Not Started" || t.state === "In Progress")
    .slice(0, 5);

  return (
    <CrmShell>
      <CrmHeader
        title="Business Development Overview"
        subtitle="Your CRM workspace — companies from regulatory intelligence, pipeline, and next actions."
        actions={
          <>
            <Link to="/crm/reports" className={btnGhost}>
              Export report
            </Link>
            <Link to="/crm/companies" className={btnPrimary}>
              New company
            </Link>
          </>
        }
      />

      <div className="space-y-6 px-8 py-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Kpi label="Companies added" value={String(stats?.companies_added ?? 0)} note="Live CRM total" icon={Building2} />
          <Kpi label="Active leads" value={String(stats?.active_leads ?? 0)} note="Lead stage" icon={Target} />
          <Kpi label="Active opportunities" value={String(stats?.active_opportunities ?? 0)} note="Live pipeline count" icon={BarChart2} />
          <Kpi label="Won clients" value={String(stats?.won_clients ?? 0)} note="Won stage" icon={TrendingUp} />
          <Kpi label="Tasks due" value={String(stats?.tasks_due ?? 0)} note="Next 3 days" icon={CheckSquare} />
          <Kpi label="Meetings scheduled" value={String(stats?.meetings_scheduled ?? 0)} note="Upcoming" icon={Users} />
        </div>

        <CrmCard className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-lg font-bold text-foreground">Pipeline value</div>
            <div className="text-sm text-muted-foreground">
              Across {stats?.active_opportunities ?? 0} active opportunities
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-foreground">{ngn(stats?.pipeline_value ?? 0)}</div>
            <div className="text-xs text-muted-foreground">
              Weighted {ngn(stats?.weighted_value ?? 0)}
            </div>
          </div>
        </CrmCard>

        <div className="grid gap-6 lg:grid-cols-2">
          <CrmCard>
            <PanelHeader
              title="Recent companies"
              action={
                <Link to="/crm/companies" className="flex items-center gap-1 text-sm text-brand">
                  View all <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
            <div className="mt-4 divide-y divide-border">
              {recent.length === 0 && <p className="py-6 text-sm text-muted-foreground">No companies yet.</p>}
              {recent.map((c) => (
                <Link
                  key={c.id}
                  to="/crm/companies/$id"
                  params={{ id: c.id }}
                  className="flex items-center justify-between py-3 text-sm hover:text-brand"
                >
                  <span className="font-medium">{c.name}</span>
                  <span className="text-muted-foreground">{c.stage}</span>
                </Link>
              ))}
            </div>
          </CrmCard>

          <CrmCard>
            <PanelHeader
              title="Upcoming tasks"
              action={
                <Link to="/crm/tasks" className="flex items-center gap-1 text-sm text-brand">
                  All <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
            <div className="mt-4 divide-y divide-border">
              {upcoming.length === 0 && <p className="py-6 text-sm text-muted-foreground">No open tasks.</p>}
              {upcoming.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-3 text-sm">
                  <span className="font-medium">{t.title}</span>
                  <span className="text-muted-foreground">{t.due_date ?? "—"}</span>
                </div>
              ))}
            </div>
          </CrmCard>

          <CrmCard>
            <PanelHeader
              title="Open pipeline"
              action={
                <Link to="/crm/pipeline" className="flex items-center gap-1 text-sm text-brand">
                  Board <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
            <div className="mt-4 divide-y divide-border">
              {openDeals.length === 0 && <p className="py-6 text-sm text-muted-foreground">No active deals.</p>}
              {openDeals.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-3 text-sm">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-muted-foreground">
                    {c.stage} · {ngn(c.estimated_value)}
                  </span>
                </div>
              ))}
            </div>
          </CrmCard>

          <CrmCard>
            <PanelHeader
              title="Activity feed"
              action={
                <Link to="/crm/activities" className="flex items-center gap-1 text-sm text-brand">
                  All <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
            <div className="mt-4 divide-y divide-border">
              {(activities ?? []).length === 0 && (
                <p className="py-6 text-sm text-muted-foreground">No activity logged yet.</p>
              )}
              {(activities ?? []).map((a) => (
                <div key={a.id} className="flex items-center justify-between py-3 text-sm">
                  <span>{a.message}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CrmCard>
        </div>

        <p className="border-t border-border pt-6 text-xs text-muted-foreground">
          Data source: live MedNovaOS CRM tables, sourced from the regulatory intelligence opportunity engine.
        </p>
      </div>
    </CrmShell>
  );
}
