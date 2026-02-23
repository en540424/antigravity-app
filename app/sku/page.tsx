"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { checkListingEligibility, EbayListingData } from "@/app/lib/ebayListingData";

type SkuStatus = "shooting" | "editing" | "listing" | "done" | "none";

type SkuItem = {
  id: string;
  sku: string;
  title: string | null;
  status: SkuStatus | null;
  created_at: string;
  // 出品用情報（API/DB拡張時はここに追加）
  ebay_title?: string | null;
  ebay_description?: string | null;
  ebay_condition?: string | null;
  price_usd?: number | null;
  image_urls?: string[];
  title_en?: string | null;
  description_en?: string | null;
  condition_en?: string | null;
  imageUrls?: string[];
  shippingTemplate?: string | null;
  returnPolicy?: string | null;
  shortLabel?: { value: string; label: string } | null;
};

const STATUS_LABEL: Record<SkuStatus, string> = {
  shooting: "📷 撮影待ち",
  editing: "✂️ 編集待ち",
  listing: "🛒 出品待ち",
  done: "🏁 完了",
  none: "未設定",
};

const STATUS_COLOR: Record<SkuStatus, string> = {
  shooting: "bg-yellow-500",
  editing: "bg-blue-500",
  listing: "bg-purple-500",
  done: "bg-green-500",
  none: "bg-gray-500",
};

export default function SkuManagerPage() {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<SkuItem[]>([]);
  const [keyword, setKeyword] = useState("");
  const [filter, setFilter] = useState<SkuStatus | "all">("all");
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const fetchList = async () => {
      try {
        const res = await fetch("/api/sku-list");
        const json = await res.json();
        setList(Array.isArray(json) ? json : []);
      } catch (e) {
        console.error("Error fetching SKU list:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchList();
  }, []);

  const filteredList = list.filter((item) => {
    const matchKeyword =
      item.sku.toLowerCase().includes(keyword.toLowerCase()) ||
      (item.title ?? "").toLowerCase().includes(keyword.toLowerCase());

    const itemStatus = item.status ?? "none";
    const matchStatus =
      filter === "all" ? true : itemStatus === filter;

    return matchKeyword && matchStatus;
  });

  const handleDelete = async (id: string) => {
    if (!window.confirm("このSKUを削除しますか？画像フォルダも削除されます。")) {
      return;
    }

    setDeleting(id);
    try {
      const res = await fetch(`/api/delete-sku`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        setList(list.filter((item) => item.id !== id));
      } else {
        alert("削除に失敗しました");
      }
    } catch (e) {
      console.error("Delete error:", e);
      alert("削除処理でエラーが発生しました");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-2xl">読み込み中...</div>
      </div>
    );
  }

  // 出品可否判定用のマッピング関数
  function toEbayListingData(item: SkuItem): Partial<EbayListingData> {
    return {
      sku: item.sku,
      title: item.ebay_title || item.title || "",
      description: item.ebay_description || "",
      condition: item.ebay_condition || "",
      priceUSD: item.price_usd || 0,
      imageUrls: item.image_urls || [],
      quantity: 1,
      shippingPolicy: "default",
      returnPolicy: "default",
      handlingTime: 3,
      location: "Japan",
    };
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* ヘッダー */}
      <div className="bg-slate-950 border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">📋 SKU管理</h1>
              <p className="text-slate-400 text-sm mt-1">すべてのSKUを一覧表示・管理</p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/"
                className="px-4 py-2 bg-slate-700 rounded hover:bg-slate-600 font-semibold"
              >
                ⬅️ ホームに戻る
              </Link>
              <Link
                href="/sku/new"
                className="px-4 py-2 bg-green-600 rounded hover:bg-green-700 font-semibold"
              >
                ➕ 新規SKU作成
              </Link>
            </div>
          </div>

          {/* 検索・フィルター */}
          <div className="space-y-4">
            {/* 検索 */}
            <input
              type="text"
              placeholder="SKU または 商品名で検索..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full px-4 py-2 rounded bg-slate-800 text-white placeholder-slate-500 border border-slate-700 focus:border-blue-500 outline-none"
            />

            {/* ステータスフィルター */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilter("all")}
                className={`px-3 py-1 rounded text-sm font-semibold transition ${
                  filter === "all"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                すべて ({list.length})
              </button>
              {(["shooting", "editing", "listing", "done"] as SkuStatus[]).map(
                (status) => {
                  const count = list.filter((item) => (item.status ?? "none") === status).length;
                  return (
                    <button
                      key={status}
                      onClick={() => setFilter(status)}
                      className={`px-3 py-1 rounded text-sm font-semibold transition ${
                        filter === status
                          ? "bg-blue-600 text-white"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                    >
                      {STATUS_LABEL[status]} ({count})
                    </button>
                  );
                }
              )}
            </div>
          </div>
        </div>
      </div>

      {/* リスト */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        {filteredList.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p className="text-xl mb-2">SKUが見つかりません</p>
            <p className="text-sm">新しいSKUを作成するか、検索条件を変更してください</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredList.map((item) => {
              const eligibility = checkListingEligibility(toEbayListingData(item));
              return (
                <div
                  key={item.id}
                  className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:bg-slate-750 transition w-full"
                >
                  <Link
                    href={`/sku/${item.id}`}
                    className="block cursor-pointer group w-full"
                  >
                    {/* ステータスバッジ */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-3 h-3 rounded-full ${STATUS_COLOR[item.status ?? "none"]}`} />
                      <span className="px-3 py-1 rounded text-sm bg-slate-700 text-slate-200">
                        {STATUS_LABEL[item.status ?? "none"]}
                      </span>
                      {eligibility.eligible ? (
                        <span className="px-2 py-0.5 rounded text-xs bg-green-600 text-white ml-1">出品可</span>
                      ) : (
                        <span
                          className="px-2 py-0.5 rounded text-xs bg-red-600 text-white ml-1 cursor-help"
                          title={eligibility.reasons.join("\n")}
                        >
                          出品不可
                        </span>
                      )}
                    </div>
                    {/* SKU情報 */}
                    <div className="w-full">
                      <div className="text-white font-semibold group-hover:text-blue-400 text-lg">
                        {item.sku}
                      </div>
                      <div className="text-sm text-slate-400">
                        {item.title || "（未設定）"}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        作成: {new Date(item.created_at).toLocaleDateString("ja-JP")}
                      </div>
                    </div>
                  </Link>
                  {/* アクションボタン */}
                  <div className="flex flex-col gap-2 mt-4 w-full">
                    <Link
                      href={`/sku/${item.id}/edit`}
                      className="px-3 py-1 bg-blue-600 rounded text-sm hover:bg-blue-700 font-semibold w-full text-center"
                    >
                      編集
                    </Link>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deleting === item.id}
                      className="px-3 py-1 bg-red-600 rounded text-sm hover:bg-red-700 font-semibold disabled:opacity-50 w-full"
                    >
                      {deleting === item.id ? "削除中..." : "削除"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 pt-6 border-t text-center">
          <a
            href="/"
            className="inline-block px-6 py-2 bg-slate-600 text-white rounded hover:bg-slate-700 font-medium"
          >
            ← ホームに戻る
          </a>
        </div>
      </div>
    </div>
  );
}
