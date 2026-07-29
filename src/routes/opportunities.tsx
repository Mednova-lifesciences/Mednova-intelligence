import { Fragment, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { addCompanyFromOpportunity } from "@/lib/crm-queries";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { AppShell, Card, PageTitle, dash, naira } from "@/components/mednova/AppShell";
import {
  fetchOpportunitiesPage,
  fetchOpportunityStats,
  fetchOpportunityFacets,
  SERVICE_TYPES,
  type Opportunity,
  type OpportunityFilters,
} from "@/lib/mednova-queries";

export const Route = createFileRoute("/opportunities")({
  head: () => ({
    meta: [
      { title: "Revenue Opportunities | MedNova OS" },
      {
        name: "description",
        content:
          "Commercial opportunities generated automatically from NAFDAC Green Book registrations, scored by value and priority.",
      },
      { property: "og:title", content: "Revenue Opportunities | MedNova OS" },
      {
        property: "og:description",
        content: "Auto-generated commercial opportunities scored by pipeline value and priority.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Opportunities,
});

const PAGE_SIZE = 50;

const EMPTY: OpportunityFilters = {
  search: "",
  category: "",
  status: "",
  priority: "",
  probability: "",
  value: "",
  service: "",
  manufacturer: "",
  sort: "newest",
  page: 1,
  pageSize: PAGE_SIZE,
};

const selectClass =
  "h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground";

function KpiRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-background px-4 py-3">
      <span className="text-sm text-foreground">{label}</span>
      <span className="text-sm font-bold text-foreground">{value}</span>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="w-1/3 px-3 py-2 text-muted-foreground">{label}</td>
      <td className="px-3 py-2 text-foreground">{value}</td>
    </tr>
  );
}

function OpportunityDetail({ o }: { o: Opportunity }) {
  const navigate = useNavigate();
  const [notice, setNotice] = useState<{ message: string; companyId: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const onAdd = async () => {
    setBusy(true);
    try {
      const result = await addCompanyFromOpportunity({
        id: o.id,
        company: o.company,
        manufacturer: o.manufacturer,
        category: o.category,
        product: o.product,
        estimated_value: Number(o.estimated_value),
        priority: o.priority,
        probability: o.probability,
        service_type: o.service_type,
      });
      setNotice({
        message: result.ok
          ? "Company successfully added to CRM"
          : "This company already exists in CRM.",
        companyId: result.company.id,
      });
      window.setTimeout(() => setNotice(null), 10000);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-muted/30 px-3 py-4">
      <h3 className="text-sm font-bold text-foreground">Opportunity Details</h3>
      <div className="mt-3 overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left">
              <th className="px-3 py-2 font-semibold">Field</th>
              <th className="px-3 py-2 font-semibold">Value</th>
            </tr>
          </thead>
          <tbody>
            <DetailRow label="Opportunity ID" value={dash(o.opportunity_id)} />
            <DetailRow label="Company" value={dash(o.company)} />
            <DetailRow label="Manufacturer" value={dash(o.manufacturer)} />
            <DetailRow label="Product" value={dash(o.product)} />
            <DetailRow label="Category" value={dash(o.category)} />
            <DetailRow label="Service Type" value={dash(o.service_type)} />
            <DetailRow label="Estimated Value" value={naira(Number(o.estimated_value))} />
            <DetailRow label="Probability" value={`${o.probability}%`} />
            <DetailRow label="Priority" value={dash(o.priority)} />
            <DetailRow label="Expiry Date" value={dash(o.expiry_date)} />
            <DetailRow label="Status" value={dash(o.status)} />
            <DetailRow label="Recommendation" value={dash(o.recommendation)} />
            <DetailRow
              label="Created Date"
              value={new Date(o.created_at).toISOString().slice(0, 19).replace("T", " ")}
            />
          </tbody>
        </table>
      </div>

      <h3 className="mt-5 text-sm font-bold text-foreground">Commercial Actions</h3>
      <div className="mt-2 rounded-md border border-border bg-card p-4">
        <button
          onClick={onAdd}
          disabled={busy}
          className="h-9 rounded-md bg-navy px-4 text-sm font-semibold text-navy-foreground disabled:opacity-60"
        >
          {busy ? "Adding…" : "Add Company to CRM"}
        </button>

        {notice && (
          <div className="mt-4 rounded-md border border-border bg-muted/40 p-4">
            <p className="text-sm font-semibold text-foreground">{notice.message}</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setNotice(null)}
                className="h-8 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground"
              >
                Continue
              </button>
              <button
                onClick={() => navigate({ to: "/crm/companies/$id", params: { id: notice.companyId } })}
                className="h-8 rounded-md bg-navy px-3 text-sm font-semibold text-navy-foreground"
              >
                Open CRM
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


const COLUMNS = [
  "Opportunity ID",
  "Company",
  "Manufacturer",
  "Product",
  "Category",
  "Service Type",
  "Estimated Value",
  "Probability",
  "Priority",
  "Expiry Date",
  "Status",
  "Recommendation",
  "Created At",
];

function Opportunities() {
  const [draft, setDraft] = useState<OpportunityFilters>(EMPTY);
  const [applied, setApplied] = useState<OpportunityFilters>(EMPTY);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: stats } = useQuery({ queryKey: ["opp-stats"], queryFn: fetchOpportunityStats });
  const { data: facets } = useQuery({ queryKey: ["opp-facets"], queryFn: fetchOpportunityFacets });
  const { data, isLoading } = useQuery({
    queryKey: ["opportunities", applied],
    queryFn: () => fetchOpportunitiesPage(applied),
    placeholderData: keepPreviousData,
  });

  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / PAGE_SIZE));
  const set = (patch: Partial<OpportunityFilters>) => setDraft((d) => ({ ...d, ...patch }));
  const goto = (page: number) => {
    setApplied((a) => ({ ...a, page }));
    setDraft((d) => ({ ...d, page }));
  };

  return (
    <AppShell>
      <PageTitle>Revenue Opportunities</PageTitle>

      <Card className="mt-6">
        <div className="grid gap-3">
          <KpiRow label="Total Opportunities" value={(stats?.total ?? 0).toLocaleString()} />
          <KpiRow label="High Priority" value={(stats?.high_priority ?? 0).toLocaleString()} />
          <KpiRow label="Closing Soon" value={(stats?.closing_soon ?? 0).toLocaleString()} />
          <KpiRow label="Total Pipeline Value" value={naira(Number(stats?.pipeline ?? 0))} />
          <KpiRow label="Average Opportunity Value" value={naira(Number(stats?.avg_value ?? 0))} />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <input
            value={draft.search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder="Search company, manufacturer..."
            className="h-9 w-56 rounded-md border border-border bg-background px-3 text-sm"
          />
          <select
            className={selectClass}
            value={draft.category}
            onChange={(e) => set({ category: e.target.value })}
          >
            <option value="">All categories</option>
            {facets?.categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            className={selectClass}
            value={draft.status}
            onChange={(e) => set({ status: e.target.value })}
          >
            <option value="">All statuses</option>
            <option value="active">active</option>
            <option value="won">won</option>
            <option value="closed_lost">closed_lost</option>
          </select>
          <select
            className={selectClass}
            value={draft.priority}
            onChange={(e) => set({ priority: e.target.value })}
          >
            <option value="">Any priority</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          <select
            className={selectClass}
            value={draft.probability}
            onChange={(e) => set({ probability: e.target.value })}
          >
            <option value="">Any probability</option>
            <option value="40">40%+</option>
            <option value="60">60%+</option>
            <option value="80">80%+</option>
            <option value="100">100%</option>
          </select>
          <select
            className={selectClass}
            value={draft.value}
            onChange={(e) => set({ value: e.target.value })}
          >
            <option value="">Any value</option>
            <option value="1000000">₦1M+</option>
            <option value="5000000">₦5M+</option>
            <option value="10000000">₦10M+</option>
          </select>
          <select
            className={selectClass}
            value={draft.service}
            onChange={(e) => set({ service: e.target.value })}
          >
            <option value="">Any service</option>
            {SERVICE_TYPES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            className={`${selectClass} max-w-[480px] flex-1`}
            value={draft.manufacturer}
            onChange={(e) => set({ manufacturer: e.target.value })}
          >
            <option value="">Any manufacturer</option>
            {facets?.manufacturers.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select
            className={selectClass}
            value={draft.sort}
            onChange={(e) => set({ sort: e.target.value })}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="value_desc">Value (high to low)</option>
            <option value="value_asc">Value (low to high)</option>
            <option value="expiry">Expiry date</option>
          </select>
          <button
            onClick={() => {
              setOpenId(null);
              setApplied({ ...draft, page: 1 });
              setDraft({ ...draft, page: 1 });
            }}
            className="h-9 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            Apply
          </button>
          <button
            onClick={() => {
              setOpenId(null);
              setDraft(EMPTY);
              setApplied(EMPTY);
            }}
            className="h-9 rounded-md border border-border px-4 text-sm font-semibold text-primary"
          >
            Reset
          </button>
        </div>

        <div className="mt-5 flex items-center gap-3 text-sm">
          <span>
            Page {applied.page} of {totalPages}
          </span>
          <button
            disabled={applied.page <= 1}
            onClick={() => goto(applied.page - 1)}
            className="h-8 rounded-md border border-border px-3 text-primary disabled:opacity-40"
          >
            Previous
          </button>
          <button
            disabled={applied.page >= totalPages}
            onClick={() => goto(applied.page + 1)}
            className="h-8 rounded-md border border-border px-3 text-primary disabled:opacity-40"
          >
            Next
          </button>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[1500px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                {COLUMNS.map((h) => (
                  <th key={h} className="px-3 py-2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    <td colSpan={COLUMNS.length} className="px-3 py-4">
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    </td>
                  </tr>
                ))}
              {!isLoading && data?.rows.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-3 py-6 text-muted-foreground">
                    No opportunities match these filters.
                  </td>
                </tr>
              )}
              {data?.rows.map((o) => (
                <Fragment key={o.id}>
                  <tr className="border-b border-border align-top">
                    <td className="px-3 py-3">{dash(o.opportunity_id)}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>{dash(o.company)}</span>
                        <button
                          onClick={() => setOpenId(openId === o.id ? null : o.id)}
                          className="rounded border border-border px-2 py-0.5 text-xs text-primary"
                        >
                          View
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-3">{dash(o.manufacturer)}</td>
                    <td className="px-3 py-3">{dash(o.product)}</td>
                    <td className="px-3 py-3">{dash(o.category)}</td>
                    <td className="px-3 py-3">{dash(o.service_type)}</td>
                    <td className="px-3 py-3">{naira(Number(o.estimated_value))}</td>
                    <td className="px-3 py-3">{o.probability}%</td>
                    <td className="px-3 py-3">{dash(o.priority)}</td>
                    <td className="px-3 py-3">{dash(o.expiry_date)}</td>
                    <td className="px-3 py-3">{dash(o.status)}</td>
                    <td className="px-3 py-3">{dash(o.recommendation)}</td>
                    <td className="px-3 py-3">
                      {new Date(o.created_at).toISOString().slice(0, 19).replace("T", " ")}
                    </td>
                  </tr>
                  {openId === o.id && (
                    <tr className="border-b border-border">
                      <td colSpan={COLUMNS.length} className="p-0">
                        <OpportunityDetail o={o} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
