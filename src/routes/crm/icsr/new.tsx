import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Save, Send } from "lucide-react";
import { CrmShell, CrmHeader, CrmCard, btnPrimary, btnGhost, inputClass } from "@/components/crm/CrmShell";
import {
  createCase,
  resolveDuplicate,
  fmtDate,
  dueDateFor,
  SOURCE_TYPES,
  CHANNELS,
  SERIOUSNESS,
  SERIOUSNESS_CRITERIA,
  OUTCOMES,
  CAUSALITY,
  ACTIONS_TAKEN,
  type IcsrCase,
  type CaseInput,
} from "@/lib/icsr-queries";

export const Route = createFileRoute("/crm/icsr/new")({
  head: () => ({
    meta: [
      { title: "Report an Adverse Event | MedNovaOS Pharmacovigilance" },
      {
        name: "description",
        content:
          "Capture a suspected adverse drug reaction. Fill in what you know and send it — the pharmacovigilance team follows up on anything missing.",
      },
      { property: "og:title", content: "Report an Adverse Event | MedNovaOS Pharmacovigilance" },
      { property: "og:description", content: "Capture a suspected adverse drug reaction in the MedNova ICSR intake." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewCasePage,
});

const REQUIRED: (keyof CaseInput)[] = [
  "reporter_name",
  "reporter_contact",
  "source_type",
  "received_date",
  "patient_initials",
  "product",
  "event_description",
  "seriousness",
];

const labelCls = "mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground";
const textareaCls =
  "min-h-[92px] w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-brand";

function Section({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <CrmCard className="mb-4">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-base font-bold text-foreground">{title}</h2>
        {badge && (
          <span
            className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${
              badge === "Required" ? "bg-brand text-brand-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {badge}
          </span>
        )}
      </div>
      {children}
    </CrmCard>
  );
}

function NewCasePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<CaseInput>({ channel: "WhatsApp", country: "Nigeria", report_type: "Initial" });
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [collision, setCollision] = useState<{ current: IcsrCase; other: IcsrCase } | null>(null);

  const set = (k: keyof CaseInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const field = (k: keyof CaseInput, label: string, required = false, type = "text") => (
    <div>
      <label className={labelCls}>
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <input type={type} className={inputClass} value={(form[k] as string) ?? ""} onChange={set(k)} />
    </div>
  );

  const select = (k: keyof CaseInput, label: string, options: readonly string[], required = false) => (
    <div>
      <label className={labelCls}>
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <select className={inputClass} value={(form[k] as string) ?? ""} onChange={set(k)}>
        <option value="">—</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );

  const area = (k: keyof CaseInput, label: string, required = false, help?: string) => (
    <div className="md:col-span-2">
      <label className={labelCls}>
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <textarea className={textareaCls} value={(form[k] as string) ?? ""} onChange={set(k)} />
      {help && <p className="mt-1 text-xs italic text-muted-foreground">{help}</p>}
    </div>
  );

  const saveDraft = async () => {
    setSaving(true);
    try {
      const { case: created } = await createCase(form, { draft: true });
      qc.invalidateQueries({ queryKey: ["icsr-cases"] });
      navigate({ to: "/crm/icsr/$id", params: { id: created.id } });
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    const missing = REQUIRED.filter((k) => !form[k]);
    if (missing.length) {
      setToast(`Not sent — ${missing.length} required field${missing.length > 1 ? "s" : ""} still empty. Look for the red asterisks.`);
      return;
    }
    setSaving(true);
    try {
      const { case: created, matches } = await createCase(form);
      qc.invalidateQueries({ queryKey: ["icsr-cases"] });
      qc.invalidateQueries({ queryKey: ["icsr-stats"] });
      if (matches.length) {
        setCollision({ current: created, other: matches[0] });
      } else {
        navigate({ to: "/crm/icsr/$id", params: { id: created.id } });
      }
    } finally {
      setSaving(false);
    }
  };

  const decide = async (outcome: "Confirmed duplicate" | "Unique" | "Under review") => {
    if (!collision) return;
    await resolveDuplicate(collision.current.id, collision.current.case_ref, collision.other.case_ref, outcome);
    qc.invalidateQueries({ queryKey: ["icsr-cases"] });
    navigate({ to: "/crm/icsr/$id", params: { id: collision.current.id } });
  };

  return (
    <CrmShell>
      <DemoBanner />
      <CrmHeader
        title="Report a suspected side effect"
        subtitle="You do not need to be certain the medicine caused the problem, and you do not need to complete every box. A report that arrives today is worth far more than a complete report that never arrives."
        actions={
          <>
            <Link to="/crm/icsr" className={btnGhost}>
              Back to register
            </Link>
            <button className={btnGhost} onClick={saveDraft} disabled={saving}>
              <Save className="h-4 w-4" /> Save draft
            </button>
            <button className={btnPrimary} onClick={submit} disabled={saving}>
              <Send className="h-4 w-4" /> Send report
            </button>
          </>
        }
      />

      <div className="max-w-5xl px-8 py-6">
        {toast && (
          <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {toast}
          </div>
        )}

        <Section title="Reporter Information" badge="Required">
          <div className="grid gap-4 md:grid-cols-2">
            {field("reporter_name", "Your name", true)}
            {field("reporter_contact", "Phone / WhatsApp", true)}
            {field("reporter_email", "Email")}
            {select("source_type", "You are a", SOURCE_TYPES, true)}
            {select("channel", "How this is being sent", CHANNELS)}
            {field("state", "State")}
            {field("country", "Country")}
            <div>
              <label className={labelCls}>
                Date you became aware <span className="text-destructive">*</span>
              </label>
              <input type="date" className={inputClass} value={form.received_date ?? ""} onChange={set("received_date")} />
              <p className="mt-1 text-xs italic text-muted-foreground">
                This starts the reporting clock — Day 0. Submission due{" "}
                {fmtDate(dueDateFor(form.received_date, form.seriousness))}.
              </p>
            </div>
          </div>
        </Section>

        <Section title="Patient Information" badge="Required">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className={labelCls}>
                Patient initials <span className="text-destructive">*</span>
              </label>
              <input className={inputClass} value={form.patient_initials ?? ""} onChange={set("patient_initials")} placeholder="e.g. FO" />
              <p className="mt-1 text-xs italic text-muted-foreground">Never the full name.</p>
            </div>
            {field("patient_age", "Age")}
            {select("patient_sex", "Sex", ["F", "M", "Unknown"])}
            {field("patient_weight", "Weight (kg)")}
            {select("patient_pregnancy", "Pregnancy status", ["Not applicable", "Pregnant", "Breastfeeding", "Unknown"])}
            {field("patient_ethnicity", "Ethnicity")}
          </div>
        </Section>

        <Section title="Product Information" badge="Required">
          <div className="grid gap-4 md:grid-cols-2">
            {field("product", "Product name", true)}
            {field("manufacturer", "Manufacturer")}
            {field("batch", "Batch / lot number")}
            {field("dose", "Dose")}
            {field("route", "Route of administration")}
            {field("dosage_form", "Dosage form")}
            {field("indication", "Indication for use")}
            <div />
            {field("therapy_start", "Therapy start date", false, "date")}
            {field("therapy_stop", "Therapy stop date", false, "date")}
          </div>
        </Section>

        <Section title="Adverse Reaction" badge="Required">
          <div className="grid gap-4 md:grid-cols-2">
            {area(
              "event_description",
              "Describe the problem in the reporter's own words",
              true,
              "Write what was actually said. Do not convert it into a diagnosis.",
            )}
            {field("meddra_term", "MedDRA preferred term")}
            {select("outcome", "Outcome", OUTCOMES)}
            {field("onset_date", "Onset date", false, "date")}
            {field("stop_date", "Stop date", false, "date")}
            <div>
              <label className={labelCls}>
                How serious <span className="text-destructive">*</span>
              </label>
              <select className={inputClass} value={form.seriousness ?? ""} onChange={set("seriousness")}>
                <option value="">Choose one</option>
                {SERIOUSNESS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs italic text-muted-foreground">
                Serious sets a 15-day clock. Non-serious sets 90 days.
              </p>
            </div>
            {select("seriousness_criterion", "If serious, why", SERIOUSNESS_CRITERIA)}
            {select("causality", "Causality assessment", CAUSALITY)}
            {select("action_taken", "Action taken with product", ACTIONS_TAKEN)}
            {select("dechallenge", "Dechallenge", ["Positive", "Negative", "Not done", "Unknown"])}
            {select("rechallenge", "Rechallenge", ["Positive", "Negative", "Not done", "Unknown"])}
          </div>
        </Section>

        <div className="mb-4 rounded-lg border border-border border-l-4 border-l-navy bg-card p-4 text-sm text-muted-foreground">
          <b className="text-foreground">Everything else is optional.</b> Leave it blank rather than delaying the report.
          The pharmacovigilance team will follow up for anything missing.
        </div>

        <Section title="Medical History, Concomitant Medication & Laboratory Results" badge="Optional">
          <div className="grid gap-4 md:grid-cols-2">
            {area("medical_history", "Relevant medical history")}
            {area("concomitant_medication", "Concomitant medication")}
            {area("lab_results", "Laboratory results")}
            {area("notes", "Anything else")}
          </div>
        </Section>

        <Section title="Regulatory Information" badge="Optional">
          <div className="grid gap-4 md:grid-cols-3">
            {select("report_type", "Report type", ["Initial", "Follow-up", "Nullification"])}
            {field("regulator", "Regulator")}
            {field("assignee", "Assign to")}
          </div>
        </Section>

        <div className="flex gap-3">
          <button className={btnPrimary} onClick={submit} disabled={saving}>
            <Send className="h-4 w-4" /> Send report
          </button>
          <button className={btnGhost} onClick={saveDraft} disabled={saving}>
            <Save className="h-4 w-4" /> Save draft
          </button>
        </div>
      </div>

      {collision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-navy/70 p-4">
          <div className="w-full max-w-3xl overflow-hidden rounded-lg bg-card shadow-lg">
            <div className="bg-destructive px-6 py-4 text-destructive-foreground">
              <h2 className="text-lg font-bold">Possible duplicate detected</h2>
              <p className="mt-1 text-sm opacity-90">
                This report shares a fingerprint with a case already in the register. It has been logged either way —
                decide what it is.
              </p>
            </div>
            <div className="p-6">
              <div className="mb-4 overflow-x-auto rounded-lg bg-navy p-3 font-mono text-xs text-navy-foreground">
                <div>
                  <span className="mr-3 text-navy-muted">{collision.other.case_ref}</span>
                  {collision.other.fingerprint}
                </div>
                <div className="mt-1">
                  <span className="mr-3 text-navy-muted">{collision.current.case_ref}</span>
                  {collision.current.fingerprint}
                </div>
                <p className="mt-2 whitespace-normal text-[11px] text-navy-muted">
                  Fingerprint = patient identifier · product · first twelve characters of the event term, each
                  normalised for case and spacing.
                </p>
              </div>

              <div className="mb-4 grid gap-4 md:grid-cols-2">
                {[
                  { c: collision.other, title: "Already in register", isNew: false },
                  { c: collision.current, title: "Just received", isNew: true },
                ].map(({ c, title, isNew }) => (
                  <div
                    key={c.id}
                    className={`rounded-lg border p-4 ${isNew ? "border-amber-500 bg-amber-500/5" : "border-border"}`}
                  >
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      {title} · {c.case_ref}
                    </h3>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                      {[
                        ["Patient", [c.patient_initials, c.patient_age, c.patient_sex].filter(Boolean).join(" / ")],
                        ["Product", c.product],
                        ["Batch", c.batch],
                        ["Event", c.event_description],
                        ["Day 0", fmtDate(c.received_date)],
                        ["Channel", c.channel],
                        ["Reporter", c.reporter_name],
                        ["Source", c.source_type],
                      ].map(([k, v]) => (
                        <div key={k as string} className="contents">
                          <dt className="text-xs uppercase tracking-wide text-muted-foreground">{k}</dt>
                          <dd className="text-foreground">{(v as string) || "—"}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>

              <p className="mb-4 text-sm text-muted-foreground">
                <b className="text-foreground">The system flags, a person decides.</b> Automatic matching narrows the
                field; it never closes a case on its own. Whichever you choose is recorded in the case timeline with
                both case IDs.
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  className="inline-flex h-10 items-center rounded-lg bg-destructive px-4 text-sm font-semibold text-destructive-foreground hover:opacity-90"
                  onClick={() => decide("Confirmed duplicate")}
                >
                  These are the same case
                </button>
                <button className={btnGhost} onClick={() => decide("Unique")}>
                  These are different cases
                </button>
                <button className={btnGhost} onClick={() => decide("Under review")}>
                  Decide later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </CrmShell>
  );
}
