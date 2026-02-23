import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/app/utils/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from("sku_list")
      .select("*")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });
    if (error) {
      return NextResponse.json({ error: "取得失敗" }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "認証エラー" }, { status: err.status || 500 });
  }
}