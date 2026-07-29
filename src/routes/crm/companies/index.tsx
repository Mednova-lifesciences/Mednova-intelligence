import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Filter, Download, Plus } from "lucide-react";
import { CrmShell, CrmHeader, btnPrimary, btnGhost, inputClass, relativeDate } from "@/components/crm/CrmShell";
import { fetchCompanies, PIPELINE_STAGES } from "@/lib/crm-queries";

export const Route = createFileRoute("/crm/companies/")({
  head: () => ({
    meta: [
      { title: "Companies | MedNovaOS CRM" },
      {
        name: "description",
        content: "Every CRM company sourced from Green Book regulatory intelligence and manual entry.",
      },
      { property: "og:title", content: "Companies | MedNovaOS CRM" },
      { property: "og:description", content: "CRM companies from Green Book regulatory intelligence." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CompaniesPage,
});

function CompaniesPage() {
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("");
  const [sort, setSort] = useState("recent");
  const [showFilters, setShowFilters] = useState(false);

  const { data: companies } = useQuery({
    queryKey: ["crm-companies", search, stage, sort],
    queryFn: () => fetchCompanies({ search, stage, sort }),
  });

  const rows = companies ?? [];

  const exportCsv = () => {
    const header = ["Company", "Country", "Score", "Status", "Portfolio", "Stage", "Estimated value"];
    const body = rows.map((c) =>
      [c.name, c.country ?? "Unknown", c.score, c.status, c.portfolio ?? "", c.stage, c.estimated_value].join(","),
    );
    const blob = new Blob([[header.join(","), ...body].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mednova-crm-companies.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <CrmShell>
      <CrmHeader
        title="Companies"
        subtitle={`${rows.length} companies · from Green Book, regulatory intelligence, and manual entry.`}
        actions={
          <>
            <button className={btnGhost} onClick={() => setShowFilters((v) => !v)}>
              <Filter className="h-4 w-4" /> Filter
            </button>
            <button className={btnGhost} onClick={exportCsv}>
              <Download className="h-4 w-4" /> Export
            </button>
            <Link to="/opportunities" className={btnPrimary}>
              <Plus className="h-4 w-4" /> Add company
            </Link>
          </>
        }
      />

      <div className="px-8 py-6">
        {showFilters && (
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <input
              className={`${inputClass} max-w-xs`}
              placeholder="Search companies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className={`${inputClass} max-w-[200px]`} value={stage} onChange={(e) => setStage(e.target.value)}>
              <option value="">All stages</option>
              {PIPELINE_STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select className={`${inputClass} max-w-[200px]`} value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="recent">Newest first</option>
              <option value="name">Name A–Z</option>
              <option value="value">Estimated value</option>
            </select>
          </div>
        )}

        <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Country</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Portfolio</th>
                <th className="px-4 py-3 font-medium">Last activity</th>
                <th className="px-4 py-3 font-medium">Next follow-up</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    No companies yet. Add one from an opportunity in Regulatory Intelligence.
                  </td>
                </tr>
              )}
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-xs font-bold">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <Link
                          to="/crm/companies/$id"
                          params={{ id: c.id }}
                          className="font-medium text-brand hover:underline"
                        >
                          {c.name}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {c.category ?? "Biopharma"} · {c.manufacturer ?? ""}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{c.country ?? "Unknown"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold">{c.score}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand">
                      {c.status}
                    </span>
                  </td>
                  <td className="max-w-[240px] truncate px-4 py-3 text-muted-foreground">
                    {c.portfolio ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{relativeDate(c.last_activity_at)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.next_followup_date ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </CrmShell>
  );
}
