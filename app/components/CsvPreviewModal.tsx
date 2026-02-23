/**
 * CSVプレビュー画面コンポーネント
 * 
 * 用途：CSV出力前に内容確認
 * 外注・他者も安心できる確認UX
 */

'use client';

import { useState } from 'react';

interface CsvPreviewRow {
  sku: string;
  title: string;
  description: string;
  condition: string;
  conditionId: number;
  category: string;
  categoryId: number;
  priceUsd: number;
  imageCount: number;
  mainImageExists: boolean;
  canExport: boolean;
  errors: string[];
  warnings: string[];
}

interface CsvPreviewModalProps {
  open: boolean;
  rows: CsvPreviewRow[];
  totalRows: number;
  onConfirm: () => void;
  onCancel: () => void;
  isExporting?: boolean;
}

export default function CsvPreviewModal({
  open,
  rows,
  totalRows,
  onConfirm,
  onCancel,
  isExporting = false,
}: CsvPreviewModalProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 5;
  const totalPages = Math.ceil(rows.length / itemsPerPage);
  const paginatedRows = rows.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  const exportableCount = rows.filter((r) => r.canExport).length;
  const errorCount = rows.filter((r) => r.errors.length > 0).length;
  const warningCount = rows.filter((r) => r.warnings.length > 0).length;

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-auto border border-slate-700">
        {/* ヘッダー */}
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-white">CSV出力前確認</h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-300"
            >
              ✕
            </button>
          </div>

          {/* 統計情報 */}
          <div className="grid grid-cols-4 gap-2 text-sm">
            <div className="bg-blue-950 border border-blue-700 rounded px-3 py-2">
              <div className="text-gray-400">合計</div>
              <div className="text-blue-300 font-bold">{totalRows} SKU</div>
            </div>
            <div className="bg-emerald-950 border border-emerald-700 rounded px-3 py-2">
              <div className="text-gray-400">出力可</div>
              <div className="text-emerald-300 font-bold">✅ {exportableCount}</div>
            </div>
            <div className="bg-yellow-950 border border-yellow-700 rounded px-3 py-2">
              <div className="text-gray-400">注意</div>
              <div className="text-yellow-300 font-bold">⚠️ {warningCount}</div>
            </div>
            <div className="bg-red-950 border border-red-700 rounded px-3 py-2">
              <div className="text-gray-400">エラー</div>
              <div className="text-red-300 font-bold">❌ {errorCount}</div>
            </div>
          </div>
        </div>

        {/* テーブル */}
        <div className="p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-2 px-3 font-semibold text-gray-300">SKU</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-300">タイトル</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-300">Condition</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-300">Price</th>
                <th className="text-center py-2 px-3 font-semibold text-gray-300">状態</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((row) => (
                <tr
                  key={row.sku}
                  className="border-b border-slate-700 hover:bg-slate-800/50 transition"
                >
                  <td className="py-3 px-3 font-mono text-cyan-300">{row.sku}</td>
                  <td className="py-3 px-3 text-gray-300 truncate max-w-xs">
                    {row.title || '（未入力）'}
                  </td>
                  <td className="py-3 px-3 text-gray-300">
                    {row.condition}
                    <span className="text-gray-500 ml-1">({row.conditionId})</span>
                  </td>
                  <td className="py-3 px-3 text-right text-gray-300">${row.priceUsd}</td>
                  <td className="py-3 px-3 text-center">
                    {row.canExport ? (
                      <span className="bg-emerald-700 text-white px-2 py-1 rounded text-xs font-bold">
                        ✅ OK
                      </span>
                    ) : row.warnings.length > 0 && row.errors.length === 0 ? (
                      <span className="bg-yellow-700 text-white px-2 py-1 rounded text-xs font-bold">
                        ⚠️ 注意
                      </span>
                    ) : (
                      <span className="bg-red-700 text-white px-2 py-1 rounded text-xs font-bold">
                        ❌ NG
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* 詳細エラー表示 */}
          <div className="mt-6 space-y-3">
            {paginatedRows
              .filter((r) => r.errors.length > 0 || r.warnings.length > 0)
              .map((row) => (
                <div key={row.sku} className="border-l-4 pl-3 py-2">
                  <div className="text-sm font-mono text-cyan-300 mb-1">{row.sku}</div>
                  {row.errors.map((err) => (
                    <div key={err} className="text-red-300 text-xs mb-1">
                      ❌ {err}
                    </div>
                  ))}
                  {row.warnings.map((warn) => (
                    <div key={warn} className="text-yellow-300 text-xs mb-1">
                      ⚠️ {warn}
                    </div>
                  ))}
                </div>
              ))}
          </div>
        </div>

        {/* ページネーション */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 py-3 border-t border-slate-700">
            <button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="px-3 py-1 rounded bg-slate-700 text-gray-300 disabled:opacity-50"
            >
              ←
            </button>
            <span className="text-gray-400 text-sm">
              {currentPage + 1} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage === totalPages - 1}
              className="px-3 py-1 rounded bg-slate-700 text-gray-300 disabled:opacity-50"
            >
              →
            </button>
          </div>
        )}

        {/* フッター */}
        <div className="sticky bottom-0 bg-slate-800 border-t border-slate-700 p-4 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded border border-gray-600 text-gray-300 hover:bg-gray-700 transition"
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            disabled={exportableCount === 0 || isExporting}
            className={`px-4 py-2 rounded font-bold transition ${
              exportableCount > 0 && !isExporting
                ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                : 'bg-gray-600 text-gray-300 cursor-not-allowed'
            }`}
          >
            {isExporting ? '出力中...' : `CSV出力（${exportableCount}件）`}
          </button>
        </div>
      </div>
    </div>
  );
}
