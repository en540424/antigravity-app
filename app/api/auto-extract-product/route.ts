import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/app/utils/supabase/server";

/**
 * SKU の RAW フォルダから最初の画像を取得して、
 * AI に商品情報を抽出させるエンドポイント
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { sku } = await req.json();

    if (!sku) {
      return NextResponse.json(
        { error: "sku is required" },
        { status: 400 }
      );
    }

    // Supabase Storage から SKU の RAW フォルダを探索
    const { data: files, error: listError } = await supabase.storage
      .from("sku-images")
      .list(`${sku}/RAW`);

    if (listError) {
      console.error("Storage list error:", listError);
      return NextResponse.json(
        { error: "Failed to list images" },
        { status: 500 }
      );
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No images found in RAW folder" },
        { status: 404 }
      );
    }

    // 最初の画像を取得
    const imageFile = files[0];
    if (!imageFile.name) {
      return NextResponse.json(
        { error: "Invalid image file" },
        { status: 400 }
      );
    }

    // 署名付き URL を生成（30分有効）
    const { data: signedUrlData, error: signError } =
      await supabase.storage
        .from("sku-images")
        .createSignedUrl(`${sku}/RAW/${imageFile.name}`, 1800);

    if (signError || !signedUrlData?.signedUrl) {
      console.error("Signed URL error:", signError);
      return NextResponse.json(
        { error: "Failed to generate signed URL" },
        { status: 500 }
      );
    }

    // AI に画像を解析させるエンドポイントを呼び出し
    const extractResponse = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/extract-product-info`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: signedUrlData.signedUrl,
          sku,
        }),
      }
    );

    if (!extractResponse.ok) {
      const errorData = await extractResponse.json();
      console.error("Extract error:", errorData);
      return NextResponse.json(
        { error: errorData.error || "Failed to extract product info" },
        { status: extractResponse.status }
      );
    }

    const extractedData = await extractResponse.json();

    return NextResponse.json({
      success: true,
      sku,
      imageFile: imageFile.name,
      extractedInfo: extractedData.extractedInfo,
    });
  } catch (error) {
    console.error("Error in auto-extract-product:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
