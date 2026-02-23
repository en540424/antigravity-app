import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { getServerSupabase } from "@/app/utils/supabase/server";
import { requireAuth } from "@/app/api/_lib/auth";
import { logApi } from "@/app/api/_lib/log";

const BUCKET = "product-images";
const VALID_FOLDERS = ["LISTING", "ORIGINAL", "RAW", "EDITED", "THUMBNAIL"] as const;
type FolderName = typeof VALID_FOLDERS[number];

export async function GET(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const url = new URL(req.url);
    const skuParam = url.searchParams.get("sku");
    const folderParam = (url.searchParams.get("folder") || "LISTING").toUpperCase() as FolderName;

    if (!skuParam || skuParam.trim().length === 0) {
      return NextResponse.json({ error: "sku は必須です" }, { status: 400 });
    }
    if (!VALID_FOLDERS.includes(folderParam)) {
      return NextResponse.json({ error: "folder が不正です" }, { status: 400 });
    }

    // 認証（開発モードでは失敗しても続行）
    let userId: string | null = null;
    try {
      const { user } = await requireAuth(req);
      userId = user.id;
    } catch (_) {
      // dev環境では認証無しで続行
    }

    const skus = skuParam.split(",").map((s) => s.trim()).filter(Boolean);
    const zip = new JSZip();
    let totalFiles = 0;

    for (const sku of skus) {
      const basePath = `${sku}/${folderParam}`;
      const { data: files, error } = await supabase.storage.from(BUCKET).list(basePath);
      if (error) {
        continue;
      }
      let list = (files || []).filter((f) => f.name !== ".emptyFolderPlaceholder");

      // LISTING が空なら ORIGINAL → RAW にフォールバック
      if (list.length === 0 && folderParam === "LISTING") {
        for (const fb of ["ORIGINAL", "RAW"] as FolderName[]) {
          const { data: fbFiles } = await supabase.storage.from(BUCKET).list(`${sku}/${fb}`);
          const fbList = (fbFiles || []).filter((f) => f.name !== ".emptyFolderPlaceholder");
          if (fbList.length > 0) {
            list = fbList.map((f) => ({ ...f, _folder: fb as string } as any));
            break;
          }
        }
      }

      // 画像をZIPへ追加（公開URLから取得）
      for (const file of list) {
        const effectiveFolder = (file as any)._folder || folderParam;
        const path = `${sku}/${effectiveFolder}/${file.name}`;
        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
        const publicUrl = urlData?.publicUrl;
        if (!publicUrl) continue;
        const resp = await fetch(publicUrl);
        if (!resp.ok) continue;
        const buf = await resp.arrayBuffer();
        // ZIP内は SKU フォルダ配下に配置
        zip.file(`${sku}/${file.name}`, buf);
        totalFiles++;
      }
    }

    if (totalFiles === 0) {
      return NextResponse.json({ error: "対象画像が見つかりません" }, { status: 404 });
    }

    const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });

    // ログ（単一SKUのみ記録）
    if (userId && skus.length === 1) {
      try {
        const { data: row } = await supabase
          .from("sku_list")
          .select("id")
          .eq("sku", skus[0])
          .limit(1)
          .single();
        if (row?.id) {
          await logApi({ sku_id: row.id, user_id: userId, action: "export_images" });
        }
      } catch (_) {}
    }

    const filename = skus.length === 1
      ? `images-${skus[0]}-${folderParam.toLowerCase()}.zip`
      : `images-${skus.length}-skus-${folderParam.toLowerCase()}.zip`;

    return new NextResponse(zipBuffer as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "失敗" }, { status: 500 });
  }
}
