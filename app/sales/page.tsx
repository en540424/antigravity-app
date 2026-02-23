"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function SalesPage() {
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<any[]>([]);

  useEffect(() => {
    const fetchSales = async () => {
      try {
        const res = await fetch("/api/sales/list");
        const data = await res.json();
        setSales(Array.isArray(data) ? data : []);
      } catch (e) {
        setSales([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSales();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto text-white">
      <div className="mb-4">
        <Link href="/" className="text-sm text-gray-400 hover:text-white">
          ← ホーム
        </Link>
        <h1 className="mt-2 text-2xl font-bold">売上管理</h1>
        <p className="text-gray-400 text-sm">売上データを確認・分析できます</p>
      </div>
      {loading ? (
        <div className="text-gray-400">読み込み中...</div>
      ) : (
        <div className="bg-slate-800 rounded-xl p-4 mt-4">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="px-2 py-1 text-left">日付</th>
                <th className="px-2 py-1 text-left">SKU</th>
                <th className="px-2 py-1 text-left">商品名</th>
                <th className="px-2 py-1 text-right">売価</th>
                <th className="px-2 py-1 text-right">原価</th>
                <th className="px-2 py-1 text-right">利益</th>
                <th className="px-2 py-1 text-left">ステータス</th>
              </tr>
            </thead>
            <tbody>
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-gray-400 py-8">
                    売上データがありません
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id} className="border-b border-slate-700">
                    <td className="px-2 py-1">{sale.sold_at?.slice(0, 10) ?? "—"}</td>
                    <td className="px-2 py-1">{sale.sku}</td>
                    <td className="px-2 py-1 max-w-xs truncate">{sale.title ?? "—"}</td>
                    <td className="px-2 py-1 text-right">{sale.sale_price_jpy ? `¥${sale.sale_price_jpy.toLocaleString()}` : "—"}</td>
                    <td className="px-2 py-1 text-right">{sale.cost_jpy ? `¥${sale.cost_jpy.toLocaleString()}` : "—"}</td>
                    <td className={`px-2 py-1 text-right font-semibold ${sale.profit_jpy > 0 ? "text-green-400" : sale.profit_jpy < 0 ? "text-red-400" : "text-gray-400"}`}>
                      {sale.profit_jpy != null ? `¥${sale.profit_jpy.toLocaleString()}` : "—"}
                    </td>
                    <td className="px-2 py-1">{sale.status ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
