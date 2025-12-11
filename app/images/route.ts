// app/api/images/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sku = searchParams.get("sku");
  const folder = searchParams.get("folder");

  if (!sku || !folder) {
    return NextResponse.json([], { status: 400 });
  }

  const prefix = `${sku}/${folder}/`;

  const { data, error } = await supabase.storage
    .from("product-images")
    .list(prefix);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const files = data.map((f) => ({
    name: f.name,
    url: supabase.storage
      .from("product-images")
      .getPublicUrl(prefix + f.name).data.publicUrl,
  }));

  return NextResponse.json(files);
}
