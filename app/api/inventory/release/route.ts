import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/api/_lib/auth";
import { getServerSupabase } from "@/app/utils/supabase/server";

function errorResponse(message: string, status = 400, extra?: any) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

type Body = {
  sku: string;
  quantity: number;
  reason?: string;
  idempotencyKey: string;
  memo?: string | null;
  meta?: any | null;
};

/**
 * POST /api/inventory/release
 * 予約解除（キャンセル等）
 */
export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);
    const supabase = await getServerSupabase();

    const body = (await req.json().catch(() => null)) as Body | null;
    if (!body) return errorResponse("invalid_json", 400);

    const sku = (body.sku || "").trim();
    const quantity = Number(body.quantity);
    const reason = (body.reason || "SALE").toUpperCase();
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

    const { data, error } = await supabase.rpc("add_inventory_tx", {
      p_sku: sku,
      p_tx_type: "RELEASE",
      p_reason: reason,
      p_quantity: quantity,
      p_idempotency_key: idempotencyKey,
      p_note: memo,
      p_order_id: null,
    });

    if (error) {
      if (error.message?.includes("cannot release more than reserved")) {
        return errorResponse("invalid_release", 409, { detail: error.message });
      }
      return errorResponse("rpc_failed", 500, { detail: error.message });
    }

    return NextResponse.json({ ok: true, tx_id: data });
  } catch (e: any) {
    return errorResponse(e?.message || "unknown_error", 500);
  }
}
