import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

// 論理削除→復元API（deleted_atをnullにする）
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }
  try {
    const { error } = await supabase
      .from("sku_list")
      .update({ deleted_at: null })
      .eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
