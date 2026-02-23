import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/app/utils/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const searchParams = req.nextUrl.searchParams;
    
    const q = searchParams.get("q") || "";
    const leafOnly = searchParams.get("leaf_only") === "true";
    const enabledOnly = searchParams.get("enabled_only") === "true";
    const sortBy = searchParams.get("sort") || "relevance";
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    let query = supabase.from("ebay_categories").select("*");

    // 数字のみならIDで完全一致優先
    const isNumeric = /^\d+$/.test(q.trim());
    if (isNumeric) {
      const categoryId = parseInt(q.trim(), 10);
      query = query.eq("category_id", categoryId);
    } else if (q.trim()) {
      // テキスト検索（ILIKE: 部分一致）
      const searchPattern = `%${q.trim()}%`;
      query = query.or(
        `name_en.ilike.${searchPattern},path_en.ilike.${searchPattern},name_ja.ilike.${searchPattern},path_ja.ilike.${searchPattern}`
      );
    }

    if (leafOnly) {
      query = query.eq("leaf", true);
    }

    if (enabledOnly) {
      query = query.eq("enabled", true);
    }

    // ソート
    if (sortBy === "id") {
      query = query.order("category_id", { ascending: true });
    } else {
      // 関連度ソート（デフォルト：名前順）
      query = query.order("name_en", { ascending: true });
    }

    query = query.limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error("ebay_categories search error:", error);
      return NextResponse.json({ error: "検索に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({ results: data || [] });
  } catch (e) {
    console.error("ebay-categories/search error:", e);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
