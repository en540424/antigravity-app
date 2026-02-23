import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function getCurrentUserRole() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  // ユーザーメタデータに role が含まれている前提
  return data.user.user_metadata?.role || null;
}
