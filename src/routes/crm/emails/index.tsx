import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CrmShell, CrmHeader, btnPrimary } from "@/components/crm/CrmShell";
import { fetchEmails } from "@/lib/crm-queries";

export const Route = createFileRoute("/crm/emails/")({
  head: () => ({
    meta: [
      { title: "Emails | MedNovaOS CRM" },
      { name: "description", content: "Outreach emails drafted and sent from the MedNovaOS CRM." },
      { property: "og:title", content: "Emails | MedNovaOS CRM" },
      { property: "og:description", content: "CRM outreach email drafts and sent messages." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EmailsPage,
});

function EmailsPage() {
  const { data } = useQuery({ queryKey: ["crm-emails"], queryFn: () => fetchEmails() });
  const rows = (data ?? []) as { id: string; subject: string | null; to_address: string | null; status: string; created_at: string; companies: { name: string } | null }[];

  return (
    <CrmShell>
      <CrmHeader
        title="Emails"
        subtitle={`${rows.length} messages`}
        actions={
          <Link to="/crm/emails/compose" className={btnPrimary}>
            Compose email
          </Link>
        }
      />
      <div className="px-8 py-6">
        <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">To</th>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    No emails yet.
                  </td>
                </tr>
              )}
              {rows.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{e.subject ?? "—"}</td>
                  <td className="px-4 py-3">{e.to_address ?? "—"}</td>
                  <td className="px-4 py-3">{e.companies?.name ?? "—"}</td>
                  <td className="px-4 py-3">{e.status}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(e.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </CrmShell>
  );
}
