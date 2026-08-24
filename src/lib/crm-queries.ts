import { supabase } from "@/integrations/supabase/client";

export const PIPELINE_STAGES = [
  "Lead",
  "Qualified",
  "Contacted",
  "Meeting",
  "Proposal",
  "Negotiation",
  "Won",
  "Lost",
] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const TASK_STATES = ["Not Started", "In Progress", "Completed", "Deleted"] as const;
export type TaskState = (typeof TASK_STATES)[number];

export const TASK_TYPES = ["Follow-up", "Call", "Meeting", "Email", "Proposal", "Other"] as const;

export type Company = {
  id: string;
  name: string;
  manufacturer: string | null;
  category: string | null;
  country: string | null;
  portfolio: string | null;
  estimated_value: number;
  priority: string | null;
  probability: number;
  source_opportunity_id: string | null;
  product: string | null;
  status: string;
  stage: string;
  score: number;
  website: string | null;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  description: string | null;
  last_activity_at: string;
  next_followup_date: string | null;
  created_at: string;
  updated_at: string;
};

export type Contact = {
  id: string;
  company_id: string | null;
  name: string;
  role: string | null;
  department: string | null;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  source: string | null;
  created_at: string;
};

export type Task = {
  id: string;
  company_id: string | null;
  title: string;
  task_type: string;
  due_date: string | null;
  assignee: string | null;
  state: string;
  completed_at: string | null;
  deleted_at: string | null;
  created_at: string;
};

export type Activity = {
  id: string;
  company_id: string | null;
  activity_type: string;
  message: string;
  description: string | null;
  actor: string;
  created_at: string;
};

export type CrmStats = {
  companies_added: number;
  active_leads: number;
  active_opportunities: number;
  won_clients: number;
  lost_clients: number;
  tasks_due: number;
  tasks_open: number;
  tasks_completed: number;
  meetings_scheduled: number;
  pipeline_value: number;
  weighted_value: number;
};

export async function fetchCrmStats(): Promise<CrmStats> {
  const { data, error } = await supabase.rpc("crm_dashboard_stats");
  if (error) throw error;
  return data as unknown as CrmStats;
}

export async function logActivity(
  companyId: string | null,
  activityType: string,
  message: string,
  description?: string | null,
) {
  await supabase.from("activities").insert({
    company_id: companyId,
    activity_type: activityType,
    message,
    description: description ?? null,
  });
  if (companyId) {
    await supabase
      .from("companies")
      .update({ last_activity_at: new Date().toISOString() })
      .eq("id", companyId);
  }
}

export type ActivityRow = Activity & { companies: { name: string } | null };

export async function fetchActivities(
  limit = 25,
  companyId?: string,
  opts?: { search?: string; type?: string; sort?: "newest" | "oldest" },
) {
  let q = supabase
    .from("activities")
    .select("*, companies(name)")
    .order("created_at", { ascending: opts?.sort === "oldest" })
    .limit(limit);
  if (companyId) q = q.eq("company_id", companyId);
  if (opts?.type) q = q.eq("activity_type", opts.type);
  if (opts?.search) {
    const s = `%${opts.search}%`;
    q = q.or(`message.ilike.${s},activity_type.ilike.${s},description.ilike.${s}`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as ActivityRow[];
}

/* ------------------------------- Companies ------------------------------- */

export async function fetchCompanies(opts?: { search?: string; stage?: string; status?: string; sort?: string }) {
  let q = supabase.from("companies").select("*");
  if (opts?.search) {
    const s = `%${opts.search}%`;
    q = q.or(`name.ilike.${s},manufacturer.ilike.${s},country.ilike.${s},portfolio.ilike.${s}`);
  }
  if (opts?.stage) q = q.eq("stage", opts.stage);
  if (opts?.status) q = q.eq("status", opts.status);
  if (opts?.sort === "name") q = q.order("name", { ascending: true });
  else if (opts?.sort === "value") q = q.order("estimated_value", { ascending: false });
  else q = q.order("created_at", { ascending: false });
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Company[];
}

export async function fetchCompany(id: string) {
  const { data, error } = await supabase.from("companies").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Company | null;
}

export type AddCompanyResult =
  | { ok: true; company: Company }
  | { ok: false; reason: "duplicate"; company: Company };

/**
 * Creates a CRM company from an automatically generated opportunity.
 * A company name may exist only once across the CRM.
 */
export async function addCompanyFromOpportunity(o: {
  id: string;
  company: string;
  manufacturer: string | null;
  category: string | null;
  product: string | null;
  estimated_value: number;
  priority: string;
  probability: number;
  service_type: string | null;
}): Promise<AddCompanyResult> {
  const { data: existing } = await supabase
    .from("companies")
    .select("*")
    .ilike("name", o.company)
    .maybeSingle();
  if (existing) return { ok: false, reason: "duplicate", company: existing as Company };

  const manufacturer = o.manufacturer ?? o.company;
  const product = o.product ?? (o.service_type ? `${o.service_type}` : null);

  const { data, error } = await supabase
    .from("companies")
    .insert({
      name: o.company,
      manufacturer,
      category: o.category,
      // Every company here comes from the NAFDAC Green Book, which only
      // regulates the Nigerian market -- there's no ambiguity to resolve.
      // Previously left null (always rendered as "Unknown"); nothing in
      // the sync pipeline ever populated it.
      country: "Nigeria",
      portfolio: o.service_type,
      estimated_value: o.estimated_value,
      priority: o.priority,
      probability: o.probability,
      source_opportunity_id: o.id,
      product,
      status: "Prospect",
      stage: "Lead",
      score: o.probability,
    })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") {
      const { data: dup } = await supabase
        .from("companies")
        .select("*")
        .ilike("name", o.company)
        .maybeSingle();
      if (dup) return { ok: false, reason: "duplicate", company: dup as Company };
    }
    throw error;
  }

  const company = data as Company;
  await supabase
    .from("pipeline_stage_history")
    .insert({ company_id: company.id, from_stage: null, to_stage: "Lead" });
  await logActivity(company.id, "Company Added", `${company.name} added to CRM from opportunity`);
  return { ok: true, company };
}

