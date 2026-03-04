import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { fetchRecentOrders } from "@/app/lib/ebay/orders";
import { supabaseAdmin } from "@/app/lib/supabase/server-admin";
import { calcNetProfit } from "@/app/lib/profitCalc";

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

    const orders = await fetchRecentOrders(2);

    const results: any[] = [];
    let outOk = 0;
    let alreadySynced = 0;
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

        // 1. sku_list 存在確認
        const { data: skuRow, error: skuError } = await supabaseAdmin
          .from("sku_list")
          .select("sku, purchase_cost_jpy, ebay_fee_rate, payment_fee_rate, ebay_listing_status")
          .eq("sku", sku)
          .is("deleted_at", null)
          .single();

        if (skuError || !skuRow) {
          missingSku++;
          results.push({ orderId: o.orderId, lineItemId, sku, status: "sku_not_found" });
          continue;
        }

        // 2. idempotency チェック（同一 order × sku が既に登録済みなら skip）
        const { data: existing } = await supabaseAdmin
          .from("sales_orders")
          .select("id")
          .eq("ebay_order_id", o.orderId)
          .eq("sku", sku)
          .maybeSingle();

        if (existing) {
          alreadySynced++;
          results.push({ orderId: o.orderId, lineItemId, sku, status: "already_synced" });
          continue;
        }

        // 3. 利益計算（絶対額）
        const salePrice = parseFloat(li.lineItemCost?.value ?? "0");
        const ebayFeeRate = typeof skuRow.ebay_fee_rate === "number" ? skuRow.ebay_fee_rate : 13.25;
        const paymentFeeRate = typeof skuRow.payment_fee_rate === "number" ? skuRow.payment_fee_rate : 2.9;
        const ebayFee = salePrice * ebayFeeRate / 100;
        const paymentFee = salePrice * paymentFeeRate / 100;
        const shippingCost = 0;
        const costPrice = typeof skuRow.purchase_cost_jpy === "number" ? skuRow.purchase_cost_jpy : 0;
        const netProfit = calcNetProfit({ salePrice, costPrice, ebayFee, paymentFee, shippingCost });

        // 4. sales_orders INSERT
        const { error: insertErr } = await supabaseAdmin
          .from("sales_orders")
          .insert({
            ebay_order_id: o.orderId,
            ebay_item_id: li.legacyItemId ?? "",
            sku,
            quantity: qty,
            sale_price: salePrice,
            ebay_fee: ebayFee,
            payment_fee: paymentFee,
            shipping_cost: shippingCost,
            net_profit: netProfit,
            order_created_at: o.lastModifiedDate ?? null,
          });

        if (insertErr) {
          const msg = (insertErr.message || "").toLowerCase();
          if (msg.includes("duplicate") || msg.includes("unique")) {
            alreadySynced++;
            results.push({ orderId: o.orderId, lineItemId, sku, status: "already_synced" });
          } else {
            failed++;
            results.push({ orderId: o.orderId, lineItemId, sku, status: "insert_failed", error: insertErr.message });
          }
          continue;
        }

        // 5. inventory_ledger OUT（Supabase RPC 直接呼び出し）
        const { error: rpcErr } = await supabaseAdmin.rpc("add_inventory_tx", {
          p_sku: sku,
          p_tx_type: "OUT",
          p_reason: "SALE",
          p_quantity: qty,
          p_idempotency_key: `ebay-sale-${o.orderId}-${lineItemId}`,
          p_note: `eBay order: ${o.orderId}`,
          p_order_id: null,
        });

        if (rpcErr) {
          // 在庫 RPC 失敗は記録するが、sales_orders は確定済みなので failed 扱いにしない
          results.push({
            orderId: o.orderId,
            lineItemId,
            sku,
            status: "out_ok_inventory_warn",
            inventoryError: rpcErr.message,
          });
        } else {
          results.push({ orderId: o.orderId, lineItemId, sku, qty, status: "out_ok" });
        }

        // 6. sku_list.ebay_listing_status = 'sold'
        await supabaseAdmin
          .from("sku_list")
          .update({
            ebay_listing_status: "sold",
            ebay_synced_at: new Date().toISOString(),
          })
          .eq("sku", sku);

        outOk++;
      }
    }

    return NextResponse.json({
      ok: true,
      summary: { orders: orders.length, outOk, alreadySynced, missingSku, failed },
      results,
    });
  } catch (e: any) {
    const msg = e?.message || "unknown_error";
    const status = msg === "cron_unauthorized" ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
