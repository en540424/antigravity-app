import { NextResponse } from "next/server";
import { getServerSupabase } from "@/app/utils/supabase/server";

export async function GET(req: Request) {
  const supabase = await getServerSupabase();
  try {
    const url = new URL(req.url);
    const period = url.searchParams.get("period") || "this_month"; // this_month | last_month | range
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const skuFilter = url.searchParams.get("sku");
    const shippingOnly = url.searchParams.get("shippingOnly") === "1";

    let fromDate: string | null = null;
    let toDate: string | null = null;

    const now = new Date();
    if (period === "this_month") {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    } else if (period === "last_month") {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      fromDate = first.toISOString().slice(0, 10);
      toDate = last.toISOString().slice(0, 10);
    } else if (period === "range" && from && to) {
      fromDate = from;
      toDate = to;
    }

    // 手動結合: sales → sku_list (FK関係なし)
    let query = supabase.from("sales").select("*").order("sold_at", { ascending: false });
    if (skuFilter) {
      query = query.eq("sku", skuFilter);
    }
    if (fromDate && toDate) {
      query = query.gte("sold_at", fromDate).lte("sold_at", toDate);
    }

    if (shippingOnly) {
      query = query.in("status", ["pending", "unshipped"]);
    }

    const { data: salesData, error } = await query;
    if (error) throw error;

    // SKU一覧を取得
    const skus = [...new Set((salesData || []).map((s: any) => s.sku))];
    const { data: skuData } = await supabase
      .from("sku_list")
      .select("id, sku, title, inventory_status, shipping_carrier, shipping_tracking, sale_price_jpy, cost_jpy, shipping_cost_jpy, total_fee_jpy, profit_jpy, profit_rate, is_profitable")
      .in("sku", skus);
    
    // SKU -> title のマップを作成
    const skuMap = new Map((skuData || []).map((s: any) => [s.sku, s]));

    const rows = (salesData || []).map((r: any) => {
      const skuInfo = skuMap.get(r.sku) || {};
      return {
        id: r.id,
        sale_id: r.id,
        sku: r.sku,
        sku_id: skuInfo.id || null,
        title: skuInfo.title || null,
        inventory_status: skuInfo.inventory_status || null,
        shipping_carrier: skuInfo.shipping_carrier || null,
        shipping_tracking: skuInfo.shipping_tracking || null,
        sale_price_jpy: skuInfo.sale_price_jpy ?? null,
        cost_jpy: skuInfo.cost_jpy ?? null,
        shipping_cost_jpy: skuInfo.shipping_cost_jpy ?? null,
        total_fee_jpy: skuInfo.total_fee_jpy ?? null,
        profit_jpy: skuInfo.profit_jpy ?? null,
        profit_rate: skuInfo.profit_rate ?? null,
        is_profitable: skuInfo.is_profitable ?? null,
        sold_at: r.sold_at,
        price_usd: Number(r.price_usd),
        fx_rate: Number(r.fx_rate),
        amount_jpy: Number(r.amount_jpy ?? (Number(r.price_usd) * Number(r.fx_rate))),
        actual_price_usd: r.actual_price_usd ? Number(r.actual_price_usd) : null,
        actual_shipping_cost_jpy: r.actual_shipping_cost_jpy ? Number(r.actual_shipping_cost_jpy) : null,
        order_id: r.order_id || null,
        status: r.status || "unset",
        is_manually_edited: r.is_manually_edited || false,
        modified_at: r.modified_at || null,
      };
    });

    return NextResponse.json({ items: rows });
  } catch (e: any) {
    console.error("/api/sales/list error", e);
    return NextResponse.json({ error: e.message || "failed" }, { status: 500 });
  }
}
