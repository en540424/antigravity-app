"use client";

import { useEffect, useState } from "react";

type SkuItem = {
  id: string;
  sku: string;
  title: string;
  status: "shooting" | "editing" | "listing" | "done" | "none";
  created_at: string;
};

export default function FullCardUI({ onEdit }: { onEdit?: (item: SkuItem) => void } = {}) {
  const [items, setItems] = useState<SkuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // ===========================
  // SKU一覧取得
  // ===========================
  const fetchList = async () => {
    setLoading(true);

    const res = await fetch("/api/sku-list");
    const json = await res.json();

    setItems(json ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchList();
  }, []);

  // ===========================
  // SKU 自動生成
  // ===========================
  const createSku = async () => {
    const res = await fetch("/api/sku-create", { method: "POST" });

    if (!res.ok) {
      alert("SKU作成に失敗しました");
      return;
    }

    // ★ 作成後に必ず一覧を再読み込み
    await fetchList();

    alert("SKUを1件追加しました");
  };

  // ===========================
  // JSX 表示
  // ===========================
  return (
    <div className="p-4 text-white">
      {/* 読み込み中 */}
      {loading ? (
        <div>読み込み中…</div>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-slate-800 p-4 rounded-lg shadow hover:bg-slate-700"
            >
              <p className="text-lg font-semibold">{item.sku}</p>
              <p className="text-gray-400">{item.title}</p>

              <div className="flex gap-2 mt-2">
                <span className="px-2 py-1 bg-purple-600 rounded text-xs">
                  {item.status ?? "未設定"}
                </span>
              </div>

              <p className="text-sm mt-1">
                作成日：{new Date(item.created_at).toLocaleString("ja-JP")}
              </p>

              <div className="flex gap-2 mt-3">
                {onEdit && (
                  <button
                    onClick={() => onEdit(item)}
                    className="px-3 py-1 text-sm bg-blue-600 rounded hover:bg-blue-700"
                  >
                    ✏️ 編集
                  </button>
                )}
                <button
                  onClick={() => window.location.href = `/sku/${item.id}`}
                  className="px-3 py-1 text-sm bg-slate-600 rounded hover:bg-slate-500"
                >
                  詳細
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
