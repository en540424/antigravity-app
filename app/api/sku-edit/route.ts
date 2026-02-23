import { NextResponse } from "next/server";
import { getServerSupabase } from "@/app/utils/supabase/server";

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  
  // 🔥 DEBUG: リクエストヘッダの確認
  console.log("🔥API_DEBUG header:", req.headers.get("x-save-debug"));
  
  const body = await req.json();
  console.log('[sku-edit] POST body:', body);
  const { id } = body;
  if (!id) {
    return NextResponse.json({ error: "id が必要です" }, { status: 400 });
  }

  // bodyの全フィールドをそのままupdateDataへコピー
  const updateData: Record<string, any> = {};
  for (const key in body) {
    if (key !== "id" && body[key] !== undefined) {
      // 空文字列を null に変換
      updateData[key] = body[key] === "" ? null : body[key];
    }
  }

  // 商品名（title）を明示的に処理（フロント側で送ってこない時の保険）
  if (typeof body.title === "string") {
    const t = body.title.trim();
    updateData.title = t.length ? t : null;
  }

  console.log('[sku-edit] updateData after processing:', updateData);

  // ebay_category_id が指定されている場合は検証（存在しない場合は NULL に）
  if (updateData.ebay_category_id !== undefined && updateData.ebay_category_id !== null) {
    const { data: category } = await supabase
      .from("ebay_categories")
      .select("id")
      .eq("id", updateData.ebay_category_id)
      .single();
    
    if (!category) {
      console.warn(`[sku-edit] ebay_category_id ${updateData.ebay_category_id} not found, setting to NULL`);
      updateData.ebay_category_id = null;
    }
  }

  // 主要メタデータが更新される場合はai_extracted_atを更新
  const metaKeys = [
    "genre", "brand", "model", "color", "condition",
    "title_optimized", "description", "item_specifics",
    "profit_jpy", "profit_rate", "purchase_cost_jpy", "shipping_cost_jpy",
    "sale_price_usd", "sale_price_jpy", "shipping_cost_usd", "exchange_rate",
    // カテゴリ関連
    "ebay_category_id", "ebay_category", "category_id",
  ];
  if (metaKeys.some((k) => k in updateData)) {
    updateData.ai_extracted_at = new Date().toISOString();
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: "更新内容がありません" },
      { status: 400 }
    );
  }

  try {
    const { data: updated, error: updateError } = await supabase
      .from("sku_list")
      .update(updateData)
      .eq("id", id)
      .select("*")
      .single();
    
    if (updateError) {
      console.error('[sku-edit] updateError:', updateError);
      throw updateError;
    }
    
    console.log("[sku-edit] updateData sent to DB:", JSON.stringify(updateData));
    console.log("[sku-edit] update result:", updated ? `Success (id: ${updated.id})` : "No data returned");
    
    if (!updated) {
      throw new Error("更新後のデータが取得できませんでした");
    }
    
    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    console.error("Update SKU Error:", e);
    try { console.error("Update SKU Error JSON:", JSON.stringify(e)); } catch {}
    return NextResponse.json(
      { error: "更新に失敗しました", detail: String(e) },
      { status: 500 }
    );
  }
}
