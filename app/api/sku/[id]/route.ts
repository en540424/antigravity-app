import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

// Next.js 16 用の Context 型
type Context = {
  params: Promise<{ id: string }>;
};

// ---------------- GET（詳細取得）----------------
export async function GET(_req: Request, context: Context) {
  const { id } = await context.params;

  const { data, error } = await supabase
    .from("sku_list")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

// ---------------- PUT（更新）----------------
export async function PUT(req: Request, context: Context) {
  const { id } = await context.params;
  const body = await req.json();

  const { data, error } = await supabase
    .from("sku_list")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}

// ---------------- DELETE（削除）----------------
export async function DELETE(_req: Request, context: Context) {
  const { id } = await context.params;

  const { error } = await supabase
    .from("sku_list")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
