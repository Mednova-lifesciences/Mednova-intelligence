import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ClipboardCheck } from "lucide-react";
import { CrmShell, CrmHeader, btnPrimary, inputClass } from "@/components/crm/CrmShell";
import { supabase } from "@/integrations/supabase/client";
import {
  createAssessment,
  deleteAssessment,
  fetchAssessments,
  GAP_ITEMS,
  readinessPct,
  type GapAssessment,
} from "@/lib/gap-queries";

export const Route = createFileRoute("/crm/gap/")({
  head: () => ({
    meta: [
      { title: "PV Gap Assessments | MedNovaOS Pharmacovigilance" },
      {
        name: "description",
        content:
          "Pharmacovigilance quality system gap assessments — 57 requirements scored for maturity, readiness and inspection risk against NAFDAC and GVP.",
      },
      { property: "og:title", content: "PV Gap Assessments | MedNovaOS Pharmacovigilance" },
      { property: "og:description", content: "PV quality system gap assessments with maturity scoring and readiness." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GapListPage,
});

type Summary = { scored: number; avg: number | null; critical: number; major: number };

async function fetchSummaries(): Promise<Record<string, Summary>> {
  const { data, error } = await supabase
    .from("gap_responses")
    .select("assessment_id, current_maturity, risk");
  if (error) throw error;
  const out: Record<string, Summary> = {};
  (data ?? []).forEach((r) => {
    const s = (out[r.assessment_id] ??= { scored: 0, avg: 0, critical: 0, major: 0 });
    if (r.current_maturity !== null && r.current_maturity !== undefined) {
      s.scored += 1;
      s.avg = (s.avg ?? 0) + Number(r.current_maturity);
    }
    if (r.risk === "Critical") s.critical += 1;
    if (r.risk === "Major") s.major += 1;
  });
  Object.values(out).forEach((s) => {
    s.avg = s.scored ? (s.avg as number) / s.scored : null;
  });
  return out;
}

function GapListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ title: "", client: "", assessor: "", assessment_date: "" });
  const [open, setOpen] = useState(false);

  const { data: assessments, isLoading } = useQuery({
    queryKey: ["gap-assessments", search],
    queryFn: () => fetchAssessments(search),
  });
  const { data: summaries } = useQuery({ queryKey: ["gap-summaries"], queryFn: fetchSummaries });

  const create = useMutation({
    mutationFn: () => createAssessment(form),
    onSuccess: (a: GapAssessment) => {
      qc.invalidateQueries({ queryKey: ["gap-assessments"] });
      navigate({ to: "/crm/gap/$id", params: { id: a.id } });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteAssessment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gap-assessments"] });
      qc.invalidateQueries({ queryKey: ["gap-summaries"] });
    },
  });

  const rows = useMemo(() => assessments ?? [], [assessments]);

  return (
    <CrmShell>
      <CrmHeader
        title="PV gap assessments"
        subtitle={`Fifty-seven requirements across twelve domains, scored on demonstrable evidence. Findings, actions and readiness are derived from the scores.`}
        actions={
          <button className={btnPrimary} onClick={() => setOpen((v) => !v)}>
            <Plus className="h-4 w-4" /> New assessment
          </button>
        }
      />

      <div className="px-8 py-6">
        {open && (
          <div className="mb-6 rounded-lg border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 text-base font-bold text-foreground">Start a new assessment</h2>
            <div className="grid gap-3 md:grid-cols-4">
              <input
                className={inputClass}
                placeholder="Assessment title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <input
                className={inputClass}
                placeholder="Client / entity assessed"
                value={form.client}
                onChange={(e) => setForm({ ...form, client: e.target.value })}
              />
              <input
                className={inputClass}
                placeholder="Assessor"
                value={form.assessor}
                onChange={(e) => setForm({ ...form, assessor: e.target.value })}
              />
              <input
                type="date"
                className={inputClass}
                value={form.assessment_date}
                onChange={(e) => setForm({ ...form, assessment_date: e.target.value })}
              />
            </div>
            <div className="mt-4 flex gap-2">
              <button className={btnPrimary} disabled={create.isPending} onClick={() => create.mutate()}>
                <ClipboardCheck className="h-4 w-4" /> Create and open
              </button>
            </div>
          </div>
        )}

        <div className="mb-4">
          <input
            className={`${inputClass} max-w-sm`}
            placeholder="Search by title, client or assessor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                {["Assessment", "Client", "Assessor", "Date", "Scored", "Readiness", "Critical", "Major", ""].map(
                  (h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-3 font-medium">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={9} className="px-4 py-6">
                    <div className="h-4 w-full animate-pulse rounded bg-muted" />
                  </td>
                </tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                    No assessments yet. Create one to begin scoring.
                  </td>
                </tr>
              )}
              {rows.map((a) => {
                const s = summaries?.[a.id];
                const pct = readinessPct(s?.avg ?? null);
                return (
                  <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-semibold text-foreground">{a.title}</td>
                    <td className="px-4 py-3">{a.client || "—"}</td>
                    <td className="px-4 py-3">{a.assessor || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3">{a.assessment_date ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {s?.scored ?? 0} / {GAP_ITEMS.length}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold">
                      {pct === null ? "—" : `${pct}%`}
                    </td>
                    <td className="px-4 py-3">
                      {s?.critical ? (
                        <span className="rounded bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                          {s.critical}
                        </span>
                      ) : (
                        "0"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {s?.major ? (
                        <span className="rounded bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-700">
                          {s.major}
                        </span>
                      ) : (
                        "0"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          to="/crm/gap/$id"
                          params={{ id: a.id }}
                          className="rounded-md border border-border px-3 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                        >
                          Open
                        </Link>
                        <button
                          className="rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          title="Delete assessment"
                          onClick={() => {
                            if (confirm(`Delete “${a.title}” and all its responses?`)) remove.mutate(a.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </CrmShell>
  );
}
