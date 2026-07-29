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
) {
  await supabase.from("activities").insert({
    company_id: companyId,
    activity_type: activityType,
    message,
  });
  if (companyId) {
    await supabase
      .from("companies")
      .update({ last_activity_at: new Date().toISOString() })
      .eq("id", companyId);
  }
}

export async function fetchActivities(limit = 25, companyId?: string) {
  let q = supabase
    .from("activities")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (companyId) q = q.eq("company_id", companyId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Activity[];
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

  const { data, error } = await supabase
    .from("companies")
    .insert({
      name: o.company,
      manufacturer: o.manufacturer,
      category: o.category,
      country: null,
      portfolio: o.service_type,
      estimated_value: o.estimated_value,
      priority: o.priority,
      probability: o.probability,
      source_opportunity_id: o.id,
      product: o.product,
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

export async function fetchCompanyOpportunities(company: Company) {
  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("company", company.name)
    .order("estimated_value", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function fetchCompanyProducts(company: Company) {
  if (!company.manufacturer) return [];
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("manufacturer", company.manufacturer)
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

export async function fetchEmails(companyId?: string) {
  let q = supabase.from("emails").select("*, companies(name)").order("created_at", { ascending: false });
  if (companyId) q = q.eq("company_id", companyId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}
