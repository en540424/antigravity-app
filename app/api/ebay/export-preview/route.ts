import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/app/utils/supabase/server";

type PreviewRow = {
  id: string;
  sku: string;
  title?: string | null;
  listing_image_count?: number | null;
  ebay_category_id?: number | null;
  price_usd?: number | null;
  ok: boolean;
  missing: string[];
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const mode = body?.mode ?? "ready_only";
    const skuIds: string[] | undefined = Array.isArray(body?.skuIds) ? body.skuIds : undefined;

    const supabase = await getServerSupabase();

    // 取得（一覧表示に必要最低限）
    let q = supabase
      .from("sku_list")
      .select(
        "id,sku,title,title_optimized,listing_image_count,ebay_category_id,sale_price_usd,description"
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (skuIds && skuIds.length > 0) {
      q = q.in("id", skuIds);
    } else if (mode === "ready_only") {
      // "候補"は広めに取って、missingを返す（プレビュー用）
      // ＝まだ不足があっても一覧に出す
      // ここは必要なら絞り条件を入れてOK
    }

    const { data, error } = await q;
    if (error) {
      return NextResponse.json({ error: "FETCH_FAILED", detail: error.message }, { status: 500 });
    }

    const items = data ?? [];

    const rows: PreviewRow[] = items.map((r: any) => {
      const missing: string[] = [];

      // ✅ CSV/ZIP共通の必須条件（あなたの定義と合わせる）
      if (!r.ebay_category_id || r.ebay_category_id <= 0) missing.push("カテゴリ未設定");
      if ((r.listing_image_count ?? 0) < 7) missing.push("LISTING画像不足");
      const titleFinal = r.title_optimized ?? r.title ?? null;
      if (!titleFinal) missing.push("タイトル未入力");
      if (!r.description) missing.push("英語説明文未入力");
      if (r.sale_price_usd == null) missing.push("価格未入力");

      return {
        id: r.id,
        sku: r.sku,
        title: titleFinal,
        listing_image_count: r.listing_image_count ?? 0,
        ebay_category_id: r.ebay_category_id ?? null,
        price_usd: r.sale_price_usd ?? null,
        ok: missing.length === 0,
        missing,
      };
    });

    // プレビュー画面では OK / NG 両方を返す（NG理由を見せるため）
    const okCount = rows.filter((x) => x.ok).length;
    const ngCount = rows.length - okCount;

    return NextResponse.json({ rows, okCount, ngCount });
  } catch (e: any) {
    return NextResponse.json({ error: "UNEXPECTED", detail: e?.message ?? String(e) }, { status: 500 });
  }
}
