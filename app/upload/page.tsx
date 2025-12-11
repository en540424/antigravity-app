"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type SkuItem = {
  id: string;
  sku: string;
  title: string | null;
};

export default function UploadPage() {
  const [skuList, setSkuList] = useState<SkuItem[]>([]);
  const [selectedSKU, setSelectedSKU] = useState("");

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

  return (
    <div className="p-6 text-sm">
      <div className="mb-4">
        <Link
          href="/"
          className="inline-flex items-center px-3 py-2 bg-slate-800 text-white rounded border border-slate-700 hover:bg-slate-700"
        >
          ⬅️ ホームに戻る
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-4">商品画像アップロード</h1>

      {/* SKU選択 */}
      <h2 className="text-xl font-semibold mb-2">SKUを選択</h2>

      {skuList.length === 0 ? (
        <p className="text-gray-600">まだSKUが登録されていません。</p>
      ) : (
        <select
          className="border px-2 py-1 rounded mb-4"
          value={selectedSKU}
          onChange={(e) => setSelectedSKU(e.target.value)}
        >
          <option value="">SKUを選択してください</option>
          {skuList.map((item) => (
            <option key={item.id} value={item.id}>
              {item.sku}（{item.title || "未入力"}）
            </option>
          ))}
        </select>
      )}

      {/* フォルダ選択 */}
      <h2 className="text-xl font-semibold mb-2">アップロード先フォルダ</h2>
      <select className="border px-2 py-1 rounded mb-4">
        <option value="RAW">RAW（未加工）</option>
        <option value="ORIGINAL">Original（元画像）</option>
        <option value="THUMBNAIL">Thumbnail（サムネ）</option>
        <option value="EDITED">Edited（加工済み）</option>
        <option value="LISTING">Listing（出品用）</option>
      </select>

      {/* ファイル選択 */}
      <h2 className="text-xl font-semibold mb-2">画像ファイル</h2>
      <input type="file" multiple className="mb-3" />

      <button className="px-3 py-1 bg-blue-600 text-white rounded">
        アップロード実行
      </button>
    </div>
  );
}
