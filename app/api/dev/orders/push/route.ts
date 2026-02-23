import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/app/utils/supabase/server";

type DevOrder = {
  orderId: string;
  marketplaceId?: string;
  lineItems: Array<{
    lineItemId: string;
    quantity: number;
    sku?: string;
    itemId?: string;
    variationSku?: string | null;
    title?: string;
  }>;
};

function assertDev(req: NextRequest) {
  const secret = process.env.CRON_SECRET || "";
  const got = req.headers.get("x-cron-secret") || "";
  if (!secret || got !== secret) throw new Error("unauthorized");
}

export async function POST(req: NextRequest) {
  try {
    assertDev(req);

    const body = (await req.json().catch(() => null)) as DevOrder | null;
    if (!body) return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });

    const supabase = await getServerSupabase();
    const marketplaceId = body.marketplaceId ?? "EBAY_US";
    const results: any[] = [];

    for (const li of body.lineItems ?? []) {
      const qty = Number(li.quantity ?? 0);
      if (qty <= 0) {
        results.push({ lineItemId: li.lineItemId, status: "bad_qty" });
        continue;
      }

      let internalSku = (li.sku ?? "").trim();

      if (!internalSku) {
        const itemId = (li.itemId ?? "").trim();
        const variationSku = (li.variationSku ?? "").trim() || null;
        if (itemId) {
          const query = supabase
            .from("ebay_item_sku_map")
            .select("internal_sku")
            .eq("marketplace_id", marketplaceId)
            .eq("item_id", itemId);

          const { data: map, error: mapErr } = variationSku
            ? await query.eq("variation_sku", variationSku).maybeSingle()
            : await query.is("variation_sku", null).maybeSingle();

          if (!mapErr && map?.internal_sku) internalSku = map.internal_sku;
        }
      }

      if (!internalSku) {
        results.push({ lineItemId: li.lineItemId, status: "unmapped" });
        continue;
      }

      const idem = `dev:lineItemId:${li.lineItemId}:OUT`;

      const { data: txId, error } = await supabase.rpc("add_inventory_tx", {
        p_sku: internalSku,
        p_tx_type: "OUT",
        p_reason: "SALE",
        p_quantity: qty,
        p_idempotency_key: idem,
        p_note: `DEV orderId=${body.orderId} lineItemId=${li.lineItemId}`,
        p_order_id: body.orderId,
      });

      if (error) {
        results.push({ lineItemId: li.lineItemId, sku: internalSku, status: "failed", error: error.message });
      } else {
        results.push({ lineItemId: li.lineItemId, sku: internalSku, status: "out_ok", tx_id: txId });
      }
    }

    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown" }, { status: e?.message === "unauthorized" ? 401 : 500 });
  }
}
