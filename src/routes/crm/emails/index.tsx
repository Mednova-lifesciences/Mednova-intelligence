import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CrmShell, CrmHeader, CrmCard, btnPrimary, inputClass } from "@/components/crm/CrmShell";
import { fetchEmails, type EmailRow } from "@/lib/crm-queries";

export const Route = createFileRoute("/crm/emails/")({
  head: () => ({
    meta: [
      { title: "Emails | MedNovaOS CRM" },
      { name: "description", content: "History of outreach emails sent from MedNovaOS CRM with delivery status." },
      { property: "og:title", content: "Emails | MedNovaOS CRM" },
      { property: "og:description", content: "Sent, failed and draft outreach emails with open and reply tracking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EmailsPage,
});

const statusClass: Record<string, string> = {
  sent: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-100 text-red-800",
  draft: "bg-muted text-muted-foreground",
};

function StatusPill({ status }: { status: string }) {
  const key = status.toLowerCase();
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusClass[key] ?? statusClass.draft}`}>
      {status}
    </span>
  );
}

function EmailsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["crm-emails", search, status],
    queryFn: () => fetchEmails(undefined, { search, status }),
  });
  const rows: EmailRow[] = data ?? [];
  const count = (s: string) => rows.filter((r) => r.status.toLowerCase() === s).length;

  return (
    <CrmShell>
      <CrmHeader
        title="Emails"
        subtitle={`${rows.length} messages · ${count("sent")} sent · ${count("failed")} failed · ${count("draft")} drafts`}
        actions={
          <Link to="/crm/emails/compose" className={btnPrimary}>
            Compose email
          </Link>
        }
      />
      <div className="space-y-6 px-8 py-6">
        <CrmCard>
          <div className="flex flex-wrap items-center gap-3">
            <input
              className={`${inputClass} max-w-xs`}
              placeholder="Search subject or recipient..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </CrmCard>

        <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">To</th>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Sent by</th>
                <th className="px-4 py-3 font-medium">Sent date</th>
                <th className="px-4 py-3 font-medium">Opened</th>
                <th className="px-4 py-3 font-medium">Replied</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                    No emails yet.
                  </td>
                </tr>
              )}
              {rows.map((e) => (
                <>
                  <tr key={e.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{e.subject ?? "—"}</td>
                    <td className="px-4 py-3">{e.to_address ?? "—"}</td>
                    <td className="px-4 py-3">
                      {e.company_id && e.companies?.name ? (
                        <Link to="/crm/companies/$id" params={{ id: e.company_id }} className="text-brand hover:underline">
                          {e.companies.name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={e.status} />
                    </td>
                    <td className="px-4 py-3">{e.sent_by}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {e.sent_at ? new Date(e.sent_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {e.opened_at ? new Date(e.opened_at).toLocaleString() : "Tracking pending"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {e.replied_at ? new Date(e.replied_at).toLocaleString() : "Tracking pending"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        className="rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-muted"
                        onClick={() => setOpen(open === e.id ? null : e.id)}
                      >
                        {open === e.id ? "Hide" : "View"}
                      </button>
                    </td>
                  </tr>
                  {open === e.id && (
                    <tr key={`${e.id}-detail`} className="border-b border-border bg-muted/30">
                      <td colSpan={9} className="px-4 py-4">
                        <div className="grid gap-1 text-xs text-muted-foreground">
                          <div>CC: {e.cc_address || "—"} · BCC: {e.bcc_address || "—"}</div>
                          <div>Created: {new Date(e.created_at).toLocaleString()}</div>
                        </div>
                        <pre className="mt-3 whitespace-pre-wrap font-sans text-sm text-foreground">{e.body ?? "—"}</pre>
                        {e.signature && (
                          <pre className="mt-2 whitespace-pre-wrap font-sans text-xs text-muted-foreground">
                            {e.signature}
                          </pre>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </CrmShell>
  );
}
