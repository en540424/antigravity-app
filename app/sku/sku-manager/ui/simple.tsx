"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type SkuStatus = "shooting" | "editing" | "listing" | "done" | "none";

type SkuItem = {
  id: string;
  sku: string;
  title: string | null;
  status: SkuStatus | null;
  created_at: string;
};

const STATUS_LABEL: Record<SkuStatus, string> = {
  shooting: "📷 撮影待ち",
  editing: "✂️ 編集待ち",
  listing: "🛒 出品待ち",
  done: "🏁 完了",
  none: "— 未設定 —",
};

const STATUS_COLOR: Record<SkuStatus, string> = {
  none: "bg-gray-400",
  shooting: "bg-blue-500",
  editing: "bg-yellow-400",
  listing: "bg-purple-500",
  done: "bg-green-600",
};

export default function SimpleUI({ onEdit }: { onEdit?: (item: SkuItem) => void } = {}) {
  const [items, setItems] = useState<SkuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchSkuList = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sku-list", { cache: "no-store" });
      const json = await res.json();

      const normalized = (Array.isArray(json) ? json : []).map((item) => ({
        ...item,
        status: (item.status ?? "none") as SkuStatus,
      }));

      setItems(normalized);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkuList();
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm("選択したSKUを一括削除しますか？")) return;

    for (const id of selectedIds) {
      await fetch(`/api/sku/${id}`, { method: "DELETE" });
    }
    setSelectedIds(new Set());
    fetchSkuList();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    await fetch(`/api/sku/${id}`, { method: "DELETE" });
    fetchSkuList();
  };

  const handleStatusChange = async (item: SkuItem, status: SkuStatus) => {
    await fetch(`/api/sku/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchSkuList();
  };

  const createSku = async () => {
    await fetch("/api/sku", { method: "POST" });
    fetchSkuList();
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-6">
      {/* カード一覧 */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => {
          const status = item.status as SkuStatus;
          const created = new Date(item.created_at);

          return (
            <div
              key={item.id}
              className="bg-white border border-gray-300 rounded-xl p-5 shadow-sm"
            >
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => toggleSelect(item.id)}
                  />
                  <Link
                    href={`/sku/${item.id}`}
                    className="font-mono text-blue-600 underline"
                  >
                    {item.sku}
                  </Link>
                </div>

                <span
                  className={`px-3 py-1 text-xs text-white rounded-full ${STATUS_COLOR[status]}`}
                >
                  {STATUS_LABEL[status]}
                </span>
              </div>

              <div className="mb-3">
                <div className="text-sm text-gray-500">商品名</div>
                <Link
                  href={`/sku/${item.id}`}
                  className="font-semibold text-gray-800"
                >
                  {item.title || "(未入力)"}
                </Link>
              </div>

              <div className="text-xs text-gray-500 mb-3">
                作成: {created.toLocaleString("ja-JP")}
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={status}
                  onChange={(e) =>
                    handleStatusChange(item, e.target.value as SkuStatus)
                  }
                  className="px-3 py-1 text-sm rounded bg-gray-100 border"
                >
                  <option value="none">未設定</option>
                  <option value="shooting">撮影待ち</option>
                  <option value="editing">編集待ち</option>
                  <option value="listing">出品待ち</option>
                  <option value="done">完了</option>
                </select>

                {onEdit && (
                  <button
                    onClick={() => onEdit(item)}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    ✏️ 編集
                  </button>
                )}

                <button
                  onClick={() => handleDelete(item.id)}
                  className="px-3 py-1 text-sm border border-red-500 text-red-600 rounded hover:bg-red-50"
                >
                  削除
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {loading && (
        <div className="max-w-6xl mx-auto mt-4 text-sm text-gray-500">
          更新中…
        </div>
      )}
    </div>
  );
}
