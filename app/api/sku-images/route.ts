import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sku = url.searchParams.get("sku");

  if (!sku) {
    return NextResponse.json(
      { error: "SKU is required" },
      { status: 400 }
    );
  }

  try {
    // Supabase Storage から SKU に関連する画像を取得
    const { data: files, error } = await supabase.storage
      .from("sku-images")
      .list(sku);

    if (error) {
      console.error("Storage error:", error);
      return NextResponse.json(
        { error: "Failed to fetch images" },
        { status: 500 }
      );
    }

    // ファイル情報を整理（フォルダごとの画像数をカウント）
    const imageInfo = {
      sku,
      raw: 0,        // RAW フォルダ
      original: 0,   // Original フォルダ
      thumbnail: 0,  // Thumbnail フォルダ
      edited: 0,     // Edited フォルダ
      listing: 0,    // Listing フォルダ
      allFiles: files,
    };

    // 各フォルダ配下のファイル数を数える
    for (const file of files) {
      if (file.name === "RAW" || file.id.includes("RAW")) {
        imageInfo.raw++;
      } else if (file.name === "ORIGINAL" || file.id.includes("ORIGINAL")) {
        imageInfo.original++;
      } else if (file.name === "THUMBNAIL" || file.id.includes("THUMBNAIL")) {
        imageInfo.thumbnail++;
      } else if (file.name === "EDITED" || file.id.includes("EDITED")) {
        imageInfo.edited++;
      } else if (file.name === "LISTING" || file.id.includes("LISTING")) {
        imageInfo.listing++;
      }
    }

    // 画像が揃ったかチェック（少なくとも各フォルダに1つ以上）
    const isComplete = imageInfo.raw > 0 && 
                       imageInfo.original > 0 && 
                       imageInfo.listing > 0;

    return NextResponse.json({
      sku,
      imageInfo,
      isComplete,
      totalFiles: files.length,
    });
  } catch (err) {
    console.error("Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
