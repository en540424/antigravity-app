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
  none: "bg-gray-500",
  shooting: "bg-blue-500",
  editing: "bg-yellow-400",
  listing: "bg-purple-500",
  done: "bg-green-600",
};

export default function CardUI({ onEdit }: { onEdit?: (item: SkuItem) => void } = {}) {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-800 text-white py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* カード一覧 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map((item) => {
            const status = item.status as SkuStatus;
            const created = new Date(item.created_at);

            return (
              <div
                key={item.id}
                className="bg-slate-900/90 border border-slate-700 rounded-2xl p-5 shadow-lg hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.01] transition-transform transition-shadow duration-150"
              >
                {/* 上段：SKU＋ステータス */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="rounded border-slate-500"
                    />

                    <Link
                      href={`/sku/${item.id}`}
                      className="font-mono text-sky-400 underline underline-offset-4"
                    >
                      {item.sku}
                    </Link>
                  </div>

                  <span
                    className={`px-3 py-1 text-xs text-white rounded-full ${STATUS_COLOR[status]} shadow`}
                  >
                    {STATUS_LABEL[status]}
                  </span>
                </div>

                {/* 中段：商品名 */}
                <div className="mb-3">
                  <div className="text-xs text-slate-400 mb-1">商品名</div>
                  <Link
                    href={`/sku/${item.id}`}
                    className="font-semibold text-slate-50"
                  >
                    {item.title || "(未入力)"}
                  </Link>
                </div>

                {/* 日付 */}
                <div className="text-xs text-slate-500 mb-4">
                  作成：{created.toLocaleString("ja-JP")}
                </div>

                {/* 操作エリア */}
                <div className="flex items-center gap-3">
                  <select
                    value={status}
                    onChange={(e) =>
                      handleStatusChange(item, e.target.value as SkuStatus)
                    }
                    className="px-3 py-1 text-sm rounded-lg bg-slate-800 border border-slate-600 text-slate-100"
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
                      className="px-3 py-1 text-sm bg-blue-600 rounded-lg hover:bg-blue-700"
                    >
                      ✏️ 編集
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="px-3 py-1 text-sm border border-red-500 text-red-400 rounded-lg hover:bg-red-500/10"
                  >
                    削除
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {loading && (
          <div className="mt-4 text-sm text-slate-300">更新中…</div>
        )}
      </div>
    </div>
  );
}
