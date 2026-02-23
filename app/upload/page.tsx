"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ImageType = "RAW" | "ORIGINAL" | "LISTING";

type SkuItem = {
  id: string;
  sku: string;
  title: string | null;
};

type ExistingImage = { url: string; name: string; folder: ImageType };

function shortName(pathOrName: string) {
  const parts = pathOrName.split("/");
  return parts[parts.length - 1] ?? pathOrName;
}

export default function UploadPage() {
  const [skuList, setSkuList] = useState<SkuItem[]>([]);
  const [selectedSKU, setSelectedSKU] = useState(""); // ✅ sku文字列が入る
  const [imageType, setImageType] = useState<ImageType>("RAW");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<ExistingImage[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // SKU一覧取得
  useEffect(() => {
    async function loadSKU() {
      try {
        const res = await fetch("/api/sku-list", { cache: "no-store" });
        const data = await res.json();
        setSkuList(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("SKU取得エラー:", err);
      }
    }
    loadSKU();
  }, []);

  // ✅ 既存画像ロード関数（useEffectでもUpload後でも使う）
  const reloadExistingImages = async (sku: string) => {
    if (!sku) {
      setExistingImages([]);
      return;
    }
    setLoadingImages(true);
    try {
      const res = await fetch(`/api/sku-images?sku=${encodeURIComponent(sku)}`, { cache: "no-store" });
      const data = await res.json();

      // ✅ 新API形式に対応（imageInfo.raw/original/listing）
      const raw = Array.isArray(data?.imageInfo?.raw) ? data.imageInfo.raw : [];
      const original = Array.isArray(data?.imageInfo?.original) ? data.imageInfo.original : [];
      const listing = Array.isArray(data?.imageInfo?.listing) ? data.imageInfo.listing : [];

      const flat: ExistingImage[] = [
        ...raw.map((x: any) => ({
          url: x.public_url,
          name: shortName(x.storage_path ?? x.public_url ?? "image"),
          folder: "RAW" as ImageType,
        })),
        ...original.map((x: any) => ({
          url: x.public_url,
          name: shortName(x.storage_path ?? x.public_url ?? "image"),
          folder: "ORIGINAL" as ImageType,
        })),
        ...listing.map((x: any) => ({
          url: x.public_url,
          name: shortName(x.storage_path ?? x.public_url ?? "image"),
          folder: "LISTING" as ImageType,
        })),
      ].filter((x) => !!x.url);

      setExistingImages(flat);
    } catch (e) {
      setExistingImages([]);
    } finally {
      setLoadingImages(false);
    }
  };

  // SKU選択時に既存画像取得
  useEffect(() => {
    reloadExistingImages(selectedSKU);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSKU]);

  // ファイルプレビュー生成
  useEffect(() => {
    if (files.length === 0) {
      setPreviews([]);
      return;
    }
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setPreviews(newPreviews);
    return () => newPreviews.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles((prev) => [...prev, ...Array.from(e.target.files)]);
  };

  const handleUpload = async () => {
    setUploadMessage(null);
    setUploadError(null);

    if (!selectedSKU) return setUploadError("SKUを選択してください");
    if (files.length === 0) return setUploadError("ファイルを選択してください");

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("sku", selectedSKU);          // ✅ sku文字列
      formData.append("imageType", imageType);      // RAW/ORIGINAL/LISTING

      for (const file of files) formData.append("files", file);

      const res = await fetch("/api/upload-image", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data?.error || "アップロードに失敗しました");

      setUploadMessage(`✅ ${data.count ?? files.length}件のファイルをアップロードしました`);
      setFiles([]);
      setPreviews([]);

      // ✅ ここで確実に再読み込み
      await reloadExistingImages(selectedSKU);
    } catch (e: any) {
      setUploadError(`❌ ${e.message || "アップロードに失敗しました"}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#18181b]">
      <div className="w-full max-w-xl bg-[#23232b] rounded-2xl shadow-lg p-8 flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-6 text-white">商品画像アップロード</h1>
        <p className="text-xs text-amber-300 mb-4 text-center">
          ※ 管理者/外注向けの補助ページです。通常の業務はSKU編集ページ内の「🖼️ 商品画像」を利用してください。
        </p>

        {/* SKU選択 */}
        <div className="w-full mb-4">
          <label className="block text-gray-300 mb-1">SKUを選択</label>
          {skuList.length === 0 ? (
            <p className="text-gray-500">まだSKUが登録されていません。</p>
          ) : (
            <select
              className="w-full bg-[#18181b] border border-gray-600 text-white px-3 py-2 rounded mb-2 focus:outline-none"
              value={selectedSKU}
              onChange={(e) => setSelectedSKU(e.target.value)}
            >
              <option value="">SKUを選択してください</option>
              {skuList.map((item) => (
                // ✅ valueは item.sku（idじゃない）
                <option key={item.id} value={item.sku}>
                  {item.sku}（{item.title || "未入力"}）
                </option>
              ))}
            </select>
          )}
        </div>

        {/* 初期分類 */}
        <div className="w-full mb-4">
          <label className="block text-gray-300 mb-1">初期分類（SKU/{imageType} に保存）</label>
          <select
            className="w-full bg-[#18181b] border border-gray-600 text-white px-3 py-2 rounded focus:outline-none"
            value={imageType}
            onChange={(e) => setImageType(e.target.value as ImageType)}
          >
            <option value="RAW">RAW（未加工）</option>
            <option value="ORIGINAL">ORIGINAL（元画像）</option>
            <option value="LISTING">LISTING（出品用）</option>
          </select>
        </div>

        {/* ファイル選択 */}
        <div className="w-full mb-4">
          <label className="block text-gray-300 mb-1">画像ファイル（複数選択可）</label>
          <input
            type="file"
            multiple
            accept="image/*"
            className="w-full bg-[#18181b] border border-gray-600 text-white px-3 py-2 rounded focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
            onChange={handleFileChange}
          />
        </div>


        {/* 既存画像プレビュー */}
        <div className="w-full mb-4">
          <div className="text-gray-300 font-semibold mb-1">既存画像</div>
          {loadingImages ? (
            <div className="text-gray-500">画像読込中...</div>
          ) : existingImages.length === 0 ? (
            <div className="text-gray-500">既存画像はありません</div>
          ) : (
            <div className="flex flex-wrap gap-4 justify-center">
              {existingImages.map((img) => (
                <div key={img.url} className="bg-[#23232b] border border-gray-700 rounded-lg p-2 flex flex-col items-center shadow">
                  <img src={img.url} alt={img.name} className="w-32 h-32 object-contain rounded mb-1 bg-black" />
                  <span className="text-xs text-gray-400">{img.name}</span>
                  <span className="text-xs text-gray-500">{img.folder}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 新規画像プレビュー */}
        {previews.length > 0 && (
          <div className="w-full mb-4">
            <div className="text-gray-300 font-semibold mb-1">新規画像（アップロード予定）</div>
            <div className="flex flex-wrap gap-4 justify-center">
              {previews.map((src, idx) => (
                <div key={src} className="bg-[#18181b] border border-blue-700 rounded-lg p-2 flex flex-col items-center shadow relative group">
                  <img
                    src={src}
                    alt={`preview-${idx}`}
                    className="w-32 h-32 object-contain rounded mb-1 bg-black"
                  />
                  <span className="text-xs text-blue-400">{files[idx]?.name}</span>
                  <button
                    type="button"
                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-80 hover:opacity-100 transition text-xs"
                    title="この画像を削除"
                    onClick={() => {
                      setFiles((prev) => prev.filter((_, i) => i !== idx));
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {uploadMessage && (
          <div className="w-full mb-4 p-3 bg-green-900/50 border border-green-500 rounded text-green-300 text-sm">
            {uploadMessage}
          </div>
        )}
        {uploadError && (
          <div className="w-full mb-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-300 text-sm">
            {uploadError}
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={uploading || !selectedSKU || files.length === 0}
          className="w-full py-2 mt-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition"
        >
          {uploading ? "アップロード中..." : "アップロード実行"}
        </button>

        <Link href="/" className="mt-6 inline-block px-6 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 font-medium">
          ← ホームに戻る
        </Link>
      </div>
    </div>
  );
}
