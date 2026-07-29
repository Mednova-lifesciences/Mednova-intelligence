import { supabase } from "@/integrations/supabase/client";

export const SOURCE_TYPES = [
  "Community pharmacist",
  "Patent medicine vendor",
  "Physician",
  "Nurse",
  "Distributor / wholesaler",
  "Medical representative",
  "Patient or carer",
  "Other HCP",
] as const;

export const CHANNELS = [
  "WhatsApp",
  "Phone call",
  "Email",
  "Field representative",
  "Web portal",
  "In person",
] as const;

export const SERIOUSNESS = ["Serious", "Non-serious", "Not yet assessed"] as const;

export const SERIOUSNESS_CRITERIA = [
  "Death",
  "Life-threatening",
  "Hospitalisation",
  "Disability",
  "Congenital anomaly",
  "Medically important",
] as const;

export const CASE_STATUSES = [
  "Draft",
  "Open - triage",
  "Under assessment",
  "Awaiting follow-up",
  "Submitted",
  "Closed - duplicate",
  "Closed",
] as const;

export const OUTCOMES = [
  "Recovered",
  "Recovering",
  "Not recovered",
  "Recovered with sequelae",
  "Fatal",
  "Unknown",
] as const;

export const CAUSALITY = ["Certain", "Probable", "Possible", "Unlikely", "Unclassified"] as const;

export const ACTIONS_TAKEN = [
  "Drug withdrawn",
  "Dose reduced",
  "Dose increased",
  "Dose not changed",
  "Unknown",
  "Not applicable",
] as const;

export type IcsrCase = {
  id: string;
  case_ref: string;
  status: string;
  is_draft: boolean;
  assignee: string | null;
  reporter_name: string | null;
  reporter_contact: string | null;
  reporter_email: string | null;
  source_type: string | null;
  channel: string | null;
  state: string | null;
  country: string | null;
  received_date: string | null;
  patient_initials: string | null;
  patient_age: string | null;
  patient_sex: string | null;
  patient_weight: string | null;
  patient_pregnancy: string | null;
  patient_ethnicity: string | null;
  product: string | null;
  manufacturer: string | null;
  batch: string | null;
  dose: string | null;
  route: string | null;
  dosage_form: string | null;
  indication: string | null;
  therapy_start: string | null;
  therapy_stop: string | null;
  product_id: string | null;
  event_description: string | null;
  meddra_term: string | null;
  onset_date: string | null;
  stop_date: string | null;
  outcome: string | null;
  seriousness: string | null;
  seriousness_criterion: string | null;
  causality: string | null;
  action_taken: string | null;
  dechallenge: string | null;
  rechallenge: string | null;
  medical_history: string | null;
  concomitant_medication: string | null;
  lab_results: string | null;
  notes: string | null;
  due_date: string | null;
  submitted_date: string | null;
  report_type: string | null;
  regulator: string | null;
  submission_reference: string | null;
  e2b_generated: boolean;
  cioms_generated: boolean;
  medwatch_generated: boolean;
  ai_narrative: string | null;
  ai_medical_summary: string | null;
  fingerprint: string | null;
  duplicate_outcome: string | null;
  duplicate_of: string | null;
  created_at: string;
  updated_at: string;
};

export type IcsrEvent = {
  id: string;
  case_id: string | null;
  event_type: string;
  message: string;
  actor: string;
  created_at: string;
};

export type IcsrNote = {
  id: string;
  case_id: string | null;
  title: string;
  body: string;
  author: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
};

export type IcsrAttachment = {
  id: string;
  case_id: string | null;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  storage_path: string | null;
  uploaded_by: string;
  created_at: string;
};

export type IcsrFollowup = {
  id: string;
  case_id: string | null;
  requested_at: string;
  requested_by: string;
  due_date: string | null;
  question: string | null;
  response: string | null;
  received_at: string | null;
  status: string;
  created_at: string;
};

/* ---------------- helpers ---------------- */

const norm = (s: string | null | undefined) => String(s ?? "").trim().toUpperCase().replace(/\s+/g, " ");

export function fingerprintOf(c: Partial<IcsrCase>) {
  if (!c.patient_initials || !c.product) return null;
  return `${norm(c.patient_initials)}|${norm(c.product)}|${norm(c.event_description).slice(0, 12)}`;
}

