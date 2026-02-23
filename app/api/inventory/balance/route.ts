import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/api/_lib/auth";
import { getServerSupabase } from "@/app/utils/supabase/server";

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * GET /api/inventory/balance?sku=xxx
 * 在庫残高を取得（単体 or 全件）。available はAPI側で付与。
 */
export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    const supabase = await getServerSupabase();

    const { searchParams } = new URL(req.url);
    const sku = searchParams.get("sku");

    let query = supabase.from("inventory_balance").select("sku,on_hand,reserved");
    if (sku) query = query.eq("sku", sku);

    const { data, error } = await query.order("sku", { ascending: true });
    if (error) return errorResponse(error.message, 500);

    const rows = (data ?? []).map((r) => ({
      ...r,
      available: (r.on_hand ?? 0) - (r.reserved ?? 0),
    }));

    return NextResponse.json({ ok: true, data: sku ? rows[0] ?? null : rows });
  } catch (e: any) {
    return errorResponse(e?.message || "unknown_error", 500);
  }
}
