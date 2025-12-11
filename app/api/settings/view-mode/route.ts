import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

// GET: 既定の viewMode を返す
// POST: { viewMode: string } を保存する（upsert）
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "sku_view_mode")
      .single();

    if (error) {
      // テーブルが存在しないなどは無視してデフォルトを返す
      console.warn("Could not read app_settings:", error.message);
      return NextResponse.json({ viewMode: "builtin" });
    }

    return NextResponse.json({ viewMode: data?.value || "builtin" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ viewMode: "builtin" });
  }
}

export async function POST(req: Request) {
  try {
    const { viewMode } = await req.json();
    if (!viewMode) {
      return NextResponse.json({ error: "viewMode is required" }, { status: 400 });
    }

    // upsert into app_settings
    const { error } = await supabase.from("app_settings").upsert({ key: "sku_view_mode", value: viewMode });

    if (error) {
      console.error("Failed to upsert view mode:", error);
      // テーブルがないなどのケースでは persistent=false を返しつつ成功扱いにする
      if (String(error.message).includes("Could not find the table")) {
        return NextResponse.json({ success: true, persisted: false });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, persisted: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "unexpected" }, { status: 500 });
  }
}
