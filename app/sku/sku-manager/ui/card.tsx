type SkuStatus = "shooting" | "editing" | "listing" | "done" | "none";
type SkuItem = {
  id: string;
  sku: string;
  title: string | null;
  status: SkuStatus | null;
  created_at: string;
  // バッジ表示用フィールド
  imageCount?: number;
  cost?: number | null;
  expected_price?: number | null;
  profit?: number | null;
  profitRate?: number | null;
  ebay_category_id?: number | null;
  category_id?: number | null;
  description?: string | null;
  brand?: string | null;
  model?: string | null;
};
import React, { useState } from "react";
import Link from "next/link";
import { judgeProfit } from "@/app/lib/profitRule";
// 管理者用SKUカードUI（優先度バー・日本語理由・未入力明示・3ブロック構成）
export default function CardUI({ items, selectedIds = [], onSelect, onRestore, onPurge }: {
  items: any[],
  selectedIds?: string[],
  onSelect?: (id: string, checked: boolean) => void,
  onRestore?: (id: string) => void,
  onPurge?: (id: string) => void,
}) {
      // Next Action判定ロジック
      const getNextAction = (reasons: string[]) => {
        // 優先順位: 画像→テキスト→価格→AI→発送/出品→完了
        if (reasons.includes("image_insufficient") || reasons.includes("image_missing")) {
          return { label: "画像を追加", role: "外注", color: "text-blue-700" };
        }
        if (reasons.includes("title_not_fixed") || reasons.includes("condition_missing")) {
          return { label: "商品情報を確認", role: "管理者", color: "text-orange-600" };
        }
        if (reasons.includes("profit_not_ready") || reasons.includes("price_missing") || reasons.includes("cost_missing")) {
          return { label: "原価・利益を入力", role: "管理者", color: "text-orange-600" };
        }
        if (reasons.includes("ai_not_ready") || reasons.includes("ai_not_generated") || reasons.includes("ai_outdated")) {
          return { label: "AI説明文を生成", role: "管理者", color: "text-orange-600" };
        }
        if (reasons.includes("shipping_not_ready") || reasons.includes("listing_not_ready")) {
          return { label: "出品準備を完了", role: "管理者", color: "text-orange-600" };
        }
        // 完了
        return { label: "対応完了", role: "—", color: "text-gray-500" };
      };
    // --- getNextActionは下のNext Action判定ロジックに統合済み ---
  const [expanded, setExpanded] = useState<string | null>(null);
  // 優先度判定
  const getPriority = (item: any) => {
    if (item.needsAction) return { color: "bg-red-600", label: "要対応" };
    if (!item.cost || !item.expected_price) return { color: "bg-orange-400", label: "情報不足" };
    if (item.status === "editing" || item.status === "listing") return { color: "bg-yellow-400", label: "作業待ち" };
    if (item.status === "done") return { color: "bg-green-600", label: "出品可" };
    return { color: "bg-gray-400", label: "-" };
  };
  // 日本語理由
  const reasonJP = (key: string) => ({
    image_insufficient: "画像不足",
    title_not_fixed: "商品名未確定",
    condition_missing: "コンディション未設定",
    profit_not_ready: "利益未確定",
    ai_not_ready: "AI未完了",
    status_mismatch: "状態不整合"
  }[key] || key);
  // 利益色分け
  const profitColor = (profit: number | null | undefined) => {
    if (profit == null) return "text-gray-400";
    if (profit < 0) return "text-red-600 font-bold";
    if (profit < 1000) return "text-yellow-500 font-bold";
    return "text-green-600 font-bold";
  };
  // 利益率バッジ（共通ロジック）
  const renderProfitBadge = (profitRate: number | null | undefined) => {
    const result = judgeProfit(profitRate ?? undefined);
    return (
      <span className={`badge badge-${result.color} ml-1`} style={{ minWidth: 70, display: 'inline-block' }}>
        {result.status === "ok" && "🟢"}
        {result.status === "warning" && "🟡"}
        {result.status === "ng" && "🔴"}
        {result.label}
        {profitRate != null && !isNaN(profitRate) && (
          <span className="ml-1 text-xs text-gray-500">({Number(profitRate).toFixed(1)}%)</span>
        )}
      </span>
    );
  };
  // 出品可否
  const getListingStatus = (item: any) => {
    if (item.listing_status === false || item.profit < 0) return { label: "出品不可", color: "bg-red-600 text-white" };
    if (item.listing_status === "conditional") return { label: "条件付き", color: "bg-yellow-500 text-black" };
    if (item.listing_status === true) return { label: "出品OK", color: "bg-green-600 text-white" };
    return { label: "—", color: "bg-gray-400 text-black" };
  };
  // カテゴリ定義・業務フロー順
  const CATEGORY_ORDER = ["image", "text", "price", "ai", "shipping", "listing"];
  const CATEGORY_ICON: Record<string, string> = {
    image: "📷",
    text: "📝",
    price: "💰",
    ai: "🤖",
    shipping: "🚚",
    listing: "🛒",
  };
  // 理由キー→カテゴリ
  const REASON_TO_CATEGORY: Record<string, string> = {
    image_insufficient: "image",
    image_missing: "image",
    title_not_fixed: "text",
    condition_missing: "text",
    description_missing: "text",
    profit_not_ready: "price",
    price_missing: "price",
    ai_not_ready: "ai",
    ai_not_generated: "ai",
    ai_outdated: "ai",
    shipping_not_ready: "shipping",
    weight_missing: "shipping",
    listing_not_ready: "listing",
    ebay_blocked: "listing",
    status_mismatch: "text", // 例外的にtextへ
  };
  // カテゴリ内訳を集計
  const getCategoryCounts = (reasons: string[]) => {
    const counts: Record<string, number> = {};
    for (const r of reasons) {
      const cat = REASON_TO_CATEGORY[r];
      if (cat) counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  };
  // 一覧用：カテゴリ内訳を赤文字で業務順に
  const getCategorySummary = (reasons: string[]) => {
    if (!reasons?.length) return "";
    const counts = getCategoryCounts(reasons);
    return (
      <span className="text-red-600 font-bold">
        要対応：
        {CATEGORY_ORDER.filter(cat => counts[cat])
          .map(cat => (
            <span key={cat} className="ml-1">
              {CATEGORY_ICON[cat]}<span className="inline-block min-w-[10px]">{counts[cat]}</span>
            </span>
          ))}
      </span>
    );
  };
  // 未入力明示
  const showValue = (val: any, label: string) => {
    if (val == null || val === "") return <span className="text-gray-400">{label}</span>;
    return val;
  };
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {items.map((item) => {
        const reasons = item.actionReasons || [];
        const needsAction = item.needsAction;
        const listing = getListingStatus(item);
        const nextAction = getNextAction(reasons);
        let rawTitle = item.title;
        if (rawTitle == null || rawTitle === false || rawTitle === 0 || (typeof rawTitle === "string" && rawTitle.trim() === "")) {
          rawTitle = item.jp_title;
        }
        let productTitle: string | React.ReactNode = "";
        if (rawTitle == null || rawTitle === false || rawTitle === 0 || (typeof rawTitle === "string" && rawTitle.trim() === "")) {
          productTitle = <span className="text-gray-400 font-bold">商品名未入力（外注入力待ち）</span>;
        } else if (typeof rawTitle === "string" && rawTitle.includes("仮")) {
          productTitle = <span className="font-bold text-orange-400">{rawTitle} <span className="text-orange-400">（仮）</span></span>;
        } else {
          productTitle = <span className="font-bold text-white">{rawTitle}</span>;
        }
        // 進捗バー（要対応数/6）
        const progress = 6 - (item.actionReasons?.length || 0);
        return (
          <div key={item.id} className="bg-[#23232a] rounded-2xl shadow-lg border border-gray-800 overflow-hidden flex flex-col mb-4 text-white">
            {/* ヘッダー */}
            <div className="flex flex-col px-5 pt-4 pb-2 border-b border-gray-700 bg-[#23232a]">
              <div className="flex items-center gap-4 min-w-0">
                {onSelect && (
                  <input
                    type="checkbox"
                    className="accent-blue-500 scale-125 mr-2"
                    checked={selectedIds.includes(item.id)}
                    onChange={e => onSelect(item.id, e.target.checked)}
                  />
                )}
                <span className="font-mono font-extrabold text-lg text-blue-300 drop-shadow break-words">{item.sku}</span>
                <span className="text-lg font-bold break-words whitespace-pre-line">{productTitle}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {/* 削除済みSKU用: 復元・完全削除ボタン */}
                {item.deleted_at && (
                  <>
                    {onRestore && (
                      <button
                        className="px-2 py-1 text-xs bg-green-700 text-white rounded hover:bg-green-800 border border-green-800 mr-1"
                        onClick={() => onRestore(item.id)}
                      >復元</button>
                    )}
                    {onPurge && (
                      <button
                        className="px-2 py-1 text-xs bg-red-800 text-white rounded hover:bg-red-900 border border-red-900"
                        onClick={() => {
                          if (window.confirm('このSKUを完全に削除します。よろしいですか？')) onPurge(item.id);
                        }}
                      >完全削除</button>
                    )}
                  </>
                )}
                {needsAction ? (
                  <span className="px-3 py-1 text-sm rounded-full font-bold bg-red-600 text-white shadow">要対応</span>
                ) : item.status === 'done' ? (
                  <span className="px-3 py-1 text-sm rounded-full font-bold bg-gray-600 text-white">完了</span>
                ) : (
                  <span className="px-3 py-1 text-sm rounded-full font-bold bg-green-700 text-white">出品可</span>
                )}
                <button
                  className="text-lg text-gray-400 hover:text-gray-200 px-2 py-1"
                  onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                  title="詳細表示/非表示"
                >
                  {expanded === item.id ? '−' : '＋'}
                </button>
              </div>
            </div>
            {/* 次の作業・進捗バー */}
            <div className={`px-5 py-2 flex items-center gap-4 border-b border-gray-800 bg-[#23232a]`}> 
              <span className={`text-base font-bold flex items-center gap-2 ${nextAction.role === '外注' ? 'text-blue-400' : (nextAction.role === '管理者' ? 'text-orange-400' : 'text-gray-400')}`}>
                {nextAction.role === '外注' ? '🧑‍🔧' : nextAction.role === '管理者' ? '🛠️' : '✅'} 次の作業：{nextAction.label}（{nextAction.role}）
              </span>
              <div className="flex-1 flex items-center gap-2">
                <div className="w-32 h-3 bg-gray-700 rounded-full relative">
                  <div className="h-3 rounded-full bg-blue-500" style={{ width: `${(progress/6)*100}%` }}></div>
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-white font-bold">{progress}/6</span>
                </div>
              </div>
            </div>
            {/* 画像・日付・出品可否・価格サマリ */}
            <div className="flex flex-row items-center px-5 py-3 gap-6 border-b border-gray-800 bg-[#23232a]">
              {/* 画像領域 */}
              <div className="flex flex-col items-center min-w-[60px]">
                {/* 画像本体 */}
                {item.thumbnailUrl ? (
                  <img src={item.thumbnailUrl} alt="thumb" className="w-14 h-14 object-cover rounded border border-gray-700" />
                ) : (
                  <div className="w-14 h-14 flex items-center justify-center bg-gray-800 text-gray-500 rounded border border-gray-700 text-xs">画像なし</div>
                )}
                <span className="text-xs text-gray-400 mt-1">📷 {item.imageCount ?? 0} / 6</span>
                <span className="text-[10px] text-gray-500">{item.created_at?.slice(0,10)}</span>
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <span className={`text-xs ${listing.color}`}>{listing.label}</span>
                {(!item.cost && !item.expected_price && (item.profit == null || item.profit === "") && (item.profitRate == null || item.profitRate === "")) ? (
                  <span className="text-xs text-gray-500">価格情報：未入力（3項目）</span>
                ) : (
                  <span className="text-xs text-gray-300">価格情報：{[item.cost, item.expected_price, item.profit].filter(Boolean).length}/3 入力済</span>
                )}
                {/* 主要数値を横並び・色分け */}
                <div className="flex gap-4 mt-1">
                  <span className="font-bold">原価: <span className="text-gray-300">{showValue(item.cost, "—")}</span></span>
                  <span className="font-bold">売価: <span className="text-blue-300">{showValue(item.expected_price, "—")}</span></span>
                  <span className="font-bold">利益: <span className={profitColor(item.profit)}>{item.profit == null ? <span className="text-gray-400">—</span> : `¥${item.profit}`}</span></span>
                  <span className="font-bold">利益率: {renderProfitBadge(item.profitRate)}</span>
                </div>
              </div>
            </div>
            {/* バッジセクション：画像/価格/eBay/AI（sm以下はアイコンのみ） */}
            <div className="px-5 py-3 border-b border-gray-800 bg-[#18181b] flex flex-wrap gap-2">
              {/* 画像（0/6=赤、1-5=黄、6=緑） */}
              <span
                className={`px-2 py-1 text-xs rounded font-bold flex items-center gap-1 ${
                  (item.imageCount ?? 0) === 0 ? "bg-red-900 text-red-200" :
                  (item.imageCount ?? 0) >= 6 ? "bg-green-900 text-green-200" : 
                  "bg-yellow-900 text-yellow-200"
                }`}
                title={`画像枚数: ${(item.imageCount ?? 0)}/6`}
              >
                <span className="sm:hidden">📸</span>
                <span className="hidden sm:inline">画像</span>
                <span className="ml-1">{item.imageCount ?? 0}/6</span>
              </span>

              {/* 原価 */}
              <span
                className={`px-2 py-1 text-xs rounded font-bold flex items-center gap-1 ${
                  item.cost ? "bg-green-900 text-green-200" : "bg-red-900 text-red-200"
                }`}
                title={`原価入力: ${item.cost ? "済" : "未"}`}
              >
                <span className="sm:hidden">💰</span>
                <span className="hidden sm:inline">原価</span>
                <span className="ml-1">{item.cost ? "✓" : "未"}</span>
              </span>

              {/* 価格（販売価格） */}
              <span
                className={`px-2 py-1 text-xs rounded font-bold flex items-center gap-1 ${
                  item.expected_price ? "bg-green-900 text-green-200" : "bg-red-900 text-red-200"
                }`}
                title={`販売価格入力: ${item.expected_price ? "済" : "未"}`}
              >
                <span className="sm:hidden">💵</span>
                <span className="hidden sm:inline">価格</span>
                <span className="ml-1">{item.expected_price ? "✓" : "未"}</span>
              </span>

              {/* 利益率 */}
              {item.profit != null && item.profitRate != null && (
                <span
                  className={`px-2 py-1 text-xs rounded font-bold flex items-center gap-1 ${
                    item.profitRate >= 10 ? "bg-green-900 text-green-200" : 
                    item.profitRate >= 5 ? "bg-yellow-900 text-yellow-200" :
                    "bg-red-900 text-red-200"
                  }`}
                  title={`利益率: ${item.profitRate?.toFixed(1)}%`}
                >
                  <span className="sm:hidden">📊</span>
                  <span className="hidden sm:inline">利益率</span>
                  <span className="ml-1">{item.profitRate?.toFixed(1)}%</span>
                </span>
              )}

              {/* eBayカテゴリ */}
              <span
                className={`px-2 py-1 text-xs rounded font-bold flex items-center gap-1 ${
                  item.ebay_category_id || item.category_id ? "bg-green-900 text-green-200" : "bg-red-900/30 text-red-300 border border-red-700"
                }`}
                title={`eBayカテゴリ: ${item.ebay_category_id || item.category_id ? "設定済" : "未設定"}`}
              >
                <span className="sm:hidden">🏷️</span>
                <span className="hidden sm:inline">eBay</span>
                <span className="ml-1">{item.ebay_category_id || item.category_id ? "✓" : "未"}</span>
              </span>

              {/* AI説明文 */}
              <span
                className={`px-2 py-1 text-xs rounded font-bold flex items-center gap-1 ${
                  item.description ? "bg-green-900 text-green-200" : "bg-red-900/30 text-red-300 border border-red-700"
                }`}
                title={`AI説明文: ${item.description ? "生成済" : "未生成"}`}
              >
                <span className="sm:hidden">✨</span>
                <span className="hidden sm:inline">AI</span>
                <span className="ml-1">{item.description ? "✓" : "未"}</span>
              </span>
            </div>

            {/* 要対応内訳（詳細ゾーン・折りたたみ） */}
            {needsAction && (
              <div className="px-5 py-3 border-b border-gray-800 bg-[#18181b]">
                <button
                  className="text-xs text-red-400 underline"
                  onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                >
                  {expanded === item.id ? "要対応理由を閉じる" : getCategorySummary(reasons)}
                </button>
                {expanded === item.id && (
                  <div className="mt-2 ml-2 text-xs text-red-200">
                    {CATEGORY_ORDER.filter(cat => getCategoryCounts(reasons)[cat]).map(cat => (
                      <div key={cat} className="mb-1">
                        <div className="font-bold flex items-center gap-1">{CATEGORY_ICON[cat]} {getCategoryCounts(reasons)[cat] > 1 ? `${getCategoryCounts(reasons)[cat]}件` : ""}</div>
                        <ul className="ml-4 list-disc">
                          {reasons.filter(r => REASON_TO_CATEGORY[r] === cat).map((r, i) => (
                            <li key={i}>{reasonJP(r)}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* アクションゾーン（最下部） */}
            <div className="flex flex-row justify-start gap-2 px-5 py-3 bg-[#23232a]">
              {/* Primary CTA: 編集 */}
              <Link href={`/sku/${item.id}/edit`} className="px-3 py-2 text-sm bg-blue-700 text-white rounded hover:bg-blue-800 text-center border border-blue-800 font-bold transition">編集</Link>
              {/* Ghost CTA: 詳細 */}
              <Link href={`/sku/${item.id}`} className="px-3 py-2 text-sm bg-transparent text-gray-300 rounded hover:bg-gray-700/50 text-center border border-gray-600 font-normal transition">詳細</Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
