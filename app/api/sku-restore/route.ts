import { NextResponse } from "next/server";
import { getServerSupabase } from "@/app/utils/supabase/server";

/**
 * 削除されたSKUを復帰（修復）するAPI
 * 例：20251211-0001, 0002を削除後、0001を復帰して自動生成すると0001が再利用される
 */
export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const { sku, title = "", status = "none" } = await req.json();

  if (!sku) {
    return NextResponse.json({ error: "sku が必要です" }, { status: 400 });
  }

  try {
    // SKUが既に存在するかチェック
    const { data: existing } = await supabase
      .from("sku_list")
      .select("id")
      .eq("sku", sku);

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: `SKU "${sku}" は既に存在します` },
        { status: 400 }
      );
    }

    // SKUを復帰
    const { data: restored, error: restoreError } = await supabase
      .from("sku_list")
      .insert({
        sku,
        title,
        status,
      })
      .select()
      .single();

    if (restoreError) throw restoreError;

    return NextResponse.json(restored);
  } catch (e) {
    console.error("Restore SKU Error:", e);
    return NextResponse.json(
      { error: "復帰に失敗しました" },
      { status: 500 }
    );
  }
}
