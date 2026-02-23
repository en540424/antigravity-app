import { getServerSupabase } from "@/app/utils/supabase/server";

export async function logApi({ sku_id, user_id, action, model }: { sku_id: string, user_id: string, action: string, model?: string }) {
  const supabase = await getServerSupabase();
  await supabase.from("activity_log").insert({
    sku_id,
    user_id,
    action,
    model,
    executed_at: new Date().toISOString(),
  });
}
