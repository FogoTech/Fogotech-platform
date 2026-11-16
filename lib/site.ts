import { createClient } from "@/lib/supabase/server";

export type CompanySettings = {
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  address: string | null;
  areas_covered: string | null;
  opening_hours: string | null;
};

export async function getSettings(): Promise<CompanySettings> {
  const supabase = await createClient();
  const { data } = await supabase.from("company_settings").select("phone, email, whatsapp, address, areas_covered, opening_hours").single();
  return data ?? { phone: null, email: null, whatsapp: null, address: null, areas_covered: null, opening_hours: null };
}

export * from "@/lib/site-shared";
