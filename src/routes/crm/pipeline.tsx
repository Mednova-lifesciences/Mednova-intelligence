import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CrmShell, CrmHeader, ngn } from "@/components/crm/CrmShell";
import { fetchCompanies, moveCompanyStage, PIPELINE_STAGES, type Company, type PipelineStage } from "@/lib/crm-queries";

export const Route = createFileRoute("/crm/pipeline")({
  head: () => ({
    meta: [
      { title: "Pipeline | MedNovaOS CRM" },
      { name: "description", content: "Drag-and-drop deal pipeline from Lead to Won across eight CRM stages." },
      { property: "og:title", content: "Pipeline | MedNovaOS CRM" },
      { property: "og:description", content: "Eight-stage drag-and-drop CRM pipeline." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PipelinePage,
});

function PipelinePage() {
  const qc = useQueryClient();
  const [dragging, setDragging] = useState<Company | null>(null);
  const { data } = useQuery({ queryKey: ["crm-companies"], queryFn: () => fetchCompanies() });
  const companies = data ?? [];

  const drop = async (stage: PipelineStage) => {
    const company = dragging;
    setDragging(null);
    if (!company || company.stage === stage) return;
    await moveCompanyStage(company, stage);
    qc.invalidateQueries({ queryKey: ["crm-companies"] });
    qc.invalidateQueries({ queryKey: ["crm-stats"] });
    qc.invalidateQueries({ queryKey: ["crm-activities"] });
  };

  return (
    <CrmShell>
      <CrmHeader title="Pipeline" subtitle={`${companies.length} deals · stage changes persist`} />
      <div className="overflow-x-auto px-8 py-6">
        <div className="flex gap-4">
          {PIPELINE_STAGES.map((stage) => {
            const items = companies.filter((c) => c.stage === stage);
            const total = items.reduce((s, c) => s + Number(c.estimated_value), 0);
            return (
              <div
                key={stage}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => drop(stage)}
                className="flex w-64 shrink-0 flex-col rounded-lg border border-border bg-card shadow-sm"
              >
                <div className="border-b border-border px-4 py-3">
                  <div className="text-sm font-bold text-foreground">{stage}</div>
                  <div className="text-xs text-muted-foreground">
                    {items.length} · {ngn(total)}
                  </div>
                </div>
                <div className="flex min-h-[320px] flex-col gap-2 bg-muted/20 p-3">
                  {items.length === 0 && (
                    <p className="pt-4 text-center text-xs text-muted-foreground">Empty</p>
                  )}
                  {items.map((c) => (
                    <div
                      key={c.id}
                      draggable
                      onDragStart={() => setDragging(c)}
                      className="cursor-grab rounded-md border border-border bg-card p-3 shadow-sm active:cursor-grabbing"
                    >
                      <Link
                        to="/crm/companies/$id"
                        params={{ id: c.id }}
                        className="text-sm font-semibold text-foreground hover:text-brand"
                      >
                        {c.name}
                      </Link>
                      <div className="mt-1 text-xs text-muted-foreground">{ngn(c.estimated_value)}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {c.priority ?? "Low"} · {c.probability}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </CrmShell>
  );
}
