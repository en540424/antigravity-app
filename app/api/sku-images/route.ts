import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase/server-admin";
import { getServerSupabase } from "@/app/utils/supabase/server";
import { requireAuth } from "@/app/api/_lib/auth";

async function ensureAuth(req: NextRequest) {
  try {
    return await requireAuth(req);
  } catch (e: any) {
    // 開発環境では未ログインでも通す（本番は 401 をそのまま返す）
    if (process.env.NODE_ENV === "development") {
      return { user: null, role: "contractor" } as any;
    }
    throw e;
  }
}

type ImageType = "RAW" | "ORIGINAL" | "LISTING";
const BUCKET = "product-images";
const TYPES: ImageType[] = ["RAW", "ORIGINAL", "LISTING"];

/**
 * Supabase Storage: 指定prefix配下を全件list（ページング対応）
 */
async function listAllObjects(
  supabase: any,
  prefix: string
): Promise<Array<{ name: string; id?: string; metadata?: any }>> {
  const results: any[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefix, { limit, offset });

    if (error) throw new Error(`Storage list error: ${error.message}`);

    if (!data || data.length === 0) break;

    // data contains folders too (name + id null)
    results.push(...data);
    if (data.length < limit) break;
    offset += limit;
  }

  return results;
}

/**
 * storage_path から image_type を判定
 * 例: "NEX-xxx/RAW/aaa.jpg" -> RAW
 */
function inferTypeFromPath(storagePath: string): ImageType | null {
  const upper = storagePath.toUpperCase();
  if (upper.includes("/RAW/")) return "RAW";
  if (upper.includes("/ORIGINAL/")) return "ORIGINAL";
  if (upper.includes("/LISTING/")) return "LISTING";
  return null;
}

function buildPublicUrl(supabaseUrl: string, bucket: string, path: string) {
  // public bucket前提。privateの場合は signedUrl に変える。
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${encodeURIComponent(path).replaceAll("%2F", "/")}`;
}

/**
 * GET /api/sku-images?sku=XXXX
 * - 初回: StorageをスキャンしてDBへUPSERT
 * - 以降: DBから返却（DBが正）
 */
export async function GET(req: NextRequest) {
  try {
    await ensureAuth(req); // devでは未ログインも許容
    // サービスキーが無い環境ではフォールバックでanonクライアントを使用
    const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY ? supabaseAdmin : await getServerSupabase();

    const { searchParams } = new URL(req.url);
    const sku = searchParams.get("sku")?.trim();
    if (!sku) return NextResponse.json({ error: "sku is required" }, { status: 400 });

    // 1) 既にDBにあるか確認（あれば基本DB返却）
    const { data: existing, error: existingErr } = await supabase
      .from("sku_images")
      .select("*")
      .eq("sku", sku);

    if (existingErr) throw new Error(existingErr.message);

    // 2) DBが空なら「初回同期」発動（必要なら毎回同期でもOK）
    if (!existing || existing.length === 0) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing");

      const upserts: any[] = [];

      for (const t of TYPES) {
        const prefix = `${sku}/${t}`; // Storageは SKU/RAW などのフォルダ前提
        const objects = await listAllObjects(supabase, prefix);

        for (const obj of objects) {
          // folderはスキップ（nameだけで拡張子なし等）
          if (!obj?.name) continue;
          if (!obj.name.includes(".")) continue; // ざっくりフォルダ判定
          const storage_path = `${prefix}/${obj.name}`;

          const image_type = inferTypeFromPath(storage_path);
          if (!image_type) continue;

          upserts.push({
            sku,
            bucket: BUCKET,
            storage_path,
            image_type,
            sort_order: 0,
            file_size: obj?.metadata?.size ?? null,
            mime_type: obj?.metadata?.mimetype ?? null,
            public_url: buildPublicUrl(supabaseUrl, BUCKET, storage_path),
          });
        }
      }

      if (upserts.length > 0) {
        const { error: upsertErr } = await supabase
          .from("sku_images")
          .upsert(upserts, { onConflict: "sku,storage_path" });

        if (upsertErr) throw new Error(upsertErr.message);
      }
    }

    // 3) DBから返却（常にDBが正）
    const { data: rows, error: rowsErr } = await supabase
      .from("sku_images")
      .select("id, sku, storage_path, public_url, image_type, sort_order, created_at, updated_at")
      .eq("sku", sku)
      .order("image_type", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (rowsErr) throw new Error(rowsErr.message);

    // UI側が欲しい形（countsと配列）
    const byType: Record<ImageType, any[]> = { RAW: [], ORIGINAL: [], LISTING: [] };
    for (const r of rows || []) {
      if (r.image_type === "RAW") byType.RAW.push(r);
      if (r.image_type === "ORIGINAL") byType.ORIGINAL.push(r);
      if (r.image_type === "LISTING") byType.LISTING.push(r);
    }

    return NextResponse.json({
      sku,
      imageInfo: {
        RAW: byType.RAW.length,
        ORIGINAL: byType.ORIGINAL.length,
        LISTING: byType.LISTING.length,
        raw: byType.RAW,         // 既存UI互換用（小文字も残す）
        original: byType.ORIGINAL,
        listing: byType.LISTING,
      },
    });
  } catch (e: any) {
    console.error("[sku-images GET] error:", e);
    return NextResponse.json({ error: e?.message || "error" }, { status: 500 });
  }
}

/**
 * POST /api/sku-images
 * body: { id: uuid, image_type: "RAW"|"ORIGINAL"|"LISTING", sort_order?: number }
 * - 分類変更はDBだけ更新（Storageは動かさない）
 */
export async function POST(req: NextRequest) {
  try {
    await ensureAuth(req);
    const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY ? supabaseAdmin : await getServerSupabase();

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

    const { id, image_type, sort_order } = body as {
      id?: string;
      image_type?: ImageType;
      sort_order?: number;
    };

    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    if (!image_type || !TYPES.includes(image_type))
      return NextResponse.json({ error: "image_type is invalid" }, { status: 400 });

    const patch: any = { image_type };
    if (typeof sort_order === "number") patch.sort_order = sort_order;

    const { data, error } = await supabase
      .from("sku_images")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, row: data });
  } catch (e: any) {
    console.error("[sku-images POST] error:", e);
    return NextResponse.json({ error: e?.message || "error" }, { status: 500 });
  }
}

