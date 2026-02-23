"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SkuItem, SKU_STATUS_LABEL, SHIPPING_STATUS_LABEL, SHIPPING_STATUS_COLOR, ShippingStatus } from "@/app/lib/skuCondition";

type ShippingItem = SkuItem & {
  shipping_status: ShippingStatus;
  tracking_number?: string | null;
};

export default function ShippingPreparationPage() {
  const [loading, setLoading] = useState(true);
  const [skuList, setSkuList] = useState<SkuItem[]>([]);
  const [shippingList, setShippingList] = useState<ShippingItem[]>([]);
  const [filterStatus, setFilterStatus] = useState<ShippingStatus | "all">("all");
  const [searchKeyword, setSearchKeyword] = useState("");

  // SKU一覧取得
  const fetchSkuList = async () => {
    try {
      const res = await fetch("/api/sku-list");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setSkuList(Array.isArray(json) ? json : []);
    } catch (e) {
      console.error(e);
      setSkuList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkuList();
  }, []);

  useEffect(() => {
    // SKUリストから発送データをシミュレート生成
    const statuses: ShippingStatus[] = ["unprocessed", "preparing", "shipping", "shipped", "arrived", "none"];
    const shipping: ShippingItem[] = skuList.map((item, idx) => {
      const statusIndex = idx % 5;
      const status = statuses[statusIndex];
      const tracking = status === "shipped" || status === "arrived" 
        ? `TRK-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
        : null;

      return {
        ...item,
        shipping_status: status,
        tracking_number: tracking,
      };
    });

    setShippingList(shipping);
  }, [skuList]);

  // フィルタリング
  const filteredList = shippingList.filter((item) => {
    const matchKeyword =
      item.sku.includes(searchKeyword) ||
      (item.title ?? "").includes(searchKeyword);

    const matchStatus =
      filterStatus === "all" ? true : item.shipping_status === filterStatus;

    return matchKeyword && matchStatus;
  });

  // ステータスカウント
  const statusCounts = {
    unprocessed: shippingList.filter((item) => item.shipping_status === "unprocessed").length,
    preparing: shippingList.filter((item) => item.shipping_status === "preparing").length,
    shipping: shippingList.filter((item) => item.shipping_status === "shipping").length,
    shipped: shippingList.filter((item) => item.shipping_status === "shipped").length,
    arrived: shippingList.filter((item) => item.shipping_status === "arrived").length,
    none: shippingList.filter((item) => item.shipping_status === "none").length,
  };

  if (loading) {
    return <div className="p-4 text-white">読み込み中…</div>;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* 上部ホームボタン */}
        <div className="mb-4">
          <a
            href="/"
            className="inline-block px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 font-medium"
          >
            ← ホーム
          </a>
        </div>

        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">🚚 発送準備</h1>
          <p className="text-slate-400">発送ステータスを管理します</p>
        </div>

        {/* ステータスサマリー */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          {/* 未処理 */}
          <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
            <div className="text-sm text-gray-400 mb-1">未処理</div>
            <div className="text-3xl font-bold text-gray-400">{statusCounts.unprocessed}</div>
          </div>

          {/* 準備中 */}
          <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
            <div className="text-sm text-gray-400 mb-1">準備中</div>
            <div className="text-3xl font-bold text-yellow-400">{statusCounts.preparing}</div>
          </div>

          {/* 発送中 */}
          <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
            <div className="text-sm text-gray-400 mb-1">発送中</div>
            <div className="text-3xl font-bold text-orange-400">{statusCounts.shipping}</div>
          </div>

          {/* 発送済 */}
          <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
            <div className="text-sm text-gray-400 mb-1">発送済</div>
            <div className="text-3xl font-bold text-blue-400">{statusCounts.shipped}</div>
          </div>

          {/* 到着 */}
          <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
            <div className="text-sm text-gray-400 mb-1">到着</div>
            <div className="text-3xl font-bold text-green-400">{statusCounts.arrived}</div>
          </div>
        </div>

        {/* コントロール */}
        <div className="bg-slate-800 rounded-lg p-6 mb-8 border border-slate-700">
          {/* 検索 */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="SKUまたは商品名で検索"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white"
            />
          </div>

          {/* フィルタ */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterStatus("all")}
              className={`px-4 py-2 rounded text-sm font-medium ${
                filterStatus === "all" ? "bg-blue-600" : "bg-slate-700 hover:bg-slate-600"
              }`}
            >
              📊 すべて
            </button>
            <button
              onClick={() => setFilterStatus("none")}
              className={`px-4 py-2 rounded text-sm font-medium ${
                filterStatus === "none" ? "bg-gray-600" : "bg-slate-700 hover:bg-slate-600"
              }`}
            >
              ⚪ 未処理
            </button>
            <button
              onClick={() => setFilterStatus("unprocessed")}
              className={`px-4 py-2 rounded text-sm font-medium ${
                filterStatus === "unprocessed" ? "bg-yellow-600" : "bg-slate-700 hover:bg-slate-600"
              }`}
            >
              🟡 準備中
            </button>
            <button
              onClick={() => setFilterStatus("preparing")}
              className={`px-4 py-2 rounded text-sm font-medium ${
                filterStatus === "preparing" ? "bg-orange-600" : "bg-slate-700 hover:bg-slate-600"
              }`}
            >
              🟠 発送中
            </button>
            <button
              onClick={() => setFilterStatus("shipped")}
              className={`px-4 py-2 rounded text-sm font-medium ${
                filterStatus === "shipped" ? "bg-blue-600" : "bg-slate-700 hover:bg-slate-600"
              }`}
            >
              🔵 発送済
            </button>
            <button
              onClick={() => setFilterStatus("arrived")}
              className={`px-4 py-2 rounded text-sm font-medium ${
                filterStatus === "arrived" ? "bg-green-600" : "bg-slate-700 hover:bg-slate-600"
              }`}
            >
              🟢 到着
            </button>
          </div>
        </div>

        {/* 発送テーブル */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-700 border-b border-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">SKU</th>
                <th className="px-4 py-3 text-left">商品名</th>
                <th className="px-4 py-3 text-left">SKUステータス</th>
                <th className="px-4 py-3 text-left">発送ステータス</th>
                <th className="px-4 py-3 text-left">追跡番号</th>
                <th className="px-4 py-3 text-left">アクション</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map((item) => (
                <tr key={item.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                  <td className="px-4 py-3 font-semibold text-blue-400">{item.sku}</td>
                  <td className="px-4 py-3 max-w-xs truncate">{item.title || "（未設定）"}</td>
                  <td className="px-4 py-3 text-xs">
                    <span className="px-2 py-1 bg-slate-600 rounded">{SKU_STATUS_LABEL[item.status ?? "none"]}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${SHIPPING_STATUS_COLOR[item.shipping_status]}`}>
                      {SHIPPING_STATUS_LABEL[item.shipping_status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">
                    {item.tracking_number ? (
                      <span className="text-green-400">{item.tracking_number}</span>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/sku/${item.id}`}
                      className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700 text-xs inline-block"
                    >
                      詳細
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredList.length === 0 && (
          <div className="text-center text-slate-400 mt-8">該当するSKUがありません</div>
        )}

        <div className="mt-6 pt-6 border-t border-slate-700 text-center">
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
