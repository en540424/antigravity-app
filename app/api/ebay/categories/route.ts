import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/app/utils/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);

    const q = (url.searchParams.get("q") ?? "").trim();
    const leafOnly = (url.searchParams.get("leafOnly") ?? "true") === "true";
    const enabledOnly = (url.searchParams.get("enabledOnly") ?? "true") === "true";
    const limit = Math.min(Number(url.searchParams.get("limit") ?? "50"), 200);

    // 早期リターン（空検索は重いので防ぐ）
    if (!q) {
      return NextResponse.json({ items: [] });
    }

    const supabase = await getServerSupabase();

    // 数字だけなら category_id 直検索を優先
    const isNumeric = /^[0-9]+$/.test(q);

    // base select（返すカラムは必要最低限）
    const baseSelect =
      "category_id,parent_id,name_en,name_ja,path_en,path_ja,level,leaf,enabled";

    let query = supabase.from("ebay_categories").select(baseSelect).limit(limit);

    if (enabledOnly) query = query.eq("enabled", true);
    if (leafOnly) query = query.eq("leaf", true);

    if (isNumeric) {
      query = query.eq("category_id", Number(q));
    } else {
      // OR検索（ILIKE）
      // supabase-js の or() は "col.ilike.%xxx%,col2.ilike.%xxx%" の形式
      const like = `%${q}%`;
      query = query.or(
        [
          `name_en.ilike.${like}`,
          `path_en.ilike.${like}`,
          `name_ja.ilike.${like}`,
          `path_ja.ilike.${like}`,
        ].join(",")
      );
    }

    // よく使う順の並び：leafOnlyなら path_en が見やすい
    query = query.order("path_en", { ascending: true });

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: "FETCH_FAILED", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ items: data ?? [] });
  } catch (e: any) {
    return NextResponse.json(
      { error: "UNEXPECTED", detail: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
