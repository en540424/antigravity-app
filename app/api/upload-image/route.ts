import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase/server-admin";
import { getServerSupabase } from "@/app/utils/supabase/server";

const BUCKET = "product-images";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const sku = formData.get("sku") as string;
    const imageType = (formData.get("imageType") || "RAW") as string;
    const files = formData.getAll("files") as File[];

    console.log("📤 アップロードAPI開始:", { sku, imageType, fileCount: files.length });

    if (!sku || files.length === 0) {
      console.error("❌ 必須フィールド不足:", { sku, fileCount: files.length });
      return NextResponse.json(
        { error: "missing_fields" },
        { status: 400 }
      );
    }

    const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? supabaseAdmin
      : await getServerSupabase();

    const uploaded: Array<{
      name: string;
      path: string;
      image_type: string;
      publicUrl: string | null;
      storage_path: string;
    }> = [];
    const errors: Array<{ file: string; error: string }> = [];

    for (const file of files) {
      try {
        console.log("📁 ファイル処理開始:", file.name);
        const buffer = await file.arrayBuffer();
        const fileName = `${Date.now()}-${file.name}`;
        const filePath = `${sku}/RAW/${fileName}`;

        console.log("☁️ Storage アップロード:", filePath);
        const { error: uploadErr } = await supabase.storage
          .from(BUCKET)
          .upload(filePath, buffer, {
            contentType: file.type,
          });

        if (uploadErr) {
          console.error("❌ Storage エラー:", uploadErr);
          errors.push({ file: file.name, error: uploadErr.message });
          if (uploadErr.message?.includes("Bucket not found")) {
            return NextResponse.json(
              { error: `Supabase ストレージバケット "${BUCKET}" が見つかりません。Supabase ダッシュボードでバケットを作成してください。` },
              { status: 400 }
            );
          }
          continue;
        }

        console.log("✅ Storage 成功:", filePath);

        // 公開URLを取得
        const { data: publicData } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(filePath);
        const publicUrl = publicData?.publicUrl || null;

        console.log("🔗 公開URL取得:", publicUrl);

        // DB に登録（image_type は UI選択値）
        console.log("💾 DB登録開始:", { sku, filePath, imageType });
        const { error: dbErr } = await supabase
          .from("sku_images")
          .upsert(
            {
              sku,
              bucket: BUCKET,
              storage_path: filePath,
              image_type: imageType,
              public_url: publicUrl,
              sort_order: 0,
            },
            { onConflict: "sku,storage_path" }
          );

        if (dbErr) {
          console.error("❌ DB エラー:", dbErr);
          errors.push({ file: file.name, error: dbErr.message });
          continue;
        }

        console.log("✅ DB登録成功:", { sku, storage_path: filePath, image_type: imageType });
        uploaded.push({
          name: file.name,
          path: filePath,
          image_type: imageType,
          publicUrl,
          storage_path: filePath,
        });
      } catch (fileErr: any) {
        console.error("❌ ファイル処理エラー:", fileErr);
        errors.push({ file: file.name, error: fileErr.message });
        continue;
      }
    }

    console.log("📊 アップロード結果:", { uploaded: uploaded.length, errors });

    // 1件もDB登録できなければ 500 を返す（UIに正しく失敗を伝える）
    if (uploaded.length === 0) {
      return NextResponse.json(
        { uploaded, count: 0, errors },
        { status: 500 }
      );
    }

    return NextResponse.json({ uploaded, count: uploaded.length, errors });
  } catch (e: any) {
    console.error("💥 API全体エラー:", e);
    if (e.message?.includes("Bucket not found")) {
      return NextResponse.json(
        { error: `Supabase ストレージバケット "${BUCKET}" が見つかりません。Supabase ダッシュボードでバケットを作成してください。` },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "upload_failed", details: e.message },
      { status: 500 }
    );
  }
}
