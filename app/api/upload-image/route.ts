import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const BUCKET = "sku-images";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const sku = formData.get("sku") as string;
    const folder = formData.get("folder") as string;
    const files = formData.getAll("files") as File[];

    if (!sku || !folder || files.length === 0) {
      return NextResponse.json(
        { error: "missing_fields" },
        { status: 400 }
      );
    }

    const uploaded = [];

    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `${sku}/${folder}/${fileName}`;

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, buffer, {
          contentType: file.type,
        });

      if (error) {
        console.error("Upload error:", error);
        continue;
      }

      uploaded.push(fileName);
    }

    return NextResponse.json({ uploaded, count: uploaded.length });
  } catch (e) {
    console.error("Upload error:", e);
    return NextResponse.json(
      { error: "upload_failed" },
      { status: 500 }
    );
  }
}
