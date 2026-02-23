"use client";

import React, { useEffect, useMemo, useState } from "react";

type PreviewRow = {
  id: string;
  sku: string;
  title?: string | null;
  listing_image_count?: number | null;
  ebay_category_id?: number | null;
  price_usd?: number | null;
  ok: boolean;
  missing: string[];
};

type Props = {
  open: boolean;
  onClose: () => void;

  // 「出品可SKUのみ」or「選択SKUのみ」など
  mode?: "ready_only" | "all";
  skuIds?: string[];

  // 既にあなたが持ってる実行関数を渡せるようにする
  onExportCsv: () => Promise<void>;
  onExportZip: () => Promise<void>;
};

export default function EbayExportPreviewModal({
  open,
  onClose,
  mode = "ready_only",
  skuIds,
  onExportCsv,
  onExportZip,
}: Props) {
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "ok" | "ng">("all");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!open) return;

    const run = async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch("/api/ebay/export-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode, skuIds }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.detail ?? `HTTP ${res.status}`);
        }
        const j = await res.json();
        setRows(Array.isArray(j.rows) ? j.rows : []);
      } catch (e: any) {
        setErr(e?.message ?? "プレビュー取得に失敗しました");
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [open, mode, skuIds]);

  const okCount = useMemo(() => rows.filter((r) => r.ok).length, [rows]);
  const ngCount = useMemo(() => rows.filter((r) => !r.ok).length, [rows]);

  const shown = useMemo(() => {
    if (filter === "ok") return rows.filter((r) => r.ok);
    if (filter === "ng") return rows.filter((r) => !r.ok);
    return rows;
  }, [rows, filter]);

  async function handleExportAll() {
    setExporting(true);
    try {
      // まずCSV→ZIPの順（あなたの運用ルール）
      await onExportCsv();
      await onExportZip();
    } finally {
      setExporting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} aria-hidden />

      <div className="relative w-[min(1100px,95vw)] max-h-[90vh] overflow-hidden rounded-2xl bg-slate-800 shadow-2xl border border-slate-600">
        <div className="flex items-center justify-between border-b border-slate-600 px-5 py-4 bg-slate-900">
          <div>
            <div className="text-lg font-semibold text-white">🔍 eBay 出品プレビュー（出力前確認）</div>
            <div className="mt-1 text-xs text-slate-400">
              ✅ OK：{okCount}件 / ❌ NG：{ngCount}件　※ OKのみがCSV/ZIP出力対象になります
            </div>
          </div>
          <button className="rounded-lg px-3 py-1 text-sm text-white hover:bg-slate-700 transition" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="border-b border-slate-600 px-5 py-3 bg-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>
              すべて
            </FilterButton>
            <FilterButton active={filter === "ok"} onClick={() => setFilter("ok")}>
              ✅ OKのみ
            </FilterButton>
            <FilterButton active={filter === "ng"} onClick={() => setFilter("ng")}>
              ❌ NGのみ
            </FilterButton>

            <div className="ml-auto flex flex-wrap gap-2">
              <button
                className={`rounded-xl px-4 py-2 text-sm font-bold text-white transition ${
                  okCount > 0 && !exporting ? "bg-green-600 hover:bg-green-700" : "bg-gray-600 cursor-not-allowed"
                }`}
                disabled={okCount === 0 || exporting}
                onClick={handleExportAll}
                title={okCount === 0 ? "出品可能SKUがありません" : "CSV→ZIPの順で出力します"}
              >
                {exporting ? "出力中..." : "🚀 出品セット生成（CSV→ZIP）"}
              </button>

              <button
                className={`rounded-xl px-4 py-2 text-sm font-bold text-white transition ${
                  okCount > 0 && !exporting ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-600 cursor-not-allowed"
                }`}
                disabled={okCount === 0 || exporting}
                onClick={onExportCsv}
              >
                ① CSV出力
              </button>

              <button
                className={`rounded-xl px-4 py-2 text-sm font-bold text-white transition ${
                  okCount > 0 && !exporting ? "bg-purple-600 hover:bg-purple-700" : "bg-gray-600 cursor-not-allowed"
                }`}
                disabled={okCount === 0 || exporting}
                onClick={onExportZip}
              >
                ② 画像ZIP出力
              </button>
            </div>
          </div>

          <div className="mt-2 text-xs text-slate-400">
            ℹ️ この操作はデータを書き換えません（出力のみ）。NGのSKUは不足項目を埋めてください。
          </div>
        </div>

        <div className="max-h-[60vh] overflow-auto px-5 py-4 bg-slate-900">
          {err && (
            <div className="mb-3 rounded-xl bg-red-900/50 border border-red-600 px-4 py-3 text-sm text-red-200">
              ❌ {err}
            </div>
          )}

          {loading && <div className="py-8 text-center text-sm text-slate-400">⏳ 読み込み中…</div>}

          {!loading && shown.length === 0 && (
            <div className="py-8 text-center text-sm text-slate-400">表示するデータがありません</div>
          )}

          <div className="space-y-2">
            {shown.map((r) => (
              <div
                key={r.id}
                className={`rounded-2xl border p-4 transition ${
                  r.ok ? "border-green-600 bg-green-900/20" : "border-red-600 bg-red-900/20"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-white">{r.sku}</span>
                    {r.ok ? (
                      <span className="rounded-full bg-green-600 px-2 py-0.5 text-xs text-white font-bold">
                        ✓ OK
                      </span>
                    ) : (
                      <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs text-white font-bold">
                        ✗ NG
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      LISTING画像：{r.listing_image_count ?? 0}枚 / カテゴリID：{r.ebay_category_id ?? "—"} /
                      価格：${r.price_usd ?? "—"}
                    </span>
                  </div>
                </div>

                <div className="mt-2 text-sm text-slate-200">
                  {r.title ? r.title : <span className="text-slate-500">（タイトルなし）</span>}
                </div>

                {!r.ok && r.missing?.length > 0 && (
                  <div className="mt-2 rounded-lg bg-red-900/30 px-3 py-2 text-xs text-red-300 border border-red-700">
                    ⚠️ 不足：{r.missing.join(" / ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-600 px-5 py-4 bg-slate-800">
          <button className="rounded-xl border border-slate-600 bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-600 transition" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-xl px-3 py-2 text-sm font-semibold transition",
        active ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
