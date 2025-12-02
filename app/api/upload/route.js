import { NextResponse } from "next/server";
import { Dropbox } from "dropbox";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const sku = formData.get("sku") || "NO_SKU";

    console.log("=== Upload API Start ===");
    console.log("Received SKU:", sku);

    const dbx = new Dropbox({
      accessToken: process.env.DROPBOX_ACCESS_TOKEN,
      fetch,
    });

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name;

    // ⭐ ここが重要：SKU フォルダに保存するパス
    const dropboxPath = `/e-nexus-uploader/${sku}/${fileName}`;

    console.log("Dropbox Save Path:", dropboxPath);

    const response = await dbx.filesUpload({
      path: dropboxPath,
      contents: buffer,
      mode: "add",
      autorename: true,
    });

    console.log("Dropbox Response:", response.result);

    return NextResponse.json({
      message: "Upload successful",
      path: response.result.path_display,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed", details: error },
      { status: 500 }
    );
  }
}
