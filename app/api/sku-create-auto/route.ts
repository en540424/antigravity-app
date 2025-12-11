import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

export async function POST() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const sec = String(now.getSeconds()).padStart(2, "0");

  // 例：20251209-184657
  const sku = `${y}${m}${d}-${h}${min}${sec}`;

  const { data, error } = await supabase
    .from("sku_list")
    .insert([{ sku, title: "", status: "none" }])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
