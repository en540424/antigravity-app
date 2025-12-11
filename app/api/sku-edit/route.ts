import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

export async function POST(req: Request) {
  const { 
    id, 
    newSku, 
    newTitle, 
    newStatus,
    genre,
    brand,
    model,
    color,
    condition,
    ebayCategory,
    titleOptimized,
    description,
    itemSpecifics,
  } = await req.json();

  if (!id) {
    return NextResponse.json({ error: "id が必要です" }, { status: 400 });
  }

  // 更新内容を準備
  const updateData: Record<string, any> = {};

  // SKUの更新時は重複チェック
  if (newSku) {
    const { data: existing } = await supabase
      .from("sku_list")
      .select("id")
      .eq("sku", newSku);

    if (existing && existing.length > 0 && existing[0].id !== id) {
      return NextResponse.json(
        { error: `SKU "${newSku}" は既に存在します` },
        { status: 400 }
      );
    }

    updateData.sku = newSku;
  }

  if (newTitle !== undefined) {
    updateData.title = newTitle;
  }

  if (newStatus !== undefined) {
    updateData.status = newStatus;
  }

  // AI抽出された商品情報を保存
  if (genre !== undefined) updateData.genre = genre;
  if (brand !== undefined) updateData.brand = brand;
  if (model !== undefined) updateData.model = model;
  if (color !== undefined) updateData.color = color;
  if (condition !== undefined) updateData.condition = condition;
  if (ebayCategory !== undefined) updateData.ebay_category = ebayCategory;
  if (titleOptimized !== undefined) updateData.title_optimized = titleOptimized;
  if (description !== undefined) updateData.description = description;
  if (itemSpecifics !== undefined) updateData.item_specifics = itemSpecifics;

  // メタデータが更新される場合、更新時刻を記録
  if (
    genre !== undefined ||
    brand !== undefined ||
    model !== undefined ||
    color !== undefined ||
    condition !== undefined ||
    ebayCategory !== undefined ||
    titleOptimized !== undefined ||
    description !== undefined ||
    itemSpecifics !== undefined
  ) {
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
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json(updated);
  } catch (e) {
    console.error("Update SKU Error:", e);
    return NextResponse.json(
      { error: "更新に失敗しました" },
      { status: 500 }
    );
  }
}
