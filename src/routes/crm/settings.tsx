import { createFileRoute } from "@tanstack/react-router";
import { CrmShell, CrmHeader, CrmCard, inputClass } from "@/components/crm/CrmShell";

export const Route = createFileRoute("/crm/settings")({
  head: () => ({
    meta: [
      { title: "Settings | MedNovaOS CRM" },
      { name: "description", content: "CRM preferences, API keys, email settings, theme and account configuration." },
      { property: "og:title", content: "Settings | MedNovaOS CRM" },
      { property: "og:description", content: "CRM preferences and integration settings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

const SECTIONS = [
  {
    title: "API keys",
    body: "Tavily, OpenAI and Resend keys are stored as backend secrets, never in the browser. Once added they are picked up automatically by the integration points in crm-integrations.server.ts.",
  },
  {
    title: "Email settings",
    body: "Sender name, reply-to address and default signature. Sending is routed through Resend once the key is configured.",
  },
  { title: "Theme", body: "MedNovaOS uses the shared navy and light-grey workspace theme across both modules." },
  { title: "Account", body: "Single workspace account. User management will be added with authentication." },
];

function SettingsPage() {
  return (
    <CrmShell>
      <CrmHeader title="Settings" subtitle="User preferences, API keys, email settings, theme and account" />
      <div className="grid gap-6 px-8 py-6 lg:grid-cols-2">
        {SECTIONS.map((s) => (
          <CrmCard key={s.title}>
            <h2 className="text-base font-bold text-foreground">{s.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            {s.title === "API keys" && (
              <div className="mt-4 grid gap-2">
                {["TAVILY_API_KEY", "OPENAI_API_KEY", "RESEND_API_KEY"].map((k) => (
                  <input key={k} className={inputClass} placeholder={`${k} — configured as a backend secret`} disabled />
                ))}
              </div>
            )}
          </CrmCard>
        ))}
      </div>
    </CrmShell>
  );
}
