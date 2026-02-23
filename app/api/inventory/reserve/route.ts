import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/api/_lib/auth";
import { getServerSupabase } from "@/app/utils/supabase/server";

function errorResponse(message: string, status = 400, extra?: any) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

type Body = {
  sku: string;
  quantity: number;
  idempotencyKey: string;
  memo?: string | null;
  meta?: any | null;
};

/**
 * POST /api/inventory/reserve
 * 注文などの在庫予約（利用可能数を超えると409）
 */
export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);
    const supabase = await getServerSupabase();

    const body = (await req.json().catch(() => null)) as Body | null;
    if (!body) return errorResponse("invalid_json", 400);

    const sku = (body.sku || "").trim();
    const quantity = Number(body.quantity);
    const idempotencyKey = (body.idempotencyKey || "").trim();
    const memo = body.memo ?? null;

    if (!sku) return errorResponse("sku_required", 400);
    if (!Number.isFinite(quantity) || quantity <= 0) return errorResponse("quantity_must_be_positive", 400);
    if (!idempotencyKey) return errorResponse("idempotencyKey_required", 400);

    const { data: skuRow, error: skuError } = await supabase
      .from("sku_list")
      .select("id")
      .eq("sku", sku)
      .is("deleted_at", null)
      .single();

    if (skuError || !skuRow) {
      const notFound = skuError?.code === "PGRST116" || !skuRow;
      return errorResponse(notFound ? "sku_not_found" : "sku_lookup_failed", notFound ? 404 : 500, {
        detail: skuError?.message,
      });
    }

    const { data, error } = await supabase.rpc("reserve_inventory", {
      p_sku: sku,
      p_quantity: quantity,
      p_idempotency_key: idempotencyKey,
      p_note: memo,
      p_order_id: null,
    });

    if (error) {
      if (error.message?.includes("insufficient stock")) {
        return errorResponse("insufficient_stock", 409, { detail: error.message });
      }
      return errorResponse("reserve_failed", 400, { detail: error.message });
    }

    return NextResponse.json({ ok: true, tx_id: data });
  } catch (e: any) {
    return errorResponse(e?.message || "unknown_error", 500);
  }
}
