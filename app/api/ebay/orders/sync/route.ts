import { NextRequest, NextResponse } from "next/server";
import { fetchRecentOrders } from "@/app/lib/ebay/orders";
import { getServerSupabase } from "@/app/utils/supabase/server";

function assertCron(req: NextRequest) {
  const secret = process.env.CRON_SECRET || "";
  const got = req.headers.get("x-cron-secret") || "";
  if (!secret || got !== secret) {
    throw new Error("cron_unauthorized");
  }
}

export async function POST(req: NextRequest) {
  try {
    assertCron(req);

    const supabase = await getServerSupabase();
    const orders = await fetchRecentOrders(2);

    const results: any[] = [];
    let outOk = 0;
    let skipped = 0;
    let missingSku = 0;
    let failed = 0;

    for (const o of orders) {
      for (const li of o.lineItems ?? []) {
        const sku = (li.sku || "").trim();
        const qty = Number(li.quantity || 0);
        const lineItemId = li.lineItemId;

        if (!sku || qty <= 0) {
          missingSku++;
          results.push({ orderId: o.orderId, lineItemId, status: "missing_sku_or_qty" });
          continue;
        }

          const { data: skuRow, error: skuError } = await supabase
            .from("sku_list")
            .select("id")
            .eq("sku", sku)
            .is("deleted_at", null)
            .single();

          if (skuError || !skuRow) {
            missingSku++;
            results.push({ orderId: o.orderId, lineItemId, sku, status: "sku_not_found" });
            continue;
          }

        if (error) {
          const msg = (error.message || "").toLowerCase();
          if (msg.includes("idempotency") || msg.includes("duplicate")) {
            skipped++;
            results.push({ orderId: o.orderId, lineItemId, sku, qty, status: "duplicate_skip" });
          } else {
            failed++;
            results.push({ orderId: o.orderId, lineItemId, sku, qty, status: "failed", error: error.message });
          }
          continue;
        }

        outOk++;
        results.push({ orderId: o.orderId, lineItemId, sku, qty, status: "out_ok", tx_id: data });
      }
    }

    return NextResponse.json({
      ok: true,
      summary: { orders: orders.length, outOk, skipped, missingSku, failed },
      results,
    });
  } catch (e: any) {
    const msg = e?.message || "unknown_error";
    const status = msg === "cron_unauthorized" ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
