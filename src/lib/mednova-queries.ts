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
  return { rows: (data ?? []) as Product[], count: count ?? 0 };
}

export async function fetchProduct(id: string) {
  const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Product | null;
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
