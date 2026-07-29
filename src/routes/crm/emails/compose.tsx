import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CrmShell, CrmHeader, CrmCard, btnPrimary, btnGhost, inputClass } from "@/components/crm/CrmShell";
import { saveEmail } from "@/lib/crm-queries";
import { sendEmailFn } from "@/lib/crm-integrations.functions";

type ComposeSearch = {
  companyId?: string;
  to?: string;
  subject?: string;
  body?: string;
  signature?: string;
};

export const Route = createFileRoute("/crm/emails/compose")({
  validateSearch: (search: Record<string, unknown>): ComposeSearch => ({
    companyId: typeof search.companyId === "string" ? search.companyId : undefined,
    to: typeof search.to === "string" ? search.to : undefined,
    subject: typeof search.subject === "string" ? search.subject : undefined,
    body: typeof search.body === "string" ? search.body : undefined,
    signature: typeof search.signature === "string" ? search.signature : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Email Composer | MedNovaOS CRM" },
      { name: "description", content: "Compose and send outreach emails to CRM contacts with editable subject, body and signature." },
      { property: "og:title", content: "Email Composer | MedNovaOS CRM" },
      { property: "og:description", content: "Compose CRM outreach emails." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ComposePage,
});

function ComposePage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const send = useServerFn(sendEmailFn);

  const [to, setTo] = useState(search.to ?? "");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState(search.subject ?? "");
  const [body, setBody] = useState(search.body ?? "");
  const [signature, setSignature] = useState(search.signature ?? "MedNova Regulatory Intelligence");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  const onSend = async () => {
    setStatus(null);
    // Placeholder send — connect Resend inside sendEmail() in crm-integrations.server.ts.
    const result = await send({ data: { to, cc, bcc, subject, body: `${body}\n\n${signature}` } });
    await saveEmail(
      {
        company_id: search.companyId ?? null,
        contact_id: null,
        to_address: to,
        cc_address: cc,
        bcc_address: bcc,
        subject,
        body,
        signature,
      },
      result.sent ? "sent" : "draft",
    );
    setStatus(result.message ?? "Email sent.");
  };

  return (
    <CrmShell>
      <CrmHeader title="Email Composer" subtitle="Compose an outreach email. Sending is wired to a Resend integration point." />
      <div className="px-8 py-6">
        <CrmCard>
          <div className="grid gap-3">
            <label className="text-xs font-semibold text-muted-foreground">To</label>
            <input className={inputClass} value={to} onChange={(e) => setTo(e.target.value)} placeholder="recipient@company.com" />
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">CC</label>
                <input className={inputClass} value={cc} onChange={(e) => setCc(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">BCC</label>
                <input className={inputClass} value={bcc} onChange={(e) => setBcc(e.target.value)} />
              </div>
            </div>
            <label className="text-xs font-semibold text-muted-foreground">Subject</label>
            <input className={inputClass} value={subject} onChange={(e) => setSubject(e.target.value)} />
            <label className="text-xs font-semibold text-muted-foreground">Message</label>
            <textarea
              className="min-h-[240px] w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-brand"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <label className="text-xs font-semibold text-muted-foreground">Signature</label>
            <textarea
              className="min-h-[80px] w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-brand"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
            />
            <label className="text-xs font-semibold text-muted-foreground">Attachments</label>
            <input
              type="file"
              multiple
              className="text-sm"
              onChange={(e) => setAttachments(Array.from(e.target.files ?? []).map((f) => f.name))}
            />
            {attachments.length > 0 && (
              <p className="text-xs text-muted-foreground">{attachments.join(", ")}</p>
            )}
          </div>

          {status && (
            <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-sm text-foreground">{status}</div>
          )}

          <div className="mt-5 flex justify-end gap-3">
            <button className={btnGhost} onClick={() => navigate({ to: "/crm/emails" })}>
              Cancel
            </button>
            <button className={btnPrimary} onClick={onSend}>
              Send email
            </button>
          </div>
        </CrmCard>
      </div>
    </CrmShell>
  );
}
