import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

export async function POST(req: Request) {
  const { id, sku, withImages } = await req.json();

  if (!id || !sku) {
    return NextResponse.json({ error: "id と sku が必要です" }, { status: 400 });
  }

  try {
    // ① SKU本体を削除
    const { error: deleteError } = await supabase
      .from("sku_list")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    // ② 画像フォルダも一括削除
    if (withImages) {
      const folders = ["raw", "original", "edited", "listing", "thumb"];

      for (const f of folders) {
        const folderPath = `${sku}/${f}`;

        await supabase.storage.from("sku-images").remove([folderPath]);
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Delete SKU Error:", e);
    return NextResponse.json(
      { error: "削除に失敗しました" },
      { status: 500 }
    );
  }
}