export function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Serious → 15 calendar days from Day 0. Non-serious → 90 days. */
export function dueDateFor(received: string | null | undefined, seriousness: string | null | undefined) {
  if (!received) return null;
  if (seriousness === "Serious") return addDays(received, 15);
  if (seriousness === "Non-serious") return addDays(received, 90);
  return null;
}

export function timelinessOf(c: Pick<IcsrCase, "due_date" | "submitted_date">) {
  const today = new Date().toISOString().slice(0, 10);
  if (!c.due_date) return "Pending";
  if (c.submitted_date) return c.submitted_date <= c.due_date ? "On time" : "Late";
  return today > c.due_date ? "Overdue" : "Pending";
}

export function isFlagged(c: IcsrCase) {
  return c.duplicate_outcome === "Under review";
}

export function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso.length > 10 ? iso : `${iso}T00:00:00`);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function nextCaseRef() {
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("icsr_cases")
    .select("id", { count: "exact", head: true })
    .like("case_ref", `ICSR-${year}-%`);
  return `ICSR-${year}-${String((count ?? 0) + 1).padStart(4, "0")}`;
}

export async function logCaseEvent(caseId: string, eventType: string, message: string, actor = "MedNova User") {
  await supabase.from("icsr_case_events").insert({
    case_id: caseId,
    event_type: eventType,
    message,
    actor,
  });
}

/* ---------------- reads ---------------- */

export type CaseFilters = {
  search?: string;
  status?: string;
  seriousness?: string;
  country?: string;
  manufacturer?: string;
  view?: "all" | "flag" | "serious" | "late" | "open" | "drafts";
};

export async function fetchCases(filters: CaseFilters = {}) {
  let q = supabase.from("icsr_cases").select("*").order("created_at", { ascending: false }).limit(500);

  if (filters.search) {
    const s = `%${filters.search}%`;
    q = q.or(
      [
        `case_ref.ilike.${s}`,
        `patient_initials.ilike.${s}`,
        `product.ilike.${s}`,
        `reporter_name.ilike.${s}`,
        `manufacturer.ilike.${s}`,
        `country.ilike.${s}`,
        `seriousness.ilike.${s}`,
        `status.ilike.${s}`,
        `event_description.ilike.${s}`,
      ].join(","),
    );
  }
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.seriousness) q = q.eq("seriousness", filters.seriousness);
  if (filters.country) q = q.eq("country", filters.country);
  if (filters.manufacturer) q = q.ilike("manufacturer", `%${filters.manufacturer}%`);

  const { data, error } = await q;
  if (error) throw error;
  let rows = (data ?? []) as IcsrCase[];

  const today = new Date().toISOString().slice(0, 10);
  switch (filters.view) {
    case "flag":
      rows = rows.filter(isFlagged);
      break;
    case "serious":
      rows = rows.filter((c) => c.seriousness === "Serious");
      break;
    case "late":
      rows = rows.filter(
        (c) =>
          (c.submitted_date && c.due_date && c.submitted_date > c.due_date) ||
          (!c.submitted_date && c.due_date && c.due_date < today),
      );
      break;
    case "open":
      rows = rows.filter((c) => !c.submitted_date && !c.is_draft);
      break;
    case "drafts":
      rows = rows.filter((c) => c.is_draft);
      break;
    default:
      break;
  }
  return rows;
}

export async function fetchCase(id: string) {
  const { data, error } = await supabase.from("icsr_cases").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as IcsrCase | null;
}

export async function fetchCaseEvents(caseId: string) {
  const { data, error } = await supabase
    .from("icsr_case_events")
    .select("*")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as IcsrEvent[];
}

export async function fetchCaseNotes(caseId: string) {
  const { data, error } = await supabase
    .from("icsr_notes")
    .select("*")
    .eq("case_id", caseId)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as IcsrNote[];
}

export async function fetchCaseAttachments(caseId: string) {
  const { data, error } = await supabase
    .from("icsr_attachments")
    .select("*")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as IcsrAttachment[];
}

export async function fetchCaseFollowups(caseId: string) {
  const { data, error } = await supabase
    .from("icsr_followups")
    .select("*")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as IcsrFollowup[];
}

