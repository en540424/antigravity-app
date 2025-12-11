import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { ids, title } = body;

    if (!ids || ids.length === 0) {
      return NextResponse.json(
        { success: false, message: "No IDs provided" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // ← service_role を使用
    );

    // 一括更新
    const { error } = await supabase
      .from("sku_list")
      .update({ title })
      .in("id", ids);

    if (error) {
      console.error("Supabase update error:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    // ← これが重要！
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    console.error("API fatal error:", e);
    return NextResponse.json(
      { success: false, message: e.message },
      { status: 500 }
    );
  }
}
