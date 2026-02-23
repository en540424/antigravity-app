import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/api/_lib/auth";
import { getServerSupabase } from "@/app/utils/supabase/server";

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);

    const body = await req.json();
    const marketplace_id = (body.marketplace_id ?? "EBAY_US").trim();
    const item_id = String(body.item_id ?? "").trim();
    const variation_sku = body.variation_sku ? String(body.variation_sku).trim() : null;
    const internal_sku = String(body.internal_sku ?? "").trim();
    const note = body.note ?? null;

    if (!item_id || !internal_sku) {
      return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }

    const supabase = await getServerSupabase();

    const { data, error } = await supabase
      .from("ebay_item_sku_map")
      .upsert(
        { marketplace_id, item_id, variation_sku, internal_sku, note },
        { onConflict: "marketplace_id,item_id,variation_sku" }
      )
      .select("*")
      .single();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown" }, { status: 500 });
  }
}