export async function moveCompanyStage(company: Company, toStage: PipelineStage) {
  if (company.stage === toStage) return;
  const status = toStage === "Won" ? "Client" : toStage === "Lost" ? "Lost" : "Prospect";
  const { error } = await supabase
    .from("companies")
    .update({ stage: toStage, status, last_activity_at: new Date().toISOString() })
    .eq("id", company.id);
  if (error) throw error;
  await supabase
    .from("pipeline_stage_history")
    .insert({ company_id: company.id, from_stage: company.stage, to_stage: toStage });
  await logActivity(company.id, `Moved to ${toStage}`, `${company.name} moved to ${toStage}`);
}

export async function fetchStageHistory(companyId: string) {
  const { data, error } = await supabase
    .from("pipeline_stage_history")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

function normalizeOpportunityRow(o: {
  id: string;
  opportunity_id: number | null;
  company: string;
  manufacturer: string | null;
  product: string | null;
  product_count?: number;
  category: string | null;
  service_type: string | null;
  opportunity_type: string | null;
  estimated_value: number;
  probability: number;
  priority: string;
  expiry_date: string | null;
  close_date?: string | null;
  status: string;
  recommendation: string | null;
  created_at: string;
}) {
  return {
    ...o,
    manufacturer: o.manufacturer ?? o.company ?? null,
    product: o.product ?? (o.product_count ? `${o.product_count} products` : null),
    service_type: o.service_type ?? o.opportunity_type ?? null,
    expiry_date: o.expiry_date ?? o.close_date ?? null,
    recommendation:
      o.recommendation ??
      (o.opportunity_type ? `This is a ${o.opportunity_type} opportunity for ${o.company}.` : null),
  };
}

export async function fetchCompanyOpportunities(company: Company) {
  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("company", company.name)
    .order("estimated_value", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map(normalizeOpportunityRow);
}

export async function fetchCompanyProducts(company: Company) {
  const lookups = [company.manufacturer, company.name].filter(Boolean) as string[];
  if (lookups.length === 0) return [];

  const conditions = lookups
    .map((value) => `manufacturer.eq.${value},applicant.eq.${value}`)
    .join(',');

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .or(conditions)
    .limit(25);
  if (error) throw error;
  return data ?? [];
}

/* -------------------------------- Contacts ------------------------------- */

export async function fetchContacts(opts?: { search?: string; companyId?: string; sort?: string }) {
  let q = supabase.from("contacts").select("*, companies(name)");
  if (opts?.companyId) q = q.eq("company_id", opts.companyId);
  if (opts?.search) {
    const s = `%${opts.search}%`;
    q = q.or(`name.ilike.${s},email.ilike.${s},role.ilike.${s},department.ilike.${s}`);
  }
  if (opts?.sort === "name") q = q.order("name", { ascending: true });
  else q = q.order("created_at", { ascending: false });
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as (Contact & { companies: { name: string } | null })[];
}

export async function insertContacts(rows: Omit<Contact, "id" | "created_at">[]) {
  const { error } = await supabase.from("contacts").insert(rows);
  if (error) throw error;
}

/* --------------------------------- Tasks --------------------------------- */

export async function fetchTasks(state?: string) {
  // Deleted tasks are purged automatically after 2 days.
  await supabase.rpc("purge_deleted_tasks");
  let q = supabase.from("tasks").select("*, companies(name)").order("due_date", { ascending: true });
  if (state) q = q.eq("state", state);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as (Task & { companies: { name: string } | null })[];
}

export async function createTask(t: {
  company_id: string | null;
  title: string;
  task_type: string;
  due_date: string | null;
  assignee: string | null;
}) {
  const { data, error } = await supabase.from("tasks").insert(t).select("*").single();
  if (error) throw error;
  await logActivity(t.company_id, "Task Created", `Task created: ${t.title}`);
  return data as Task;
}

export async function updateTask(id: string, patch: Partial<Task>) {
  const { error } = await supabase.from("tasks").update(patch).eq("id", id);
  if (error) throw error;
}

export async function setTaskState(task: Task, state: TaskState) {
  const patch: Partial<Task> = { state };
  if (state === "Completed") patch.completed_at = new Date().toISOString();
  if (state === "Deleted") patch.deleted_at = new Date().toISOString();
  await updateTask(task.id, patch);
  if (state === "Completed") await logActivity(task.company_id, "Task Completed", `Task completed: ${task.title}`);
  if (state === "Deleted") await logActivity(task.company_id, "Task Deleted", `Task deleted: ${task.title}`);
}

/* --------------------------------- Emails -------------------------------- */

export type EmailDraft = {
  company_id: string | null;
  contact_id: string | null;
  to_address: string;
  cc_address: string;
  bcc_address: string;
  subject: string;
  body: string;
  signature: string;
};

export async function saveEmail(draft: EmailDraft, status: "draft" | "sent") {
  const { data, error } = await supabase
    .from("emails")
    .insert({ ...draft, status, sent_at: status === "sent" ? new Date().toISOString() : null })
    .select("*")
    .single();
  if (error) throw error;
  if (status === "sent") {
    await logActivity(draft.company_id, "Email Sent", `Email sent: ${draft.subject}`);
  }
  return data;
}

export type EmailRow = {
  id: string;
  company_id: string | null;
  to_address: string | null;
  cc_address: string | null;
  bcc_address: string | null;
  subject: string | null;
  body: string | null;
  signature: string | null;
  status: string;
  sent_by: string;
  sent_at: string | null;
  opened_at: string | null;
  replied_at: string | null;
  created_at: string;
  companies: { name: string } | null;
};

export async function fetchEmails(companyId?: string, opts?: { search?: string; status?: string }) {
  let q = supabase.from("emails").select("*, companies(name)").order("created_at", { ascending: false });
  if (companyId) q = q.eq("company_id", companyId);
  if (opts?.status) q = q.eq("status", opts.status);
  if (opts?.search) {
    const s = `%${opts.search}%`;
    q = q.or(`subject.ilike.${s},to_address.ilike.${s}`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as EmailRow[];
}

export async function fetchEmail(id: string) {
  const { data, error } = await supabase
    .from("emails")
    .select("*, companies(name)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as EmailRow | null;
}

/* --------------------------------- Notes --------------------------------- */

export type Note = {
  id: string;
  company_id: string | null;
  title: string;
  body: string;
  author: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
};

export type NoteRow = Note & { companies: { name: string } | null };

export async function fetchNotes(opts?: {
  companyId?: string | null;
  standaloneOnly?: boolean;
  search?: string;
  sort?: "newest" | "oldest";
}) {
  let q = supabase.from("notes").select("*, companies(name)");
  if (opts?.companyId) q = q.eq("company_id", opts.companyId);
  if (opts?.standaloneOnly) q = q.is("company_id", null);
  if (opts?.search) {
    const s = `%${opts.search}%`;
    q = q.or(`title.ilike.${s},body.ilike.${s}`);
  }
  q = q.order("pinned", { ascending: false }).order("created_at", { ascending: opts?.sort === "oldest" });
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as NoteRow[];
}

export async function createNote(n: { company_id: string | null; title: string; body: string }) {
  const { data, error } = await supabase
    .from("notes")
    .insert({ company_id: n.company_id, title: n.title || "Untitled note", body: n.body })
    .select("*")
    .single();
  if (error) throw error;
  await logActivity(n.company_id, "Note Created", `Note created: ${n.title || "Untitled note"}`);
  return data as unknown as Note;
}

export async function updateNote(note: Note, patch: Partial<Pick<Note, "title" | "body" | "pinned">>) {
  const { error } = await supabase.from("notes").update(patch).eq("id", note.id);
  if (error) throw error;
  if (patch.pinned === undefined) {
    await logActivity(note.company_id, "Note Updated", `Note updated: ${patch.title ?? note.title}`);
  }
}

export async function deleteNote(note: Note) {
  const { error } = await supabase.from("notes").delete().eq("id", note.id);
  if (error) throw error;
  await logActivity(note.company_id, "Note Deleted", `Note deleted: ${note.title}`);
}
