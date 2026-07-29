import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Mail,
  Sparkles,
  FileText,
  Paperclip,
  Pin,
  Trash2,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { CrmShell, CrmHeader, CrmCard, btnPrimary, btnGhost, inputClass } from "@/components/crm/CrmShell";
import { Tag } from "./index";
import {
  fetchCase,
  fetchCaseEvents,
  fetchCaseNotes,
  fetchCaseAttachments,
  fetchCaseFollowups,
  updateCase,
  promoteDraft,
  markSubmitted,
  closeCase,
  saveCaseNote,
  toggleNotePin,
  deleteCaseNote,
  addAttachment,
  deleteAttachment,
  requestFollowup,
  recordFollowupResponse,
  timelinessOf,
  fmtDate,
  fmtDateTime,
  CASE_STATUSES,
  type IcsrCase,
} from "@/lib/icsr-queries";
import {
  generateNarrative,
  generateMedicalSummary,
  generateCioms,
  generateMedWatch,
  generateE2bXml,
} from "@/lib/icsr-ai";

export const Route = createFileRoute("/crm/icsr/$id")({
  head: () => ({
    meta: [
      { title: "ICSR Case | MedNovaOS Pharmacovigilance" },
      {
        name: "description",
        content:
          "Full individual case safety report — patient, reporter, product, reaction, regulatory information, attachments, notes and case timeline.",
      },
      { property: "og:title", content: "ICSR Case | MedNovaOS Pharmacovigilance" },
      { property: "og:description", content: "Individual case safety report detail view." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CaseDetailPage,
});

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border-b border-border py-2 last:border-0">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm text-foreground">{value || "—"}</div>
    </div>
  );
}

function Panel({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <CrmCard className="mb-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-foreground">{title}</h2>
        {actions}
      </div>
      {children}
    </CrmCard>
  );
}

function CaseDetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [message, setMessage] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [fuQuestion, setFuQuestion] = useState("");
  const [fuDue, setFuDue] = useState("");
  const [subDate, setSubDate] = useState(new Date().toISOString().slice(0, 10));
  const [subRef, setSubRef] = useState("");

  const { data: c, isLoading } = useQuery({ queryKey: ["icsr-case", id], queryFn: () => fetchCase(id) });
  const { data: events } = useQuery({ queryKey: ["icsr-events", id], queryFn: () => fetchCaseEvents(id) });
  const { data: notes } = useQuery({ queryKey: ["icsr-notes", id], queryFn: () => fetchCaseNotes(id) });
  const { data: attachments } = useQuery({ queryKey: ["icsr-attachments", id], queryFn: () => fetchCaseAttachments(id) });
  const { data: followups } = useQuery({ queryKey: ["icsr-followups", id], queryFn: () => fetchCaseFollowups(id) });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["icsr-case", id] });
    qc.invalidateQueries({ queryKey: ["icsr-events", id] });
    qc.invalidateQueries({ queryKey: ["icsr-notes", id] });
    qc.invalidateQueries({ queryKey: ["icsr-attachments", id] });
    qc.invalidateQueries({ queryKey: ["icsr-followups", id] });
    qc.invalidateQueries({ queryKey: ["icsr-cases"] });
    qc.invalidateQueries({ queryKey: ["icsr-stats"] });
  };

  if (isLoading) {
    return (
      <CrmShell>
        <CrmHeader title="Loading case…" />
        <div className="space-y-4 px-8 py-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg border border-border bg-muted/40" />
          ))}
        </div>
      </CrmShell>
    );
  }

  if (!c) {
    return (
      <CrmShell>
        <CrmHeader title="Case not found" subtitle="This case may have been removed." />
        <div className="px-8 py-6">
          <Link to="/crm/icsr" className={btnPrimary}>
            Back to register
          </Link>
        </div>
      </CrmShell>
    );
  }

  const runAi = async (fn: (c: IcsrCase) => Promise<{ message: string }>) => {
    const r = await fn(c);
    setMessage(r.message);
    refresh();
  };

  const emailFollowup = () => {
    navigate({
      to: "/crm/emails/compose",
      search: {
        to: c.reporter_email ?? "",
        subject: `Follow-up on adverse event report ${c.case_ref}`,
        body:
          `Dear ${c.reporter_name ?? "reporter"},\n\n` +
          `Thank you for reporting a suspected adverse reaction involving ${c.product ?? "the product"} ` +
          `(case reference ${c.case_ref}, received ${fmtDate(c.received_date)}).\n\n` +
          `To complete our assessment we would be grateful for the following additional information:\n` +
          `  • Patient outcome to date\n  • Batch / lot number and dosing details\n  • Relevant medical history and concomitant medication\n  • Any laboratory results available\n\n` +
          `Kind regards,\nMedNova Pharmacovigilance`,
        signature: "MedNova Lifesciences · Pharmacovigilance",
      },
    });
  };

  const t = timelinessOf(c);

  return (
    <CrmShell>
      <CrmHeader
        title={c.case_ref}
        subtitle={`${c.product ?? "Unknown product"} · ${c.event_description?.slice(0, 90) ?? "No event description"}`}
        actions={
          <>
            <Link to="/crm/icsr" className={btnGhost}>
              Back to register
            </Link>
            <button className={btnGhost} onClick={emailFollowup}>
              <Mail className="h-4 w-4" /> Follow-up email
            </button>
            {c.is_draft && (
              <button
                className={btnPrimary}
                onClick={async () => {
                  await promoteDraft(c.id);
                  refresh();
                }}
              >
                Submit draft into register
              </button>
            )}
          </>
        }
      />

      <div className="px-8 py-6">
        {message && (
          <div className="mb-4 rounded-lg border border-border bg-muted/40 p-3 text-sm text-foreground">{message}</div>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Tag tone={c.seriousness === "Serious" ? "warn" : "muted"}>{c.seriousness ?? "Not yet assessed"}</Tag>
          <Tag tone={t === "Late" || t === "Overdue" ? "bad" : t === "On time" ? "ok" : "warn"}>{t}</Tag>
          <Tag>{c.is_draft ? "Draft" : c.status}</Tag>
          {c.duplicate_outcome && (
            <Tag tone={c.duplicate_outcome === "Unique" ? "ok" : "bad"}>
              {c.duplicate_outcome}
              {c.duplicate_of ? ` of ${c.duplicate_of}` : ""}
            </Tag>
          )}
          <span className="text-sm text-muted-foreground">
            Day 0 {fmtDate(c.received_date)} · due {fmtDate(c.due_date)}
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Panel title="Patient Information">
              <div className="grid gap-x-6 md:grid-cols-2">
                <Field label="Initials" value={c.patient_initials} />
                <Field label="Age" value={c.patient_age} />
                <Field label="Sex" value={c.patient_sex} />
                <Field label="Weight" value={c.patient_weight} />
                <Field label="Pregnancy status" value={c.patient_pregnancy} />
                <Field label="Ethnicity" value={c.patient_ethnicity} />
              </div>
            </Panel>

            <Panel title="Reporter Information">
              <div className="grid gap-x-6 md:grid-cols-2">
                <Field label="Name" value={c.reporter_name} />
                <Field label="Contact" value={c.reporter_contact} />
                <Field label="Email" value={c.reporter_email} />
                <Field label="Reporter type" value={c.source_type} />
                <Field label="Channel" value={c.channel} />
                <Field label="State" value={c.state} />
                <Field label="Country" value={c.country} />
                <Field label="Date aware (Day 0)" value={fmtDate(c.received_date)} />
              </div>
            </Panel>

            <Panel title="Product Information">
              <div className="grid gap-x-6 md:grid-cols-2">
                <Field label="Product" value={c.product} />
                <Field label="Manufacturer" value={c.manufacturer} />
                <Field label="Batch / lot" value={c.batch} />
                <Field label="Dose" value={c.dose} />
                <Field label="Route" value={c.route} />
                <Field label="Dosage form" value={c.dosage_form} />
                <Field label="Indication" value={c.indication} />
                <Field label="Therapy dates" value={`${fmtDate(c.therapy_start)} → ${fmtDate(c.therapy_stop)}`} />
              </div>
            </Panel>

            <Panel title="Adverse Reaction">
              <div className="grid gap-x-6 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Field label="Reported description" value={c.event_description} />
                </div>
                <Field label="MedDRA term" value={c.meddra_term} />
                <Field label="Outcome" value={c.outcome} />
                <Field label="Onset date" value={fmtDate(c.onset_date)} />
                <Field label="Stop date" value={fmtDate(c.stop_date)} />
                <Field label="Seriousness" value={c.seriousness} />
                <Field label="Seriousness criterion" value={c.seriousness_criterion} />
                <Field label="Causality" value={c.causality} />
                <Field label="Action taken" value={c.action_taken} />
                <Field label="Dechallenge" value={c.dechallenge} />
                <Field label="Rechallenge" value={c.rechallenge} />
              </div>
            </Panel>

            <Panel title="Medical History">
              <p className="whitespace-pre-wrap text-sm text-foreground">{c.medical_history || "—"}</p>
            </Panel>

            <Panel title="Concomitant Medication">
              <p className="whitespace-pre-wrap text-sm text-foreground">{c.concomitant_medication || "—"}</p>
            </Panel>

            <Panel title="Laboratory Results">
              <p className="whitespace-pre-wrap text-sm text-foreground">{c.lab_results || "—"}</p>
            </Panel>

            <Panel
              title="Attachments"
              actions={
                <label className={`${btnGhost} cursor-pointer`}>
                  <Paperclip className="h-4 w-4" /> Upload
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files ?? []);
                      for (const f of files) {
                        await addAttachment(c.id, { name: f.name, type: f.type, size: f.size });
                      }
                      refresh();
                    }}
                  />
                </label>
              }
            >
              {(attachments ?? []).length === 0 && <p className="text-sm text-muted-foreground">No attachments yet.</p>}
              <ul className="divide-y divide-border">
                {(attachments ?? []).map((a) => (
                  <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="flex items-center gap-2 text-foreground">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {a.file_name}
                      <span className="text-xs text-muted-foreground">
                        {a.file_size ? `${Math.round(a.file_size / 1024)} KB` : ""} · {fmtDateTime(a.created_at)}
                      </span>
                    </span>
                    <button
                      className="text-muted-foreground hover:text-destructive"
                      onClick={async () => {
                        await deleteAttachment(a.id, c.id, a.file_name);
                        refresh();
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel title="Follow-up History">
              <div className="mb-4 grid gap-3 md:grid-cols-[1fr_180px_auto]">
                <input
                  className={inputClass}
                  placeholder="What information is needed from the reporter?"
                  value={fuQuestion}
                  onChange={(e) => setFuQuestion(e.target.value)}
                />
                <input type="date" className={inputClass} value={fuDue} onChange={(e) => setFuDue(e.target.value)} />
                <button
                  className={btnPrimary}
                  onClick={async () => {
                    if (!fuQuestion.trim()) return;
                    await requestFollowup(c.id, fuQuestion.trim(), fuDue || null);
                    setFuQuestion("");
                    setFuDue("");
                    refresh();
                  }}
                >
                  Request
                </button>
              </div>
              {(followups ?? []).length === 0 && <p className="text-sm text-muted-foreground">No follow-ups yet.</p>}
              <ul className="divide-y divide-border">
                {(followups ?? []).map((f) => (
                  <li key={f.id} className="py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Tag tone={f.status === "Received" ? "ok" : "warn"}>{f.status}</Tag>
                      <span className="text-xs text-muted-foreground">
                        Requested {fmtDateTime(f.requested_at)} · due {fmtDate(f.due_date)}
                      </span>
                    </div>
                    <p className="mt-1 text-foreground">{f.question}</p>
                    {f.response ? (
                      <p className="mt-1 rounded-md bg-muted/40 p-2 text-foreground">{f.response}</p>
                    ) : (
                      <FollowupResponse
                        onSave={async (text) => {
                          await recordFollowupResponse(f.id, c.id, text);
                          refresh();
                        }}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel title="Internal Notes">
              <div className="mb-4 grid gap-3">
                <input
                  className={inputClass}
                  placeholder="Note title"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                />
                <textarea
                  className="min-h-[90px] w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-brand"
                  placeholder="Internal note (never shared with the reporter)"
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                />
                <div>
                  <button
                    className={btnPrimary}
                    onClick={async () => {
                      if (!noteBody.trim()) return;
                      await saveCaseNote({ case_id: c.id, title: noteTitle.trim() || "Untitled note", body: noteBody.trim() });
                      setNoteTitle("");
                      setNoteBody("");
                      refresh();
                    }}
                  >
                    Add note
                  </button>
                </div>
              </div>
              <ul className="divide-y divide-border">
                {(notes ?? []).map((n) => (
                  <li key={n.id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-foreground">{n.title}</div>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{n.body}</p>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {n.author} · {fmtDateTime(n.created_at)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className={n.pinned ? "text-brand" : "text-muted-foreground hover:text-foreground"}
                          onClick={async () => {
                            await toggleNotePin(n.id, !n.pinned);
                            refresh();
                          }}
                        >
                          <Pin className="h-4 w-4" />
                        </button>
                        <button
                          className="text-muted-foreground hover:text-destructive"
                          onClick={async () => {
                            await deleteCaseNote(n.id);
                            refresh();
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
                {(notes ?? []).length === 0 && <p className="text-sm text-muted-foreground">No internal notes yet.</p>}
              </ul>
            </Panel>
          </div>

          <div>
            <Panel title="Regulatory Information">
              <Field label="Report type" value={c.report_type} />
              <Field label="Regulator" value={c.regulator} />
              <Field label="Submission due" value={fmtDate(c.due_date)} />
              <Field label="Submitted" value={fmtDate(c.submitted_date)} />
              <Field label="Submission reference" value={c.submission_reference} />
              <Field label="Timeliness" value={t} />
              {!c.submitted_date && (
                <div className="mt-4 grid gap-3">
                  <input type="date" className={inputClass} value={subDate} onChange={(e) => setSubDate(e.target.value)} />
                  <input
                    className={inputClass}
                    placeholder="Submission reference"
                    value={subRef}
                    onChange={(e) => setSubRef(e.target.value)}
                  />
                  <button
                    className={btnPrimary}
                    onClick={async () => {
                      await markSubmitted(c.id, subDate, subRef);
                      refresh();
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4" /> Record submission
                  </button>
                </div>
              )}
            </Panel>

            <Panel title="Case Management">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Status
              </label>
              <select
                className={inputClass}
                value={c.status}
                onChange={async (e) => {
                  await updateCase(c.id, { status: e.target.value }, `Status changed to ${e.target.value}`);
                  refresh();
                }}
              >
                {CASE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <label className="mb-1 mt-4 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Assigned to
              </label>
              <input
                className={inputClass}
                defaultValue={c.assignee ?? ""}
                onBlur={async (e) => {
                  if (e.target.value === (c.assignee ?? "")) return;
                  await updateCase(c.id, { assignee: e.target.value }, `Case assigned to ${e.target.value || "nobody"}`);
                  refresh();
                }}
              />
              <button
                className={`${btnGhost} mt-4 w-full justify-center`}
                onClick={async () => {
                  await closeCase(c.id);
                  refresh();
                }}
              >
                Close case
              </button>
            </Panel>

            <Panel title="AI Assistance">
              <p className="mb-3 text-xs text-muted-foreground">
                Placeholders only — model calls are wired in <code>src/lib/icsr-ai.ts</code> once AI is enabled.
              </p>
              <div className="grid gap-2">
                {[
                  ["Generate narrative", generateNarrative],
                  ["Generate medical summary", generateMedicalSummary],
                  ["Generate CIOMS I", generateCioms],
                  ["Generate MedWatch 3500A", generateMedWatch],
                  ["Generate E2B(R3) XML", generateE2bXml],
                ].map(([label, fn]) => (
                  <button
                    key={label as string}
                    className={`${btnGhost} justify-start`}
                    onClick={() => runAi(fn as (c: IcsrCase) => Promise<{ message: string }>)}
                  >
                    <Sparkles className="h-4 w-4 text-brand" /> {label as string}
                  </button>
                ))}
              </div>
            </Panel>

            <Panel title="Case Timeline">
              <ol className="relative border-l border-border pl-4">
                {(events ?? []).map((e) => (
                  <li key={e.id} className="mb-4 last:mb-0">
                    <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-brand" />
                    <div className="text-sm font-semibold text-foreground">{e.event_type}</div>
                    <p className="text-sm text-muted-foreground">{e.message}</p>
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> {fmtDateTime(e.created_at)} · {e.actor}
                    </div>
                  </li>
                ))}
                {(events ?? []).length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
              </ol>
            </Panel>
          </div>
        </div>
      </div>
    </CrmShell>
  );
}

function FollowupResponse({ onSave }: { onSave: (text: string) => Promise<void> }) {
  const [text, setText] = useState("");
  return (
    <div className="mt-2 flex gap-2">
      <input
        className={inputClass}
        placeholder="Record the reporter's response…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        className={btnGhost}
        onClick={async () => {
          if (!text.trim()) return;
          await onSave(text.trim());
          setText("");
        }}
      >
        Save
      </button>
    </div>
  );
}
