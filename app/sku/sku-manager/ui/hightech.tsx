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
  none: "text-gray-400",
  shooting: "text-blue-400",
  editing: "text-yellow-300",
  listing: "text-purple-400",
  done: "text-green-400",
};

export default function HightechUI({ onEdit }: { onEdit?: (item: SkuItem) => void } = {}) {
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
      body: JSON.stringify({
        title: item.title ?? "",
        status,
      }),
    });
    fetchSkuList();
  };

  const createSku = async () => {
    await fetch("/api/sku", { method: "POST" });
    fetchSkuList();
  };

  return (
    <div className="min-h-screen bg-black text-white p-4">

      {/* テーブル */}
      <div className="max-w-6xl mx-auto bg-slate-900 border border-blue-800 rounded-xl shadow-lg shadow-blue-900/50">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-blue-950 text-blue-300">
              <tr>
                <th className="px-3 py-2"></th>
                <th className="px-3 py-2">SKU</th>
                <th className="px-3 py-2">商品名</th>
                <th className="px-3 py-2">ステータス</th>
                <th className="px-3 py-2">作成日</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-blue-300">
                    読み込み中…
                  </td>
                </tr>
              )}

              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-blue-300">
                    SKUがまだありません。
                  </td>
                </tr>
              )}

              {items.map((item) => {
                const status = (item.status ?? "none") as SkuStatus;
                const created = new Date(item.created_at);

                return (
                  <tr
                    key={item.id}
                    className="border-t border-blue-800 hover:bg-blue-900/30 transition"
                  >
                    {/* checkbox */}
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                      />
                    </td>

                    {/* SKU */}
                    <td className="px-3 py-2 font-mono">
                      <Link
                        href={`/sku/${item.id}`}
                        className="text-blue-400 underline hover:text-blue-300"
                      >
                        {item.sku}
                      </Link>
                    </td>

                    {/* title */}
                    <td className="px-3 py-2">
                      <Link
                        href={`/sku/${item.id}`}
                        className="hover:text-white text-gray-200"
                      >
                        {item.title || "(未入力)"}
                      </Link>
                    </td>

                    {/* status */}
                    <td className="px-3 py-2">
                      <select
                        value={status}
                        onChange={(e) =>
                          handleStatusChange(
                            item,
                            e.target.value as SkuStatus
                          )
                        }
                        className="px-2 py-1 bg-black border border-blue-600 rounded text-blue-300"
                      >
                        <option value="none">未設定</option>
                        <option value="shooting">撮影待ち</option>
                        <option value="editing">編集待ち</option>
                        <option value="listing">出品待ち</option>
                        <option value="done">完了</option>
                      </select>
                    </td>

                    {/* created */}
                    <td className="px-3 py-2 text-gray-300 whitespace-nowrap">
                      {created.toLocaleString("ja-JP")}
                    </td>

                    {/* delete */}
                    <td className="px-3 py-2 text-center flex gap-2 justify-center">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(item)}
                          className="text-blue-400 border border-blue-500 px-2 py-1 rounded hover:bg-blue-900/40"
                        >
                          ✏️ 編集
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-400 border border-red-500 px-2 py-1 rounded hover:bg-red-900/40"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
