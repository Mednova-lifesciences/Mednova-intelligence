import { useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CrmShell, CrmHeader, CrmCard, btnPrimary, btnGhost, ngn } from "@/components/crm/CrmShell";
import {
  fetchCompany,
  fetchCompanyOpportunities,
  fetchCompanyProducts,
  fetchContacts,
  fetchActivities,
  fetchStageHistory,
  fetchNotes,
  fetchEmails,
  insertContacts,
  moveCompanyStage,
  PIPELINE_STAGES,
  type PipelineStage,
} from "@/lib/crm-queries";
import { NoteEditor, NoteList } from "@/routes/crm/notes";
import { getCompanyIntelligence, discoverContacts, generateEmail } from "@/lib/crm-integrations.functions";

export const Route = createFileRoute("/crm/companies/$id")({
  head: () => ({
    meta: [
      { title: "Company profile | MedNovaOS CRM" },
      { name: "description", content: "Company overview, products, opportunity history, intelligence, contacts and outreach." },
      { property: "og:title", content: "Company profile | MedNovaOS CRM" },
      { property: "og:description", content: "CRM company profile with intelligence and outreach tools." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CompanyDetail,
});

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-4 py-3">
      <div className="text-xs font-semibold tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium text-foreground">{value || "—"}</div>
    </div>
  );
}

function CompanyDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const loadIntel = useServerFn(getCompanyIntelligence);
  const loadContacts = useServerFn(discoverContacts);
  const makeEmail = useServerFn(generateEmail);

  const [draftEmail, setDraftEmail] = useState<{
    subject: string;
    recipient: string;
    body: string;
    signature: string;
  } | null>(null);
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const emailRef = useRef<HTMLDivElement | null>(null);
  const [showAllOpps, setShowAllOpps] = useState<Record<string, boolean>>({});

  const { data: company } = useQuery({ queryKey: ["crm-company", id], queryFn: () => fetchCompany(id) });
  const { data: contacts } = useQuery({
    queryKey: ["crm-contacts", "company", id],
    queryFn: () => fetchContacts({ companyId: id }),
  });
  const { data: opportunities } = useQuery({
    queryKey: ["crm-company-opps", id],
    queryFn: () => (company ? fetchCompanyOpportunities(company) : Promise.resolve([])),
    enabled: !!company,
  });
  const { data: products } = useQuery({
    queryKey: ["crm-company-products", id],
    queryFn: () => (company ? fetchCompanyProducts(company) : Promise.resolve([])),
    enabled: !!company,
  });
  const { data: intel, isFetching: intelLoading } = useQuery({
    queryKey: ["crm-intel", id],
    queryFn: () => loadIntel({ data: { name: company!.name, manufacturer: company!.manufacturer } }),
    enabled: !!company,
  });
  const { data: activities } = useQuery({
    queryKey: ["crm-activities", id],
    queryFn: () => fetchActivities(20, id),
  });
  const { data: history } = useQuery({ queryKey: ["crm-stage-history", id], queryFn: () => fetchStageHistory(id) });
  const { data: notes } = useQuery({ queryKey: ["crm-notes", id], queryFn: () => fetchNotes({ companyId: id }) });
  const { data: companyEmails } = useQuery({ queryKey: ["crm-emails", id], queryFn: () => fetchEmails(id) });
  const refreshNotes = () => {
    qc.invalidateQueries({ queryKey: ["crm-notes", id] });
    qc.invalidateQueries({ queryKey: ["crm-activities", id] });
  };

  if (!company) {
    return (
      <CrmShell>
        <CrmHeader title="Company" subtitle="Loading…" />
      </CrmShell>
    );
  }

  const onDiscoverContacts = async () => {
    const found = await loadContacts({ data: { name: company.name } });
    await insertContacts(found.map((c) => ({ ...c, company_id: company.id })));
    qc.invalidateQueries({ queryKey: ["crm-contacts"] });
  };

  const onGenerateEmail = async () => {
    setGeneratingEmail(true);
    try {
      const primary = (contacts ?? [])[0];
      const result = await makeEmail({
        data: {
          company: company.name,
          contactName: primary?.name ?? null,
          contactEmail: primary?.email ?? intel?.email ?? null,
          category: company.category,
          product: company.product,
          recommendation: (opportunities?.[0] as { recommendation?: string } | undefined)?.recommendation ?? null,
        },
      });
      setDraftEmail(result);
      requestAnimationFrame(() => emailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } finally {
      setGeneratingEmail(false);
    }
  };

  const onGenerateReport = () => {
    const opps = (opportunities ?? []) as {
      service_type: string | null;
      product: string | null;
      estimated_value: number;
      priority: string;
    }[];
    const totalValue = opps.reduce((s, o) => s + Number(o.estimated_value || 0), 0);
    const rows = opps
      .map(
        (o) =>
          `<tr><td>${o.service_type ?? "Opportunity"}</td><td>${o.product ?? "—"}</td><td>${ngn(
            o.estimated_value,
          )}</td><td>${o.priority}</td></tr>`,
      )
      .join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${company.name} — Company report</title>
      <style>body{font-family:system-ui,sans-serif;color:#0f172a;padding:32px}h1{color:#071a2f}
      table{width:100%;border-collapse:collapse;margin-top:12px;font-size:13px}
      th,td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left}th{background:#f1f5f9}
      .kpi{display:flex;gap:16px;margin:16px 0}.kpi div{border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px}</style>
      </head><body>
      <h1>${company.name}</h1>
      <p>${company.category ?? "Biopharma"} · ${company.country ?? "Unknown"} · Stage: ${company.stage}</p>
      <div class="kpi">
        <div><strong>${opps.length}</strong><br/>Opportunities</div>
        <div><strong>${ngn(totalValue)}</strong><br/>Pipeline value</div>
        <div><strong>${company.probability}%</strong><br/>Probability</div>
        <div><strong>${(products ?? []).length}</strong><br/>Products</div>
        <div><strong>${(contacts ?? []).length}</strong><br/>Contacts</div>
      </div>
      <h2>Opportunities</h2>
      <table><thead><tr><th>Service type</th><th>Product</th><th>Estimated value</th><th>Priority</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="4">No opportunities</td></tr>'}</tbody></table>
      <p style="margin-top:24px;font-size:12px;color:#64748b">Generated ${new Date().toLocaleString()} · MedNovaOS</p>
      </body></html>`;
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      w.focus();
      w.print();
    }
  };


  const onStageChange = async (stage: PipelineStage) => {
    await moveCompanyStage(company, stage);
    qc.invalidateQueries({ queryKey: ["crm-company", id] });
    qc.invalidateQueries({ queryKey: ["crm-companies"] });
    qc.invalidateQueries({ queryKey: ["crm-stats"] });
    qc.invalidateQueries({ queryKey: ["crm-activities"] });
    qc.invalidateQueries({ queryKey: ["crm-stage-history", id] });
  };

  return (
    <CrmShell>
      <CrmHeader
        title={company.name}
        subtitle={`${company.category ?? "Biopharma"} · ${company.stage} · ${ngn(company.estimated_value)}`}
        actions={
          <>
            <select
              className="h-10 rounded-lg border border-border bg-card px-3 text-sm"
              value={company.stage}
              onChange={(e) => onStageChange(e.target.value as PipelineStage)}
            >
              {PIPELINE_STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button className={btnGhost} onClick={onGenerateReport}>
              Generate report
            </button>
            <button className={btnPrimary} onClick={onGenerateEmail} disabled={generatingEmail}>
              {generatingEmail ? "Generating…" : "Generate email"}
            </button>

          </>
        }
      />

      <div className="space-y-6 px-8 py-6">
        <CrmCard>
          <h2 className="text-base font-bold text-foreground">Company overview</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Company name" value={company.name} />
            <Field label="Manufacturer" value={company.manufacturer ?? ""} />
            <Field label="Country" value={company.country ?? "Unknown"} />
            <Field label="Category" value={company.category ?? ""} />
            <Field label="Portfolio" value={company.portfolio ?? ""} />
            <Field label="Estimated revenue" value={ngn(company.estimated_value)} />
            <Field label="Priority" value={company.priority ?? ""} />
            <Field label="Probability" value={`${company.probability}%`} />
            <Field label="Pipeline stage" value={company.stage} />
            <Field label="Created date" value={new Date(company.created_at).toLocaleString()} />
            <Field label="Status" value={company.status} />
            <Field label="Score" value={String(company.score)} />
          </div>
        </CrmCard>

        <div className="grid gap-6 lg:grid-cols-2">
          <CrmCard>
            <h2 className="text-base font-bold text-foreground">Products</h2>
            <div className="mt-3 divide-y divide-border text-sm">
              {(products ?? []).length === 0 && <p className="py-4 text-muted-foreground">No linked products.</p>}
              {(products ?? []).map((p) => (
                <Link
                  key={p.id}
                  to="/products/$id"
                  params={{ id: p.id }}
                  className="flex items-center justify-between py-2 hover:text-brand"
                >
                  <span>{p.product_name}</span>
                  <span className="text-xs text-muted-foreground">{p.expiry_date ?? "—"}</span>
                </Link>
              ))}
            </div>
          </CrmCard>

          <CrmCard>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold text-foreground">Opportunity history</h2>
              <span className="text-xs text-muted-foreground">
                {(opportunities ?? []).length} opportunit{(opportunities ?? []).length === 1 ? "y" : "ies"} · grouped by
                service type
              </span>
            </div>
            <div className="mt-3 space-y-4 text-sm">
              {(opportunities ?? []).length === 0 && (
                <p className="py-4 text-muted-foreground">No opportunities found.</p>
              )}
              {Object.entries(
                ((opportunities ?? []) as {
                  id: string;
                  service_type: string | null;
                  product: string | null;
                  estimated_value: number;
                  priority: string;
                }[]).reduce<
                  Record<
                    string,
                    { id: string; product: string | null; estimated_value: number; priority: string }[]
                  >
                >((acc, o) => {
                  const key = o.service_type ?? "Opportunity";
                  (acc[key] ??= []).push(o);
                  return acc;
                }, {}),
              ).map(([type, rows]) => {
                const total = rows.reduce((s, r) => s + Number(r.estimated_value || 0), 0);
                const expanded = showAllOpps[type];
                const visible = expanded ? rows : rows.slice(0, 5);
                return (
                  <div key={type} className="rounded-lg border border-border bg-background p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">
                        {type} <span className="text-muted-foreground">({rows.length})</span>
                      </span>
                      <span className="text-xs text-muted-foreground">{ngn(total)} total</span>
                    </div>
                    <div className="mt-2 divide-y divide-border">
                      {visible.map((r) => (
                        <div key={r.id} className="flex items-center justify-between gap-3 py-1.5">
                          <span className="truncate">{r.product ?? "—"}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {ngn(r.estimated_value)} · {r.priority}
                          </span>
                        </div>
                      ))}
                    </div>
                    {rows.length > 5 && (
                      <button
                        className="mt-2 text-xs font-semibold text-brand"
                        onClick={() => setShowAllOpps((s) => ({ ...s, [type]: !expanded }))}
                      >
                        {expanded ? "Show less" : `Show all ${rows.length}`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </CrmCard>

        </div>

        <CrmCard>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-bold text-foreground">Company intelligence</h2>
            <span className="text-xs text-muted-foreground">
              {intelLoading ? "Loading…" : intel?.placeholder ? "Placeholder data — connect Tavily to go live" : "Live via Tavily"}
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Company website" value={intel?.website ?? ""} />
            <Field label="Company email" value={intel?.email ?? ""} />
            <Field label="Phone" value={intel?.phone ?? ""} />
            <Field label="LinkedIn" value={intel?.linkedin ?? ""} />
            <Field label="NAFDAC presence" value={intel?.nafdac_presence ?? ""} />
            <Field label="Market position" value={intel?.market_position ?? ""} />
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div className="rounded-lg border border-border bg-background p-4">
              <div className="text-xs font-semibold text-muted-foreground">About company</div>
              <p className="mt-1 text-sm">{intel?.about ?? "—"}</p>
              <div className="mt-3 text-xs font-semibold text-muted-foreground">Business description</div>
              <p className="mt-1 text-sm">{intel?.business_description ?? "—"}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-4">
              <div className="text-xs font-semibold text-muted-foreground">Recent news</div>
              <ul className="mt-1 list-disc pl-5 text-sm">
                {(intel?.recent_news ?? []).map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
              <div className="mt-3 text-xs font-semibold text-muted-foreground">Commercial insights</div>
              <ul className="mt-1 list-disc pl-5 text-sm">
                {(intel?.commercial_insights ?? []).map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-border bg-background p-4">
              <div className="text-xs font-semibold text-muted-foreground">Key executives</div>
              <ul className="mt-1 text-sm">
                {(intel?.key_executives ?? []).map((e, i) => (
                  <li key={i}>
                    {e.name} — {e.role}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-border bg-background p-4">
              <div className="text-xs font-semibold text-muted-foreground">Decision makers</div>
              <ul className="mt-1 text-sm">
                {(intel?.decision_makers ?? []).map((e, i) => (
                  <li key={i}>
                    {e.name} — {e.role}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CrmCard>

        <CrmCard>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-bold text-foreground">Contacts</h2>
            <button className={btnGhost} onClick={onDiscoverContacts}>
              Discover contacts
            </button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Role</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Phone</th>
                  <th className="px-3 py-2 font-medium">LinkedIn</th>
                  <th className="px-3 py-2 font-medium">Source</th>
                </tr>
              </thead>
              <tbody>
                {(contacts ?? []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                      No contacts yet.
                    </td>
                  </tr>
                )}
                {(contacts ?? []).map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-medium">{c.name}</td>
                    <td className="px-3 py-2">{c.role ?? "—"}</td>
                    <td className="px-3 py-2">{c.email ?? "—"}</td>
                    <td className="px-3 py-2">{c.phone ?? "—"}</td>
                    <td className="max-w-[200px] truncate px-3 py-2 text-brand">{c.linkedin ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{c.source ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CrmCard>

        {draftEmail && (
          <div ref={emailRef} className="scroll-mt-6">
          <CrmCard>
            <h2 className="text-base font-bold text-foreground">Generated outreach email</h2>

            <div className="mt-3 grid gap-3">
              <input
                className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
                value={draftEmail.recipient}
                onChange={(e) => setDraftEmail({ ...draftEmail, recipient: e.target.value })}
                placeholder="Recipient"
              />
              <input
                className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
                value={draftEmail.subject}
                onChange={(e) => setDraftEmail({ ...draftEmail, subject: e.target.value })}
                placeholder="Subject"
              />
              <textarea
                className="min-h-[200px] rounded-lg border border-border bg-background p-3 text-sm"
                value={draftEmail.body}
                onChange={(e) => setDraftEmail({ ...draftEmail, body: e.target.value })}
              />
              <textarea
                className="min-h-[80px] rounded-lg border border-border bg-background p-3 text-sm"
                value={draftEmail.signature}
                onChange={(e) => setDraftEmail({ ...draftEmail, signature: e.target.value })}
              />
            </div>
            <div className="mt-4 flex justify-end">
              <button
                className={btnPrimary}
                onClick={() =>
                  navigate({
                    to: "/crm/emails/compose",
                    search: {
                      companyId: company.id,
                      to: draftEmail.recipient,
                      subject: draftEmail.subject,
                      body: draftEmail.body,
                      signature: draftEmail.signature,
                    },
                  })
                }
              >
                Send email
              </button>
            </div>
          </CrmCard>
          </div>
        )}

        <CrmCard>
          <h2 className="text-base font-bold text-foreground">Notes</h2>
          <div className="mt-3">
            <NoteEditor companyId={company.id} onSaved={refreshNotes} />
          </div>
          <div className="mt-4">
            <NoteList notes={notes ?? []} onChanged={refreshNotes} />
          </div>
        </CrmCard>

        <CrmCard>
          <h2 className="text-base font-bold text-foreground">Email history</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Subject</th>
                  <th className="px-3 py-2 font-medium">To</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Sent by</th>
                  <th className="px-3 py-2 font-medium">Sent date</th>
                  <th className="px-3 py-2 font-medium">Opened</th>
                  <th className="px-3 py-2 font-medium">Replied</th>
                </tr>
              </thead>
              <tbody>
                {(companyEmails ?? []).length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                      No emails for this company yet.
                    </td>
                  </tr>
                )}
                {(companyEmails ?? []).map((e) => (
                  <tr key={e.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-medium">{e.subject ?? "—"}</td>
                    <td className="px-3 py-2">{e.to_address ?? "—"}</td>
                    <td className="px-3 py-2 capitalize">{e.status}</td>
                    <td className="px-3 py-2">{e.sent_by}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {e.sent_at ? new Date(e.sent_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {e.opened_at ? new Date(e.opened_at).toLocaleString() : "Tracking pending"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {e.replied_at ? new Date(e.replied_at).toLocaleString() : "Tracking pending"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CrmCard>

        <div className="grid gap-6 lg:grid-cols-2">
          <CrmCard>
            <h2 className="text-base font-bold text-foreground">Activity history</h2>
            <div className="mt-3 divide-y divide-border text-sm">
              {(activities ?? []).length === 0 && <p className="py-4 text-muted-foreground">No activity yet.</p>}
              {(activities ?? []).map((a) => (
                <div key={a.id} className="flex items-start justify-between gap-3 py-2">
                  <div>
                    <div className="font-medium text-foreground">{a.activity_type}</div>
                    <div className="text-muted-foreground">{a.message}</div>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {a.actor} · {new Date(a.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CrmCard>
          <CrmCard>
            <h2 className="text-base font-bold text-foreground">Pipeline history</h2>
            <div className="mt-3 divide-y divide-border text-sm">
              {(history ?? []).length === 0 && <p className="py-4 text-muted-foreground">No stage changes.</p>}
              {(history ?? []).map((h) => {
                const row = h as { id: string; from_stage: string | null; to_stage: string; created_at: string };
                return (
                  <div key={row.id} className="flex items-center justify-between py-2">
                    <span>
                      {row.from_stage ?? "New"} → {row.to_stage}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(row.created_at).toLocaleDateString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </CrmCard>
        </div>
      </div>
    </CrmShell>
  );
}
