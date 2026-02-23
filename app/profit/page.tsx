"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SkuItem, SKU_STATUS_LABEL, getConditionLabel, getConditionEn, getShippingStatusLabel, getStatusLabel } from "../lib/skuCondition";

type ProfitSummary = {
  totalSKUs: number;
  totalPurchaseCost: number;
  totalProfit: number;
  averageProfitRate: number;
  profitableCount: number;
  unprofitableCount: number;
};

type ProfitBySKU = SkuItem & {
  profit: number | null;
  profitRate: number | null;
  selling_price_usd?: number | null;
  shipping_cost_usd?: number | null;
};

export default function ProfitManagementPage() {
  const [loading, setLoading] = useState(true);
  const [skuList, setSkuList] = useState<SkuItem[]>([]);
  const [profitList, setProfitList] = useState<ProfitBySKU[]>([]);
  const [summary, setSummary] = useState<ProfitSummary | null>(null);
  const [sortBy, setSortBy] = useState<"profit" | "rate" | "sku" | "cost">("profit");

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
    }
  };

  // 利益データをAPIの値で集計
  const calculateProfits = (items: SkuItem[]) => {
    const profits: ProfitBySKU[] = items.map((item) => ({
      ...item,
      profit: item.profit ?? null,
      profitRate: item.profitRate ?? null,
    }));

    // ソート
    const sorted = [...profits].sort((a, b) => {
      switch (sortBy) {
        case "profit":
          return (b.profit ?? 0) - (a.profit ?? 0);
        case "rate":
          return (b.profitRate ?? 0) - (a.profitRate ?? 0);
        case "cost":
          return (b.purchase_cost_jpy ?? 0) - (a.purchase_cost_jpy ?? 0);
        case "sku":
          return a.sku.localeCompare(b.sku);
        default:
          return 0;
      }
    });

    setProfitList(sorted);

    // サマリー計算
    const totalCost = items.reduce((sum, item) => sum + (item.purchase_cost_jpy ?? 0), 0);
    const totalProfit = sorted.reduce((sum, item) => sum + (item.profit ?? 0), 0);
    const profitableCount = sorted.filter((item) => (item.profit ?? 0) > 0).length;
    let avgProfitRate = 0;
    if (totalCost > 0 && totalProfit > 0) {
      avgProfitRate = Math.round((totalProfit / totalCost) * 100 * 10) / 10;
    }
    setSummary({
      totalSKUs: items.length,
      totalPurchaseCost: totalCost,
      totalProfit,
      averageProfitRate: isNaN(avgProfitRate) ? 0 : avgProfitRate,
      profitableCount,
      unprofitableCount: items.length - profitableCount,
    });
  };

  useEffect(() => {
    fetchSkuList();
  }, []);

  useEffect(() => {
    if (skuList.length > 0) {
      calculateProfits(skuList);
      setLoading(false);
    }
  }, [skuList, sortBy]);

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
          <h1 className="text-4xl font-bold mb-2">💰 利益管理</h1>
          <p className="text-slate-400">SKUごとの利益を分析します</p>
        </div>

        {/* サマリーカード */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {/* 総SKU数 */}
            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
              <div className="text-sm text-gray-400 mb-1">総SKU数</div>
              <div className="text-3xl font-bold text-blue-400">{summary.totalSKUs}</div>
            </div>

            {/* 総原価 */}
            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
              <div className="text-sm text-gray-400 mb-1">総原価</div>
              <div className="text-2xl font-bold">¥{summary.totalPurchaseCost.toLocaleString("ja-JP")}</div>
            </div>

            {/* 総利益 */}
            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
              <div className="text-sm text-gray-400 mb-1">予想総利益</div>
              <div className="text-3xl font-bold text-green-400">¥{summary.totalProfit.toLocaleString("ja-JP")}</div>
            </div>

            {/* 平均利益率 */}
            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
              <div className="text-sm text-gray-400 mb-1">平均利益率</div>
              <div className="text-3xl font-bold text-yellow-400">
                {isNaN(summary.averageProfitRate) ? "—" : `${summary.averageProfitRate}%`}
              </div>
            </div>

            {/* 利益ランク */}
            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
              <div className="text-sm text-gray-400 mb-1">採算性</div>
              <div className="text-2xl font-bold">
                <span className="text-green-400">{summary.profitableCount}</span>
                <span className="text-gray-500"> / </span>
                <span className="text-red-400">{summary.unprofitableCount}</span>
              </div>
            </div>
          </div>
        )}

        {/* ソート & フィルタ */}
        <div className="bg-slate-800 rounded-lg p-4 mb-6 border border-slate-700">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSortBy("profit")}
              className={`px-4 py-2 rounded text-sm font-medium ${
                sortBy === "profit" ? "bg-blue-600" : "bg-slate-700 hover:bg-slate-600"
              }`}
            >
              💰 利益順
            </button>
            <button
              onClick={() => setSortBy("rate")}
              className={`px-4 py-2 rounded text-sm font-medium ${
                sortBy === "rate" ? "bg-blue-600" : "bg-slate-700 hover:bg-slate-600"
              }`}
            >
              📊 利益率順
            </button>
            <button
              onClick={() => setSortBy("cost")}
              className={`px-4 py-2 rounded text-sm font-medium ${
                sortBy === "cost" ? "bg-blue-600" : "bg-slate-700 hover:bg-slate-600"
              }`}
            >
              💵 原価順
            </button>
            <button
              onClick={() => setSortBy("sku")}
              className={`px-4 py-2 rounded text-sm font-medium ${
                sortBy === "sku" ? "bg-blue-600" : "bg-slate-700 hover:bg-slate-600"
              }`}
            >
              🆔 SKU順
            </button>
          </div>
        </div>

        {/* CSV出力ボタン */}
        <div className="mb-4 text-right">
          <button
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-bold"
            onClick={() => {
              // CSV出力処理
              const headers = [
                "SKU",
                "商品名",
                "コンディション（日本語）",
                "コンディション（英語）",
                "原価",
                "想定売価",
                "送料",
                "手数料合計",
                "想定利益",
                "利益率（％）",
                "発送ステータス",
                "出品ステータス",
              ];
              const rows = profitList
                .filter((item) => item.profit != null)
                .map((item) => [
                  item.sku,
                  item.title ?? "",
                  getConditionLabel(item.condition),
                  getConditionEn(getConditionLabel(item.condition)),
                  item.purchase_cost_jpy ?? "",
                  item.selling_price_usd ?? "",
                  item.shipping_cost_usd ?? "",
                  "", // 手数料合計は詳細計算が必要な場合はAPI拡張
                  item.profit ?? "",
                  item.profitRate ?? "",
                  getShippingStatusLabel(item.shipping_status),
                  getStatusLabel(item.status),
                ]);
              const csv = [headers, ...rows]
                .map((row) => row.map((v) => (typeof v === "string" ? `"${v.replace(/"/g, '""')}"` : v)).join(","))
                .join("\r\n");
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `sku_profit_${new Date().toISOString().slice(0, 10)}.csv`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
          >
            CSV出力
          </button>
        </div>

        {/* 利益テーブル */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-700 border-b border-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">SKU</th>
                <th className="px-4 py-3 text-left">商品名</th>
                <th className="px-4 py-3 text-left">ステータス</th>
                <th className="px-4 py-3 text-right">原価</th>
                <th className="px-4 py-3 text-right">予想利益</th>
                <th className="px-4 py-3 text-right">利益率</th>
                <th className="px-4 py-3 text-left">アクション</th>
              </tr>
            </thead>
            <tbody>
              {profitList.map((item) => (
                <tr key={item.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                  <td className="px-4 py-3 font-semibold text-blue-400">{item.sku}</td>
                  <td className="px-4 py-3 max-w-xs truncate">{item.title || "（未設定）"}</td>
                  <td className="px-4 py-3 text-xs">
                    <span className="px-2 py-1 bg-slate-600 rounded">{SKU_STATUS_LABEL[item.status ?? "none"]}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {item.purchase_cost_jpy ? `¥${item.purchase_cost_jpy.toLocaleString("ja-JP")}` : "—"}
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${item.profit != null ? (item.profit > 0 ? "text-green-400" : "text-red-400") : "text-gray-400"}`}>
                    {item.profit != null ? `¥${item.profit.toLocaleString("ja-JP")}` : "—"}
                  </td>
                  <td className={`px-4 py-3 text-right font-bold ${item.profitRate != null ? (item.profitRate >= 20 ? "text-green-400" : item.profitRate >= 10 ? "text-yellow-400" : "text-red-400") : "text-gray-400"}`}>
                    {item.profitRate != null ? `${item.profitRate}%` : "—"}
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

        {profitList.length === 0 && (
          <div className="text-center text-slate-400 mt-8">SKUデータがありません</div>
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