export async function fetchIcsrStats() {
  const { data, error } = await supabase.rpc("icsr_stats");
  if (error) throw error;
  return data as {
    total: number;
    drafts: number;
    unique_cases: number;
    awaiting_dup_review: number;
    serious: number;
    submitted: number;
    late: number;
    overdue: number;
    open_cases: number;
    by_channel: { label: string; count: number }[];
    by_source: { label: string; count: number }[];
  };
}

export async function fetchRecentIcsrEvents(limit = 120) {
  const { data, error } = await supabase
    .from("icsr_case_events")
    .select("*, icsr_cases(case_ref)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as (IcsrEvent & { icsr_cases: { case_ref: string } | null })[];
}

/* ---------------- writes ---------------- */

export type CaseInput = Partial<Omit<IcsrCase, "id" | "created_at" | "updated_at" | "case_ref">>;

export async function findDuplicates(fingerprint: string | null, excludeId?: string) {
  if (!fingerprint) return [] as IcsrCase[];
  let q = supabase.from("icsr_cases").select("*").eq("fingerprint", fingerprint);
  if (excludeId) q = q.neq("id", excludeId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as IcsrCase[];
}

export async function createCase(input: CaseInput, { draft = false }: { draft?: boolean } = {}) {
  const case_ref = await nextCaseRef();
  const fingerprint = fingerprintOf(input);
  const payload = {
    ...input,
    case_ref,
    is_draft: draft,
    status: draft ? "Draft" : (input.status ?? "Open - triage"),
    fingerprint,
    due_date: dueDateFor(input.received_date, input.seriousness),
  };
  const { data, error } = await supabase.from("icsr_cases").insert(payload).select("*").single();
  if (error) throw error;
  const created = data as IcsrCase;

  await logCaseEvent(
    created.id,
    draft ? "Draft Saved" : "Case Created",
    draft
      ? "Draft saved before submission"
      : `Case logged at intake — channel: ${created.channel ?? "—"}, source: ${created.source_type ?? "—"}`,
  );

  if (!draft && fingerprint) {
    const matches = await findDuplicates(fingerprint, created.id);
    if (matches.length) {
      await supabase.from("icsr_cases").update({ duplicate_outcome: "Under review" }).eq("id", created.id);
      await logCaseEvent(
        created.id,
        "Updated",
        `Fingerprint match against ${matches[0].case_ref} — flagged for human review`,
      );
      return { case: { ...created, duplicate_outcome: "Under review" }, matches };
    }
  }
  return { case: created, matches: [] as IcsrCase[] };
}

export async function updateCase(id: string, input: CaseInput, message = "Case details updated") {
  const payload: CaseInput = { ...input };
  if (input.received_date !== undefined || input.seriousness !== undefined) {
    payload.due_date = dueDateFor(input.received_date, input.seriousness);
  }
  if (input.patient_initials !== undefined || input.product !== undefined) {
    payload.fingerprint = fingerprintOf(input);
  }
  const { data, error } = await supabase.from("icsr_cases").update(payload).eq("id", id).select("*").single();
  if (error) throw error;
  await logCaseEvent(id, "Updated", message);
  return data as IcsrCase;
}

export async function promoteDraft(id: string) {
  const { error } = await supabase
    .from("icsr_cases")
    .update({ is_draft: false, status: "Open - triage" })
    .eq("id", id);
  if (error) throw error;
  await logCaseEvent(id, "Case Created", "Draft promoted to a live intake case");
}

export async function resolveDuplicate(
  id: string,
  caseRef: string,
  otherRef: string,
  outcome: "Confirmed duplicate" | "Unique" | "Under review",
) {
  const update =
    outcome === "Confirmed duplicate"
      ? { duplicate_outcome: outcome, duplicate_of: otherRef, status: "Closed - duplicate" }
      : { duplicate_outcome: outcome, duplicate_of: null };
  const { error } = await supabase.from("icsr_cases").update(update).eq("id", id);
  if (error) throw error;
  const message =
    outcome === "Confirmed duplicate"
      ? `${caseRef} linked to ${otherRef} as a confirmed duplicate — retained, never deleted`
      : outcome === "Unique"
        ? `Reviewed against ${otherRef} and confirmed as a separate case`
        : `Duplicate review against ${otherRef} deferred`;
  await logCaseEvent(id, "Updated", message);
}

export async function markSubmitted(id: string, submitted_date: string, submission_reference: string) {
  const { error } = await supabase
    .from("icsr_cases")
    .update({ submitted_date, submission_reference, status: "Submitted" })
    .eq("id", id);
  if (error) throw error;
  await logCaseEvent(id, "Submitted", `Submitted to regulator on ${fmtDate(submitted_date)}`);
}

export async function closeCase(id: string) {
  const { error } = await supabase.from("icsr_cases").update({ status: "Closed" }).eq("id", id);
  if (error) throw error;
  await logCaseEvent(id, "Closed", "Case closed");
}

export async function saveCaseNote(note: { id?: string; case_id: string; title: string; body: string }) {
  if (note.id) {
    const { error } = await supabase
      .from("icsr_notes")
      .update({ title: note.title, body: note.body })
      .eq("id", note.id);
    if (error) throw error;
    await logCaseEvent(note.case_id, "Updated", `Internal note updated — ${note.title}`);
    return;
  }
  const { error } = await supabase
    .from("icsr_notes")
    .insert({ case_id: note.case_id, title: note.title, body: note.body });
  if (error) throw error;
  await logCaseEvent(note.case_id, "Updated", `Internal note added — ${note.title}`);
}

export async function toggleNotePin(id: string, pinned: boolean) {
  const { error } = await supabase.from("icsr_notes").update({ pinned }).eq("id", id);
  if (error) throw error;
}

export async function deleteCaseNote(id: string) {
  const { error } = await supabase.from("icsr_notes").delete().eq("id", id);
  if (error) throw error;
}

export async function addAttachment(caseId: string, file: { name: string; type: string; size: number }) {
  const { error } = await supabase.from("icsr_attachments").insert({
    case_id: caseId,
    file_name: file.name,
    file_type: file.type,
    file_size: file.size,
  });
  if (error) throw error;
  await logCaseEvent(caseId, "Updated", `Attachment added — ${file.name}`);
}

export async function deleteAttachment(id: string, caseId: string, name: string) {
  const { error } = await supabase.from("icsr_attachments").delete().eq("id", id);
  if (error) throw error;
  await logCaseEvent(caseId, "Updated", `Attachment removed — ${name}`);
}

export async function requestFollowup(caseId: string, question: string, due_date: string | null) {
  const { error } = await supabase
    .from("icsr_followups")
    .insert({ case_id: caseId, question, due_date, status: "Requested" });
  if (error) throw error;
  await supabase.from("icsr_cases").update({ status: "Awaiting follow-up" }).eq("id", caseId);
  await logCaseEvent(caseId, "Follow-up Requested", question || "Follow-up information requested from reporter");
}

export async function recordFollowupResponse(id: string, caseId: string, response: string) {
  const { error } = await supabase
    .from("icsr_followups")
    .update({ response, received_at: new Date().toISOString(), status: "Received" })
    .eq("id", id);
  if (error) throw error;
  await logCaseEvent(caseId, "Follow-up Received", response.slice(0, 180) || "Follow-up response received");
}

export function caseToCsvRow(c: IcsrCase) {
  return [
    c.case_ref,
    c.received_date ?? "",
    c.channel ?? "",
    c.source_type ?? "",
    c.reporter_name ?? "",
    c.state ?? "",
    c.country ?? "",
    c.product ?? "",
    c.manufacturer ?? "",
    c.batch ?? "",
    c.patient_initials ?? "",
    c.patient_age ?? "",
    c.patient_sex ?? "",
    c.event_description ?? "",
    c.seriousness ?? "",
    c.seriousness_criterion ?? "",
    c.fingerprint ?? "",
    c.duplicate_outcome ?? "",
    c.duplicate_of ?? "",
    c.due_date ?? "",
    c.submitted_date ?? "",
    timelinessOf(c),
    c.status,
  ];
}

export const CSV_HEADER = [
  "Case ID",
  "Day 0",
  "Channel",
  "Source type",
  "Reporter",
  "State",
  "Country",
  "Product",
  "Manufacturer",
  "Batch",
  "Patient",
  "Age",
  "Sex",
  "Event",
  "Seriousness",
  "Criterion",
  "Fingerprint",
  "Duplicate outcome",
  "Duplicate of",
  "Submission due",
  "Submitted",
  "Timeliness",
  "Status",
];
