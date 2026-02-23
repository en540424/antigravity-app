import { NextResponse, NextRequest } from "next/server";
import { supabase } from "../../../lib/supabase";

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }
  try {
    // 論理削除: deleted_atに現在時刻をセット
    const { error: updateError } = await supabase
      .from("sku_list")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (updateError) {
      console.error("Delete error:", updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("API error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
