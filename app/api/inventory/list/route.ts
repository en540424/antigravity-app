import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/api/_lib/auth";
import { getServerSupabase } from "@/app/utils/supabase/server";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);

    const supabase = await getServerSupabase();

    // JOIN inventory_balance with sku_list to get title & reorder_point from DB
    const { data, error } = await supabase
      .from("inventory_balance")
      .select(`
        sku,
        on_hand,
        reserved,
        sku_list!inner(title,reorder_point)
      `)
      .eq("sku_list.deleted_at", null)
      .order("sku", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "inventory_list_failed", detail: error.message },
        { status: 500 }
      );
    }

    const rows = (data ?? []).map((r: any) => {
      const on_hand = Number(r.on_hand ?? 0);
      const reserved = Number(r.reserved ?? 0);
      const available = on_hand - reserved;
      const reorder_point = Number(r.sku_list?.reorder_point ?? 5);
      const title = r.sku_list?.title ?? "";
      const status = available <= 0 ? "out" : available <= reorder_point ? "low" : "ok";
      return { sku: r.sku, on_hand, reserved, available, reorder_point, title, status };
    });

    return NextResponse.json({ rows }, { status: 200 });
  } catch (e: any) {
    const status = Number(e?.status) || (e?.message?.includes("認証") ? 401 : 500);
    return NextResponse.json(
      { error: "unauthorized_or_failed", detail: e?.message ?? "unknown" },
      { status }
    );
  }
}
