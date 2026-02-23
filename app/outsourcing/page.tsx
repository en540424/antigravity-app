"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// SKU型
interface SkuItem {
  id: string;
  sku: string;
  title: string | null;
  status?: string | null;
}

export default function OutsourcingPage() {
  const [skuList, setSkuList] = useState<SkuItem[]>([]);
  const [selectedSKU, setSelectedSKU] = useState("");
  const [workerMemo, setWorkerMemo] = useState("");
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);

  // SKU一覧取得
  useEffect(() => {
    async function loadSKU() {
      try {
        const res = await fetch("/api/sku-list", { cache: "no-store" });
        const data = await res.json();
        setSkuList(Array.isArray(data) ? data : []);
      } catch (err) {
        setSkuList([]);
      }
    }
    loadSKU();
  }, []);

  // 画像アップロード処理
  async function handleUpload() {
    if (!selectedSKU || !uploadFiles || uploadFiles.length === 0) return;
    setUploading(true);
    setUploadResult(null);
    const formData = new FormData();
    formData.append("sku", selectedSKU);
    Array.from(uploadFiles).forEach((file) => formData.append("files", file));
    const res = await fetch("/api/upload-image", { method: "POST", body: formData });
    if (res.ok) setUploadResult("アップロード完了");
    else setUploadResult("アップロード失敗");
    setUploading(false);
  }

  return (
    <div className="p-6 max-w-2xl mx-auto text-sm">
      <div className="mb-4">
        <Link href="/" className="inline-flex items-center px-3 py-2 bg-slate-800 text-white rounded border border-slate-700 hover:bg-slate-700">
          ⬅️ ホームに戻る
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-4">外注スタッフ専用ページ</h1>
      <p className="mb-6 text-gray-500">指定されたSKUの商品を撮影し、画像をアップロードしてください。<br />AI・英語・価格・出品操作は一切不要です。</p>

      {/* SKU選択 */}
      <div className="mb-4">
        <label className="block mb-1 font-semibold">SKUを選択</label>
        {skuList.length === 0 ? (
          <p className="text-gray-600">まだSKUが登録されていません。</p>
        ) : (
          <select className="border px-2 py-1 rounded" value={selectedSKU} onChange={(e) => setSelectedSKU(e.target.value)}>
            <option value="">SKUを選択してください</option>
            {skuList.map((item) => (
              <option key={item.id} value={item.id}>
                {item.sku}（{item.title || "未入力"}）
              </option>
            ))}
          </select>
        )}
      </div>

      {/* 画像アップロード */}
      <div className="mb-4">
        <label className="block mb-1 font-semibold">画像ファイル</label>
        <input type="file" multiple onChange={(e) => setUploadFiles(e.target.files)} className="mb-2" />
        <button onClick={handleUpload} className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50" disabled={!selectedSKU || !uploadFiles || uploading}>
          {uploading ? "アップロード中..." : "アップロード実行"}
        </button>
        {uploadResult && <div className="mt-2 text-green-600">{uploadResult}</div>}
      </div>

      {/* 作業完了報告・コメント */}
      <div className="mb-4">
        <label className="block mb-1 font-semibold">作業メモ・報告</label>
        <textarea value={workerMemo} onChange={(e) => setWorkerMemo(e.target.value)} className="w-full border rounded p-2" rows={3} placeholder="困ったこと・完了報告など自由に記入" />
        <button className="mt-2 px-3 py-1 bg-green-700 text-white rounded">撮影完了として報告</button>
      </div>

      <div className="mt-8 text-xs text-gray-400">
        ※ この画面ではAI・英語・価格・出品・削除等の操作は一切できません。<br />
        困ったときは必ずコメント欄に記入し、自己判断で進めないでください。
      </div>
    </div>
  );
}
