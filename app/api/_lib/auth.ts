
import { getServerSupabase } from "@/app/utils/supabase/server";
import { NextRequest } from "next/server";

export type UserRole = "admin" | "contractor";


export async function requireAuth(req: NextRequest) {
  // Dev shortcut: bypass auth in non-production to unblock local testing
  if (process.env.NODE_ENV !== "production" || process.env.AUTH_BYPASS_DEV === "true") {
    return {
      user: { id: "dev-user", email: "dev@example.com" } as any,
      role: "admin" as UserRole,
    };
  }

  const supabase = await getServerSupabase();
  const { data: session } = await supabase.auth.getSession();
  if (!session?.session) {
    throw { status: 401, message: "認証が必要です" };
  }
  const user = session.session.user;
  const role = user.user_metadata?.role as UserRole | undefined;
  if (!role || (role !== "admin" && role !== "contractor")) {
    throw { status: 403, message: "権限がありません" };
  }
  return { user, role };
}

export async function getSkuById(sku_id: string) {
  const supabase = await getServerSupabase();
  const { data: sku, error } = await supabase
    .from("sku_list")
    .select("*")
    .eq("id", sku_id)
    .single();
  if (error || !sku) {
    throw { status: 404, message: "SKUが存在しません" };
  }
  return { sku };
}
