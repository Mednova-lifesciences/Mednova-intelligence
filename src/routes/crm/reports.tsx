import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { CrmShell, CrmHeader, CrmCard, ngn } from "@/components/crm/CrmShell";
import { fetchCompanies } from "@/lib/crm-queries";

export const Route = createFileRoute("/crm/reports")({
  head: () => ({
    meta: [
      { title: "Reports | MedNovaOS CRM" },
      {
        name: "description",
        content: "CRM analytics: win rate, average deal size, pipeline distribution, priority mix and revenue forecast.",
      },
      { property: "og:title", content: "Reports | MedNovaOS CRM" },
      { property: "og:description", content: "Commercial analytics dashboard for the MedNovaOS CRM." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportsPage,
});

const STAGES = ["Lead", "Qualified", "Contacted", "Meeting", "Proposal", "Negotiation", "Won", "Lost"];
const COLORS = ["#2563eb", "#0ea5e9", "#14b8a6", "#f59e0b", "#a855f7", "#ef4444", "#10b981", "#64748b"];

function Kpi({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <CrmCard>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-bold text-foreground">{value}</div>
      {note && <div className="mt-1 text-xs text-muted-foreground">{note}</div>}
    </CrmCard>
  );
}

function ReportsPage() {
  const { data } = useQuery({ queryKey: ["crm-companies", "reports"], queryFn: () => fetchCompanies() });
  const companies = data ?? [];

  const won = companies.filter((c) => c.stage === "Won");
  const lost = companies.filter((c) => c.stage === "Lost");
  const closed = won.length + lost.length;
  const winRate = closed ? Math.round((won.length / closed) * 100) : 0;
  const pipeline = companies.filter((c) => c.stage !== "Lost").reduce((s, c) => s + Number(c.estimated_value || 0), 0);
  const avgDeal = companies.length ? Math.round(pipeline / Math.max(companies.length, 1)) : 0;
  const weighted = companies
    .filter((c) => c.stage !== "Lost")
    .reduce((s, c) => s + (Number(c.estimated_value || 0) * Number(c.probability || 0)) / 100, 0);

  const distribution = STAGES.map((s) => ({
    stage: s,
    count: companies.filter((c) => c.stage === s).length,
    value: companies.filter((c) => c.stage === s).reduce((a, c) => a + Number(c.estimated_value || 0), 0),
  }));

  const priorities = ["High", "Medium", "Low"].map((p) => ({
    name: p,
    value: companies.filter((c) => (c.priority ?? "Low") === p).length,
  }));

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const base = weighted / 12 || 1_500_000;
  const forecast = months.map((m, i) => ({
    month: m,
    forecast: Math.round(base * (0.75 + i * 0.05)),
    target: Math.round(base * 1.15),
  }));

  return (
    <CrmShell>
      <CrmHeader title="Reports" subtitle="Commercial analytics · charts use current CRM data with placeholder forecasting" />
      <div className="space-y-6 px-8 py-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Kpi label="Win rate" value={`${winRate}%`} note={`${won.length} won / ${lost.length} lost`} />
          <Kpi label="Avg deal size" value={ngn(avgDeal)} note={`${companies.length} companies`} />
          <Kpi label="Pipeline value" value={ngn(pipeline)} note="Excludes lost deals" />
          <Kpi label="Weighted pipeline" value={ngn(weighted)} note="Value × probability" />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <CrmCard>
            <h2 className="mb-4 text-base font-bold text-foreground">Pipeline distribution</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="stage" fontSize={11} />
                  <YAxis fontSize={11} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" name="Companies" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CrmCard>

          <CrmCard>
            <h2 className="mb-4 text-base font-bold text-foreground">Priority breakdown</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={priorities} dataKey="value" nameKey="name" outerRadius={95} label>
                    {priorities.map((_, i) => (
                      <Cell key={i} fill={COLORS[i]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CrmCard>
        </div>

        <CrmCard>
          <h2 className="mb-1 text-base font-bold text-foreground">Revenue forecast</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Placeholder projection derived from weighted pipeline until historical revenue data is available.
          </p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecast}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} tickFormatter={(v) => `${Math.round(Number(v) / 1_000_000)}M`} />
                <Tooltip formatter={(v) => ngn(Number(v))} />
                <Legend />
                <Line type="monotone" dataKey="forecast" stroke="#2563eb" strokeWidth={2} dot={false} name="Forecast" />
                <Line type="monotone" dataKey="target" stroke="#94a3b8" strokeDasharray="5 5" dot={false} name="Target" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CrmCard>

        <CrmCard>
          <h2 className="mb-3 text-base font-bold text-foreground">Stage value summary</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 font-medium">Stage</th>
                <th className="py-2 font-medium">Companies</th>
                <th className="py-2 font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {distribution.map((d) => (
                <tr key={d.stage} className="border-b border-border last:border-0">
                  <td className="py-2 font-medium">{d.stage}</td>
                  <td className="py-2">{d.count}</td>
                  <td className="py-2">{ngn(d.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CrmCard>
      </div>
    </CrmShell>
  );
}
