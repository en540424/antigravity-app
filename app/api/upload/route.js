import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";
import { writeFile } from "fs/promises";
import path from "path";

export async function POST(req) {
  const form = await req.formData();
  const file = form.get("file");
  const sku = form.get("sku") || "IMG"; // SKU入力がなかった場合のデフォルト

  if (!file) {
    return new Response(JSON.stringify({ error: "No file" }), { status: 400 });
  }

  // ArrayBuffer → Buffer
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // ① 自動リサイズ（長辺1600px）
  const resized = await sharp(buffer)
    .resize(1600, 1600, { fit: "inside" })
    .jpeg({ quality: 85 })
    .toBuffer();

  // ② 自動リネーム（SKU_ランダム値.jpg）
  const newFileName = `${sku}_${uuidv4().slice(0, 8)}.jpg`;

  // ③ public/uploads に保存
  const uploadDir = path.join(process.cwd(), "public/uploads");
  await writeFile(path.join(uploadDir, newFileName), resized);

  return Response.json({
    message: "success",
    fileName: newFileName,
    url: `/uploads/${newFileName}`
  });
}
