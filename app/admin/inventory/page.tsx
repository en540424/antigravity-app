"use client";

import { useEffect, useMemo, useState } from "react";
import { nanoid } from "nanoid";

type InventoryRow = {
  sku: string;
  on_hand: number;
  reserved: number;
  available: number;
  reorder_point: number;
  status: "ok" | "low" | "out";
};

type TxType = "IN" | "OUT" | "RESERVE" | "RELEASE";
type Reason = "PURCHASE" | "SALE" | "DAMAGED" | "LOST" | "RETURN" | "ADJUSTMENT";

export default function InventoryPage() {
  const [balances, setBalances] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [txType, setTxType] = useState<TxType>("IN");
  const [sku, setSku] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState<Reason>("PURCHASE");
  const [memo, setMemo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [txMessage, setTxMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [skuQuery, setSkuQuery] = useState("");
  const [skuOptions, setSkuOptions] = useState<{ sku: string; label: string }[]>([]);
  const [skuLoading, setSkuLoading] = useState(false);
  const [knownSkus, setKnownSkus] = useState<Record<string, string>>({});

  const loadBalances = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/inventory/list", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.detail || json?.error || `HTTP ${res.status}`);

      const rows = (json.rows ?? []) as Array<Partial<InventoryRow>>;
      setBalances(rows as InventoryRow[]);
    } catch (e: any) {
      setError(e.message || "残高取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBalances();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const fetchOptions = async () => {
      setSkuLoading(true);
      try {
        const params = new URLSearchParams();
        if (skuQuery.trim()) params.set("q", skuQuery.trim());

        const res = await fetch(`/api/sku/options${params.toString() ? `?${params.toString()}` : ""}`, {
          signal: controller.signal,
        });
        const json = await res.json();
        const rows = json.rows ?? [];
        setSkuOptions(rows);
        setKnownSkus((prev) => {
          const next = { ...prev };
          rows.forEach((r: { sku: string; label: string }) => {
            if (r?.sku) next[r.sku] = r.label || r.sku;
          });
          return next;
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Failed to fetch SKU options", error);
      } finally {
        setSkuLoading(false);
      }
    };

    const handle = setTimeout(fetchOptions, 200);
    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [skuQuery]);

  const totals = useMemo(() => {
    const totalOnHand = balances.reduce((sum, b) => sum + b.on_hand, 0);
    const totalReserved = balances.reduce((sum, b) => sum + b.reserved, 0);
    const totalAvailable = balances.reduce((sum, b) => sum + b.available, 0);
    const outCount = balances.filter((b) => b.status === "out").length;
    const lowCount = balances.filter((b) => b.status === "low").length;
    return { totalOnHand, totalReserved, totalAvailable, outCount, lowCount };
  }, [balances]);

  const handleSubmitTx = async (e: React.FormEvent) => {
    e.preventDefault();
    setTxMessage(null);

    const normalizedSku = sku.trim();
    if (!normalizedSku || !quantity) {
      setTxMessage({ type: "error", text: "SKUと数量は必須です" });
      return;
    }

    if (!knownSkus[normalizedSku]) {
      setTxMessage({ type: "error", text: "存在するSKUを選択してください" });
      return;
    }

    const idempotencyKey = `${txType.toLowerCase()}-${Date.now()}-${nanoid(8)}`;
    setSubmitting(true);

    try {
      const endpoint =
        txType === "IN"
          ? "/api/inventory/in"
          : txType === "OUT"
          ? "/api/inventory/out"
          : txType === "RESERVE"
          ? "/api/inventory/reserve"
          : "/api/inventory/release";

      const payload: any = {
        sku: normalizedSku,
        quantity: Number(quantity),
        idempotencyKey,
        memo: memo || null,
      };

      if (txType === "IN" || txType === "OUT") {
        payload.reason = reason;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);

      setTxMessage({ type: "success", text: `✅ ${getTxTypeLabel(txType)}完了（TX ID: ${data.tx_id})` });
      setQuantity("");
      setMemo("");
      await loadBalances();
    } catch (e: any) {
      setTxMessage({ type: "error", text: `❌ ${e.message}` });
    } finally {
      setSubmitting(false);
    }
  };

  const getTxTypeLabel = (type: TxType) => {
    switch (type) {
      case "IN":
        return "入庫";
      case "OUT":
        return "出庫";
      case "RESERVE":
        return "予約";
      case "RELEASE":
        return "予約解除";
    }
  };

  const getReasonLabel = (r: Reason) => {
    switch (r) {
      case "PURCHASE":
        return "仕入れ";
      case "SALE":
        return "販売";
      case "DAMAGED":
        return "破損";
      case "LOST":
        return "紛失";
      case "RETURN":
        return "返品";
      case "ADJUSTMENT":
        return "調整";
    }
  };

  const renderStatusBadge = (status: InventoryRow["status"]) => {
    if (status === "out") return <span className="px-2 py-1 bg-red-600 text-white rounded text-xs">在庫切れ</span>;
    if (status === "low") return <span className="px-2 py-1 bg-yellow-600 text-white rounded text-xs">在庫少</span>;
    return <span className="px-2 py-1 bg-green-600 text-white rounded text-xs">正常</span>;
  };

  const selectedLabel = sku ? knownSkus[sku] : "";
  const hasSelectedInOptions = skuOptions.some((o) => o.sku === sku);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">📦 在庫管理（台帳ベース）</h1>
          <p className="text-slate-400 text-sm">在庫残高は inventory_ledger から自動計算されます。直接編集はできません。</p>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <div className="text-sm text-slate-400">SKU数</div>
            <div className="text-2xl font-bold">{balances.length}</div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <div className="text-sm text-slate-400">実在庫 合計</div>
            <div className="text-2xl font-bold text-blue-300">{totals.totalOnHand}</div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <div className="text-sm text-slate-400">利用可能 合計</div>
            <div className="text-2xl font-bold text-green-300">{totals.totalAvailable}</div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <div className="text-sm text-slate-400">要注意（少/切れ）</div>
            <div className="text-2xl font-bold text-yellow-300">{totals.lowCount + totals.outCount}</div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <h2 className="text-xl font-bold mb-4"> 在庫トランザクション実行</h2>

          <form onSubmit={handleSubmitTx} className="space-y-4">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">操作</label>
                <select
                  value={txType}
                  onChange={(e) => setTxType(e.target.value as TxType)}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2"
                >
                  <option value="IN">入庫</option>
                  <option value="OUT">出庫</option>
                  <option value="RESERVE">予約</option>
                  <option value="RELEASE">予約解除</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">SKU検索</label>
                <input
                  value={skuQuery}
                  onChange={(e) => setSkuQuery(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2"
                  placeholder="SKUやタイトルで検索"
                />
                <p className="text-xs text-slate-400 mt-1">{skuLoading ? "候補を取得中..." : `候補: ${skuOptions.length} 件`}</p>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">SKUを選択（必須）</label>
                <select
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2"
                  required
                >
                  <option value="">選択してください</option>
                  {!hasSelectedInOptions && sku && selectedLabel && (
                    <option value={sku}>{selectedLabel}</option>
                  )}
                  {skuOptions.map((option) => (
                    <option key={option.sku} value={option.sku}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">存在するSKUのみ選択できます</p>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">数量</label>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2"
                  required
                />
              </div>

              {(txType === "IN" || txType === "OUT") && (
                <div>
                  <label className="block text-sm text-slate-300 mb-1">理由</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value as Reason)}
                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2"
                  >
                    {(txType === "IN" ? ["PURCHASE", "RETURN", "ADJUSTMENT"] : ["SALE", "DAMAGED", "LOST", "RETURN", "ADJUSTMENT"]).map((r) => (
                      <option key={r} value={r}>
                        {getReasonLabel(r as Reason)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1">メモ（任意）</label>
              <input
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2"
                placeholder="例: 仕入れ伝票番号など"
              />
            </div>

            {txMessage && (
              <div
                className={`px-4 py-2 rounded text-sm ${txMessage.type === "success" ? "bg-emerald-700 text-white" : "bg-red-700 text-white"}`}
              >
                {txMessage.text}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-semibold disabled:opacity-60"
            >
              {submitting ? "送信中..." : `${getTxTypeLabel(txType)}を登録`}
            </button>
          </form>
        </div>

        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-400">読み込み中...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-300">{error}</div>
          ) : balances.length === 0 ? (
            <div className="p-8 text-center text-slate-400">在庫データがありません</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-700 border-b border-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">SKU</th>
                  <th className="px-4 py-3 text-center">実在庫</th>
                  <th className="px-4 py-3 text-center">予約済</th>
                  <th className="px-4 py-3 text-center">利用可能</th>
                  <th className="px-4 py-3 text-center">再注文点</th>
                  <th className="px-4 py-3 text-left">ステータス</th>
                </tr>
              </thead>
              <tbody>
                {balances.map((b) => (
                  <tr key={b.sku} className="border-b border-slate-700 hover:bg-slate-700/50">
                    <td className="px-4 py-3 font-semibold text-blue-400">{b.sku}</td>
                    <td className="px-4 py-3 text-center font-semibold">{b.on_hand}</td>
                    <td className="px-4 py-3 text-center text-orange-400">{b.reserved}</td>
                    <td className={`px-4 py-3 text-center font-bold ${b.available > 0 ? "text-green-400" : "text-red-400"}`}>
                      {b.available}
                    </td>
                    <td className="px-4 py-3 text-center text-yellow-300">{b.reorder_point}</td>
                    <td className="px-4 py-3">{renderStatusBadge(b.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="pt-6 border-t border-slate-700 text-center">
          <a
            href="/"
            className="inline-block px-6 py-2 bg-slate-600 text-white rounded hover:bg-slate-700 font-medium"
          >
            ホームに戻る
          </a>
        </div>
      </div>
    </div>
  );
}
