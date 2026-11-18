"use server";

import { createClient } from "@/lib/supabase/server";

export type RevealResult =
  | { secret: string; username: string | null; url: string | null; customer_reveals_today: number; limit: number }
  | { error: "limit" | "no_access" | "not_found" | "failed"; used?: number; limit?: number };

/** All checks (who, limits, logging) happen in the database function. */
export async function revealCredential(id: string): Promise<RevealResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reveal_site_credential", { p_id: id });
  if (error || !data) return { error: "failed" };
  return data as RevealResult;
}
