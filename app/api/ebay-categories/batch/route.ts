import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/app/utils/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const body = await req.json();
    const ids = body.ids || [];

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ categories: [] });
    }

    const { data, error } = await supabase
      .from("ebay_categories")
      .select("*")
      .in("category_id", ids)
      .order("category_id", { ascending: true });

    if (error) {
      console.error("ebay_categories batch error:", error);
      return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({ categories: data || [] });
  } catch (e) {
    console.error("ebay-categories/batch error:", e);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
