import { supabase } from "@/integrations/supabase/client";

export type Product = {
  id: string;
  product_name: string;
  manufacturer: string | null;
  applicant: string | null;
  category: string | null;
  dosage_form: string | null;
  route: string | null;
  nafdac_number: string | null;
  registration_date: string | null;
  approval_date: string | null;
  expiry_date: string | null;
  status: string;
  strength: string | null;
  pack_size: string | null;
  composition: string | null;
  last_synced: string;
};

export type DashboardStats = {
  manufacturers: number;
  products: number;
  opportunities: number;
  pipeline: number;
  avg_value: number;
  high_priority: number;
  expiring_12m: number;
  by_category: { category: string; count: number }[];
  top_renewals: { applicant: string; count: number }[];
};

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data, error } = await supabase.rpc("dashboard_stats");
  if (error) throw error;
  return data as unknown as DashboardStats;
}

export async function fetchLastSync() {
  const { data, error } = await supabase
    .from("sync_history")
    .select("*")
    .order("finished_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchOpportunities(limit?: number) {
  let query = supabase
    .from("opportunities")
    .select("*")
    .order("estimated_value", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export type ProductFilters = {
  search: string;
  manufacturer: string;
  applicant: string;
  category: string;
  status: string;
  expiry: string;
  sort: string;
  pageSize: number;
  page: number;
};

function normalizeProductRow(product: Product): Product {
  return {
    ...product,
    manufacturer: product.manufacturer ?? product.applicant ?? null,
    registration_date: product.registration_date ?? product.approval_date ?? null,
  };
}

export async function fetchProducts(f: ProductFilters) {
  let query = supabase.from("products").select("*", { count: "exact" });

  if (f.search) {
    const s = `%${f.search}%`;
    query = query.or(
      `product_name.ilike.${s},manufacturer.ilike.${s},applicant.ilike.${s},nafdac_number.ilike.${s}`,
    );
  }
  if (f.manufacturer) query = query.ilike("manufacturer", `%${f.manufacturer}%`);
  if (f.applicant) query = query.ilike("applicant", `%${f.applicant}%`);
  if (f.category) query = query.eq("category", f.category);
  if (f.status) query = query.eq("status", f.status);

  if (f.expiry) {
    const months = Number(f.expiry);
    const today = new Date();
    const until = new Date();
    until.setMonth(until.getMonth() + months);
    query = query
      .gte("expiry_date", today.toISOString().slice(0, 10))
      .lte("expiry_date", until.toISOString().slice(0, 10));
  }

  if (f.sort === "oldest") query = query.order("registration_date", { ascending: true });
  else if (f.sort === "expiry") query = query.order("expiry_date", { ascending: true });
  else if (f.sort === "name") query = query.order("product_name", { ascending: true });
  else query = query.order("registration_date", { ascending: false });

  const from = (f.page - 1) * f.pageSize;
  query = query.range(from, from + f.pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: (data ?? []).map(normalizeProductRow) as Product[], count: count ?? 0 };
}

export async function fetchProduct(id: string) {
  const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? normalizeProductRow(data as Product) : null;
}

export async function fetchRenewals(months: number) {
  const today = new Date();
  const until = new Date();
  until.setMonth(until.getMonth() + months);
  const { data, error } = await supabase
    .from("renewals")
    .select("*")
    .gte("expiry_date", today.toISOString().slice(0, 10))
    .lte("expiry_date", until.toISOString().slice(0, 10))
    .order("expiry_date", { ascending: true })
    .limit(500);
  if (error) throw error;
  return data ?? [];
}

export type Opportunity = {
  id: string;
  opportunity_id: number | null;
  company: string;
  manufacturer: string | null;
  product: string | null;
  product_count?: number;
  category: string | null;
  service_type: string | null;
  opportunity_type?: string | null;
  estimated_value: number;
  probability: number;
  priority: string;
  expiry_date: string | null;
  close_date?: string | null;
  status: string;
  recommendation: string | null;
  created_at: string;
};

function normalizeOpportunityRow(o: Opportunity): Opportunity {
  return {
    ...o,
    manufacturer: o.manufacturer ?? o.company ?? null,
    product: o.product ?? (o.product_count ? `${o.product_count} products` : null),
    service_type: o.service_type ?? o.opportunity_type ?? null,
    expiry_date: o.expiry_date ?? o.close_date ?? null,
    recommendation:
      o.recommendation ??
      (o.opportunity_type
        ? `This is a ${o.opportunity_type} opportunity for ${o.company}.`
        : null),
  };
}

export type OpportunityStats = {
  total: number;
  high_priority: number;
  closing_soon: number;
  pipeline: number;
  avg_value: number;
};

export async function fetchOpportunityStats(): Promise<OpportunityStats> {
  const { data, error } = await supabase.rpc("opportunity_stats");
  if (error) throw error;
  return data as unknown as OpportunityStats;
}

export const SERVICE_TYPES = [
  "Registration Inactive Opportunity",
  "Expiring Registration Opportunity",
  "Manufacturer Renewal Watch",
  "New Approval Opportunity",
];

export async function fetchOpportunityFacets() {
  const { data, error } = await supabase.from("products").select("manufacturer, category").limit(2000);
  if (error) throw error;
  const manufacturers = [...new Set((data ?? []).map((r) => r.manufacturer).filter(Boolean))].sort() as string[];
  const categories = [...new Set((data ?? []).map((r) => r.category).filter(Boolean))].sort() as string[];
  return { manufacturers, categories };
}

export type OpportunityFilters = {
  search: string;
  category: string;
  status: string;
  priority: string;
  probability: string;
  value: string;
  service: string;
  manufacturer: string;
  sort: string;
  page: number;
  pageSize: number;
};

export async function fetchOpportunitiesPage(f: OpportunityFilters) {
  let query = supabase.from("opportunities").select("*", { count: "exact" });

  if (f.search) {
    const s = `%${f.search}%`;
    query = query.or(`company.ilike.${s},manufacturer.ilike.${s},product.ilike.${s}`);
  }
  if (f.category) query = query.eq("category", f.category);
  if (f.status) query = query.eq("status", f.status);
  if (f.priority) query = query.eq("priority", f.priority);
  if (f.probability) query = query.gte("probability", Number(f.probability));
  if (f.value) query = query.gte("estimated_value", Number(f.value));
  if (f.service) query = query.eq("service_type", f.service);
  if (f.manufacturer) query = query.eq("manufacturer", f.manufacturer);

  if (f.sort === "oldest") query = query.order("created_at", { ascending: true });
  else if (f.sort === "value_desc") query = query.order("estimated_value", { ascending: false });
  else if (f.sort === "value_asc") query = query.order("estimated_value", { ascending: true });
  else if (f.sort === "expiry") query = query.order("expiry_date", { ascending: true, nullsFirst: false });
  else query = query.order("opportunity_id", { ascending: true });

  const from = (f.page - 1) * f.pageSize;
  query = query.range(from, from + f.pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: (data ?? []).map(normalizeOpportunityRow) as Opportunity[], count: count ?? 0 };
}
