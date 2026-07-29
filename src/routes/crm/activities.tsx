import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CrmShell, CrmHeader, CrmCard } from "@/components/crm/CrmShell";
import { fetchActivities } from "@/lib/crm-queries";

export const Route = createFileRoute("/crm/activities")({
  head: () => ({
    meta: [
      { title: "Activities | MedNovaOS CRM" },
      { name: "description", content: "Full CRM activity feed: companies added, tasks completed, stage moves and emails sent." },
      { property: "og:title", content: "Activities | MedNovaOS CRM" },
      { property: "og:description", content: "Full CRM activity feed across every company." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ActivitiesPage,
});

function ActivitiesPage() {
  const { data } = useQuery({ queryKey: ["crm-activities", "all"], queryFn: () => fetchActivities(200) });
  const rows = data ?? [];

  return (
    <CrmShell>
      <CrmHeader title="Activities" subtitle={`${rows.length} logged events`} />
      <div className="px-8 py-6">
        <CrmCard>
          <div className="divide-y divide-border">
            {rows.length === 0 && <p className="py-6 text-sm text-muted-foreground">No activity yet.</p>}
            {rows.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                <div>
                  <span className="rounded-md bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand">
                    {a.activity_type}
                  </span>
                  <span className="ml-3">{a.message}</span>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(a.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </CrmCard>
      </div>
    </CrmShell>
  );
}
