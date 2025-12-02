import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";


export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const sku = formData.get("sku");

    if (!file || !sku) {
      return NextResponse.json({ error: "file or sku missing" }, { status: 400 });
    }

    // Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // 画像バッファに変換
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // ファイル名（例：SKU20250000_xxxxxx.jpg）
    const fileExt = file.name.split(".").pop();
    const fileName = `${sku}_${Date.now()}.${fileExt}`;

    // bucket にアップロード
    const { data, error } = await supabase.storage
      .from("product-images")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error("Upload error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 公開URLの取得
    const { data: publicData } = supabase.storage
      .from("product-images")
      .getPublicUrl(fileName);

    return NextResponse.json({
      message: "success",
      filename: fileName,
      url: publicData.publicUrl,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
