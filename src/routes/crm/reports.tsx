import { createFileRoute } from "@tanstack/react-router";
import { CrmShell, CrmHeader, CrmCard } from "@/components/crm/CrmShell";

export const Route = createFileRoute("/crm/reports")({
  head: () => ({
    meta: [
      { title: "Reports | MedNovaOS CRM" },
      { name: "description", content: "AI-generated commercial reports for the MedNovaOS CRM — coming soon." },
      { property: "og:title", content: "Reports | MedNovaOS CRM" },
      { property: "og:description", content: "AI CRM reporting placeholder." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  return (
    <CrmShell>
      <CrmHeader title="Reports" subtitle="Commercial reporting workspace" />
      <div className="px-8 py-6">
        <CrmCard>
          <p className="text-sm text-muted-foreground">
            AI-generated reports will be implemented in a future version. The generation endpoint will use the
            OpenAI integration point in <code>crm-integrations.server.ts</code>.
          </p>
        </CrmCard>
      </div>
    </CrmShell>
  );
}
