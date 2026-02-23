
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import CardUI from "./ui/card";
import SkuAutoCreateButton from "./SkuAutoCreateButton";
import EbayExportPreviewModal from "@/app/components/EbayExportPreviewModal";
import {
  getShippingStatusLabel,
  getConditionLabel,
  getConditionEn,
} from "@/app/lib/skuCondition";
import type { Sku_condition, ShippingStatus } from "@/app/lib/skuCondition";
import type { EbayListingData } from "@/app/lib/ebayListing";
import { getReasons, getListingStatus, canList } from "@/app/lib/skuJudge";

type SkuItem = {
  id: string;
  sku: string;
  title: string | null;
  status: "shooting" | "editing" | "listing" | "done" | "none" | null;
  condition?: Sku_condition | null;
  purchase_cost_jpy?: number | null;
  profit?: number;
  imageCount?: number;
  thumbnailUrl?: string | null;
  shipping_status?: ShippingStatus | null;
  ai_status?: "not_generated" | "generated" | "needs_regen" | "error";
  ebayListing?: EbayListingData & { isReady: boolean };
  // UI用マッピング（APIからの互換）
  cost?: number | null;
  expected_price?: number | null;
  sale_price_jpy?: number | null;
  jp_title?: string | null;
  created_at?: string;
  updated_at?: string;
  // バッジ用フィールド
  description?: string | null;
  brand?: string | null;
  model?: string | null;
  ebay_category_id?: number | null;
  category_id?: number | null;
  profitRate?: number | null;
};

const AI_STATUS_META = {
  not_generated: { label: "未生成", color: "bg-slate-600 text-white" },
  generated: { label: "AI生成済", color: "bg-emerald-700 text-white" },
  needs_regen: { label: "要再生成", color: "bg-yellow-600 text-black" },
};
const STATUS_META = {
  shooting: { label: "撮影待ち", color: "bg-slate-600" },
  editing: { label: "編集待ち", color: "bg-yellow-500" },
  listing: { label: "出品待ち", color: "bg-blue-500" },
  done: { label: "完了", color: "bg-green-600" },
  none: { label: "未設定", color: "bg-gray-600" },
};

function downloadEbayCsv(items: SkuItem[]) {
  const ready = items.filter((item): item is SkuItem & { ebayListing: EbayListingData & { isReady: boolean } } => !!item.ebayListing && item.ebayListing.isReady);
  if (ready.length === 0) {
    alert("出品可能なSKUがありません");
    return;
  }
  const header = [
    "SKU",
    "eBayタイトル",
    "eBay説明文",
    "価格USD",
    "コンディション",
    "画像URL",
    "発送条件",
    "返品ポリシー",
  ];
  const rows = ready.map((item) => {
    const l = item.ebayListing!;
    return [
      l.sku,
      l.title_en,
      l.description_en,
      l.price_usd,
      l.condition_en,
      (l.imageUrls || []).join(";"),
      l.shippingTemplate,
      l.returnPolicy,
    ];
  });
  const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ebay_export_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function SkuManagerPage() {
      // トースト通知用
      const [toast, setToast] = useState<{ message: string; type: "success" | "warning" | "error" } | null>(null);
      const showToast = (message: string, type: "success" | "warning" | "error") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
      };
      // ✅ F-3: プレビューモーダル用state
      const [previewOpen, setPreviewOpen] = useState(false);
      // 右側 eBay一括出品カード（アコーディオン）
      const [exportOpen, setExportOpen] = useState(false);
      // 削除済みSKUリスト
      const [showDeleted, setShowDeleted] = useState(false);
      const [deletedItems, setDeletedItems] = useState<SkuItem[]>([]);
      const [loadingDeleted, setLoadingDeleted] = useState(false);
      
      // 検索・フィルタ・並び替え用state
      const [searchQuery, setSearchQuery] = useState("");
      const [statusFilter, setStatusFilter] = useState<"all" | SkuItem["status"]>("all");
      const [sortBy, setSortBy] = useState<"updated" | "created" | "profit" | "image">("updated");
      const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
      // 削除済みリスト取得
      const loadDeleted = async () => {
        setLoadingDeleted(true);
        try {
          const res = await fetch("/api/sku-list/deleted");
          let data = await res.json();
          if (!Array.isArray(data)) data = [];
          // 有効SKUと同じactionReasons, needsAction等を付与
          const seenIds = new Set();
          const itemsWithAction = data
            .filter(item => {
              if (seenIds.has(item.id)) return false;
              seenIds.add(item.id);
              return true;
            })
            .map(item => {
              const actionReasons = getActionReasons(item, isAdmin);
              return {
                ...item,
                title: item.title || item.jp_title || "",
                jp_title: item.jp_title || item.title || "",
                needsAction: actionReasons.length > 0,
                actionReasons,
              };
            });
          setDeletedItems(itemsWithAction);
        } catch (e) {
          setDeletedItems([]);
        } finally {
          setLoadingDeleted(false);
        }
      };
    // 複数選択用
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    // 一括削除処理
    const handleSelect = (id: string, checked: boolean) => {
      setSelectedIds(prev => checked ? [...prev, id] : prev.filter(x => x !== id));
    };
    const handleDeleteSelected = async () => {
      if (selectedIds.length === 0) return;
      if (!window.confirm(`選択した${selectedIds.length}件を削除します。よろしいですか？`)) return;
      setLoading(true);
      try {
        for (const id of selectedIds) {
          await fetch(`/api/delete-sku/${id}`, { method: "DELETE" });
        }
        setSelectedIds([]);
        // 再読込
        const res = await fetch("/api/sku-list");
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        alert("削除に失敗しました");
      } finally {
        setLoading(false);
      }
    };
  // 仮の権限判定（本番は認証情報から取得）
  const isAdmin = true; // 管理者:true, 外注:false
  const [items, setItems] = useState<SkuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showOnlyNeedsAction, setShowOnlyNeedsAction] = useState(false);
  const filterButtons = [
    { key: "all", label: "すべて" },
    { key: "shooting", label: "撮影待ち" },
    { key: "editing", label: "編集待ち" },
    { key: "listing", label: "出品待ち" },
    { key: "done", label: "完了" },
  ];

  // 要対応判定ロジック
  function getActionReasons(item: SkuItem, isAdmin: boolean): string[] {
    const reasons: string[] = [];
    // ① 画像不足
    if ((item.imageCount ?? 0) < 5 || !item.thumbnailUrl) {
      reasons.push('image_insufficient');
    }
    // ② 商品名・説明文が未確定（title, jp_titleどちらも参照）
    const rawTitle = item.title || (item as any).jp_title || "";
    if (!rawTitle || rawTitle.trim() === "") {
      reasons.push('title_not_fixed');
    }
    // ③ コンディション未確定
    if (!item.condition || item.condition === "none") {
      reasons.push('condition_missing');
    }
    // ④ 利益計算が成立していない（管理者のみ）
    if (isAdmin) {
      const cost = item.purchase_cost_jpy ?? item.cost;
      const price = item.sale_price_jpy ?? item.expected_price;
      const profit = item.profit;
      // いずれか未入力または利益がマイナスなら要対応
      if (
        cost == null || cost < 0 ||
        price == null || price < 0 ||
        profit == null || profit < 0
      ) {
        reasons.push('profit_not_ready');
      }
    }
    // ⑤ AI生成未完了
    if (item.ai_status === "not_generated" || item.ai_status === "needs_regen" || item.ai_status === "error") {
      reasons.push('ai_not_ready');
    }
    // ⑥ ステータスと中身が不整合（例のみ）
    if ((item.status === "listing" && String(item.shipping_status) === "NG") || (item.status === "done" && !item.shipping_status)) {
      reasons.push('status_mismatch');
    }
    return reasons;
  }

  // 重複SKU除外＋要対応判定・理由を付与
  const seenIds = new Set();
  const itemsWithAction = items
    .filter(item => {
      if (seenIds.has(item.id)) return false;
      seenIds.add(item.id);
      return true;
    })
    .map(item => {
      const actionReasons = getActionReasons(item, isAdmin);
      // title/jp_title両方propsに明示的に持たせる
      return {
        ...item,
        title: item.title || item.jp_title || "",
        jp_title: item.jp_title || item.title || "",
        needsAction: actionReasons.length > 0,
        actionReasons,
      };
    });

  // --- 自動ソート: Next Action/カテゴリ/利益/作成日 ---
  // Next Action判定ロジック（CardUIと同じものをここにも定義）
  const getNextAction = (reasons: string[]) => {
    if (reasons.includes("image_insufficient") || reasons.includes("image_missing")) {
      return { key: "image", label: "画像を追加", role: "外注" };
    }
    if (reasons.includes("title_not_fixed") || reasons.includes("condition_missing")) {
      return { key: "text", label: "商品情報を確認", role: "管理者" };
    }
    if (reasons.includes("profit_not_ready") || reasons.includes("price_missing") || reasons.includes("cost_missing")) {
      return { key: "profit", label: "原価・利益を入力", role: "管理者" };
    }
    if (reasons.includes("ai_not_ready") || reasons.includes("ai_not_generated") || reasons.includes("ai_outdated")) {
      return { key: "ai", label: "AI説明文を生成", role: "管理者" };
    }
    if (reasons.includes("shipping_not_ready") || reasons.includes("listing_not_ready")) {
      return { key: "listing", label: "出品準備を完了", role: "管理者" };
    }
    return { key: "done", label: "対応完了", role: "—" };
  };

  // レイヤー判定
  function getLayer(item: any) {
    const next = getNextAction(item.actionReasons || []);
    // レイヤー①: 管理者が今すぐ作業すべきSKU
    if (next.role === "管理者" && ["profit", "text", "ai"].includes(next.key)) {
      if (
        item.actionReasons?.includes("profit_not_ready") ||
        item.actionReasons?.includes("title_not_fixed") ||
        item.actionReasons?.includes("condition_missing") ||
        item.actionReasons?.includes("ai_not_generated")
      ) return 1;
    }
    // レイヤー②: 外注待ちSKU
    if (next.role === "外注" && (item.actionReasons?.every(r => r === "image_insufficient" || r === "image_missing"))) {
      return 2;
    }
    // レイヤー③: 管理者の軽作業SKU
    if (next.role === "管理者" && (item.actionReasons?.includes("ai_outdated") || item.actionReasons?.includes("listing_not_ready") || item.actionReasons?.includes("minor_text_fix"))) {
      return 3;
    }
    // レイヤー④: 出品可能SKU
    if (item.listing_status === true && (!item.actionReasons || item.actionReasons.length === 0) && item.status !== "done") {
      return 4;
    }
    // レイヤー⑤: 完了・保管SKU
    if (item.status === "done") return 5;
    // その他
    return 99;
  }

  // ソート関数
  function sortSkus(a: any, b: any) {
    const la = getLayer(a);
    const lb = getLayer(b);
    if (la !== lb) return la - lb;
    // レイヤー内: Next Actionの重さ
    const keyOrder = ["profit", "text", "ai", "listing", "image", "done"];
    const na = getNextAction(a.actionReasons || []);
    const nb = getNextAction(b.actionReasons || []);
    if (na.key !== nb.key) return keyOrder.indexOf(na.key) - keyOrder.indexOf(nb.key);
    // 要対応数が多い順
    const ac = a.actionReasons?.length || 0;
    const bc = b.actionReasons?.length || 0;
    if (ac !== bc) return bc - ac;
    // 作成日が古い順
    const ad = a.created_at || "";
    const bd = b.created_at || "";
    if (ad !== bd) return ad.localeCompare(bd);
    return 0;
  }

  // 検索・フィルタ適用＋ソート
  let filtered = itemsWithAction.filter((item) => {
    const rawTitle = item.title || (item as any).jp_title || "";
    const brand = (item as any).brand || "";
    const model = (item as any).model || "";
    
    const searchLower = searchQuery.toLowerCase();
    const keywordMatch = searchQuery === "" ||
      item.sku.toLowerCase().includes(searchLower) ||
      rawTitle.toLowerCase().includes(searchLower) ||
      brand.toLowerCase().includes(searchLower) ||
      model.toLowerCase().includes(searchLower);
    
    const statusMatch = statusFilter === "all" || item.status === statusFilter;
    return keywordMatch && statusMatch;
  });
  
  if (showOnlyNeedsAction) {
    filtered = filtered.filter(item => item.needsAction);
  }

  // ソート適用
  filtered = filtered.sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case "updated":
        comparison = (b.updated_at || b.created_at || "").localeCompare(a.updated_at || a.created_at || "");
        break;
      case "created":
        comparison = (b.created_at || "").localeCompare(a.created_at || "");
        break;
      case "profit":
        const profitA = (a as any).profit_rate ?? 0;
        const profitB = (b as any).profit_rate ?? 0;
        comparison = profitB - profitA;
        break;
      case "image":
        comparison = (b.imageCount ?? 0) - (a.imageCount ?? 0);
        break;
      default:
        comparison = 0;
    }
    
    return sortOrder === "desc" ? comparison : -comparison;
  });

  // 出品可能SKU数をカウント（CSV/ZIP用）
  const listableSkus = itemsWithAction.filter((item) => {
    // API と同じ判定条件を使用
    const hasEnoughImages = (item.imageCount ?? 0) >= 7;
    const hasTitle = (item.title || (item as any).title_optimized || "").trim() !== "";
    const hasDescription = ((item as any).description || (item as any).ai_description || "").trim() !== "";
    const hasUSD = typeof (item as any).sale_price_usd === 'number' && (item as any).sale_price_usd > 0;
    const hasJPY = typeof (item as any).sale_price_jpy === 'number' && (item as any).sale_price_jpy > 0;
    const hasPrice = hasUSD || hasJPY;
    // カテゴリID判定（新→旧→旧）
    const categoryId =
      typeof (item as any).ebay_category_id === 'number'
        ? (item as any).ebay_category_id
        : typeof (item as any).ebay_category === 'string'
          ? Number((item as any).ebay_category)
          : typeof (item as any).category_id === 'number'
            ? (item as any).category_id
            : 0;
    const hasCategoryId = typeof categoryId === 'number' && categoryId > 0;
    const condition = (item as any).sku_condition || item.condition;
    const hasCondition = condition && condition !== "none" && condition !== "unset";
    return hasEnoughImages && hasTitle && hasDescription && hasPrice && hasCategoryId && hasCondition;
  });
  const listableCount = listableSkus.length;
  
  // 出品可能SKUの画像総枚数をカウント
  const totalListingImages = listableSkus.reduce((sum, item) => sum + (item.imageCount ?? 0), 0);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/sku-list");
        let data: any = [];
        try {
          data = await res.json();
        } catch (jsonErr) {
          data = [];
        }
        if (!Array.isArray(data)) {
          setFetchError(data?.error || "データ取得エラー");
          data = [];
        } else {
          setFetchError(null);
        }
        setItems(data);
      } catch (e: any) {
        setFetchError(e?.message || "データ取得エラー");
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (fetchError) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center text-red-600">
        データ取得エラー: {fetchError}
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-[#18181b] p-6 max-w-7xl mx-auto">
      {/* トースト通知 */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-2xl border-2 animate-slide-in ${
            toast.type === "success"
              ? "bg-emerald-900 border-emerald-600 text-emerald-100"
              : toast.type === "warning"
              ? "bg-yellow-900 border-yellow-600 text-yellow-100"
              : "bg-red-900 border-red-600 text-red-100"
          }`}
          style={{ maxWidth: "400px" }}
        >
          <pre className="whitespace-pre-wrap font-sans text-sm">{toast.message}</pre>
        </div>
      )}
      {/* ヘッダー操作エリア */}
      <div className="mb-1 flex items-start justify-between gap-6">
        {/* 左カラム */}
        <div className="flex-1 py-2">
          <h1 className="text-2xl font-bold text-white leading-tight">SKU管理</h1>
          <div className="text-sm text-gray-400 leading-tight">作業が必要なSKUを管理します</div>
        </div>
        
        {/* 右側：削除/ボタングループ */}
        <div className="flex gap-2 items-start flex-wrap justify-end">
          {selectedIds.length > 0 && (
            <button
              className="px-4 py-2 bg-red-700 text-white rounded font-bold hover:bg-red-800 border border-red-800"
              onClick={handleDeleteSelected}
              disabled={loading}
            >
              {selectedIds.length}件を削除
            </button>
          )}
          <button
            className={`px-4 py-2 rounded font-bold border transition ${!showDeleted ? "bg-blue-700 text-white border-blue-700" : "bg-gray-700 text-gray-200 border-gray-600"}`}
            onClick={() => setShowDeleted(false)}
          >
            有効SKU
          </button>
          <button
            className={`px-4 py-2 rounded font-bold border transition ${showDeleted ? "bg-blue-700 text-white border-blue-700" : "bg-gray-700 text-gray-200 border-gray-600"}`}
            onClick={() => { setShowDeleted(true); loadDeleted(); }}
          >
            削除済み
          </button>
          <a href="/" className="px-4 py-2 bg-gray-700 text-white rounded font-bold hover:bg-gray-600 border border-gray-600 transition">ホームへ戻る</a>
          {isAdmin && (
            <>
              <SkuAutoCreateButton onCreated={() => {
                // SKU生成後に一覧をリロード
                setLoading(true);
                setTimeout(() => {
                  // 既存のload()ロジックを再利用
                  (async () => {
                    try {
                      const res = await fetch("/api/sku-list");
                      let data: any = [];
                      try {
                        data = await res.json();
                      } catch (jsonErr) {
                        data = [];
                      }
                      if (!Array.isArray(data)) {
                        setFetchError(data?.error || "データ取得エラー");
                        data = [];
                      } else {
                        setFetchError(null);
                      }
                      setItems(data);
                    } catch (e: any) {
                      setFetchError(e?.message || "データ取得エラー");
                      setItems([]);
                    } finally {
                      setLoading(false);
                    }
                  })();
                }, 500); // 反映待ちのため少し遅延
              }} />
              <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
                {/* アコーディオンヘッダー */}
                <button
                  className="w-full flex items-center justify-between px-4 py-2 text-sm font-bold text-cyan-300 hover:bg-slate-700/50"
                  onClick={() => setExportOpen((v) => !v)}
                  aria-expanded={exportOpen}
                  title="eBay一括出品（最終ステップ）を開閉"
                >
                  <span>🚀 eBay一括出品（最終ステップ）</span>
                  <span className="text-slate-300">{exportOpen ? "▲" : "▼"}</span>
                </button>

                {exportOpen && (
                  <div className="p-4 pt-2 flex flex-col gap-2">
                    {/* ✅ F-3: 出品プレビューボタン */}
                    <button
                      className="px-4 py-3 rounded-xl font-bold border border-blue-600 bg-blue-900/30 text-blue-200 hover:bg-blue-800/50 transition text-left flex items-center justify-between"
                      onClick={() => setPreviewOpen(true)}
                      title="出力前にOK/NGを確認できます"
                    >
                      <span>
                        <span className="font-bold">🔍</span> 出品プレビュー 
                        <span className="text-xs ml-2 opacity-90">出力前確認</span>
                      </span>
                      <span className="text-sm font-semibold">OK/NG確認 →</span>
                    </button>

                    {/* 縦配置: 手順順 */}
                    <div className="flex flex-col gap-2">
                      {/* ① CSV出力ボタン */}
                      <button
                        className={`px-4 py-3 rounded font-bold border transition text-left flex items-center justify-between ${
                          listableCount > 0
                            ? "bg-emerald-700 text-white border-emerald-800 hover:bg-emerald-800"
                            : "bg-gray-600 text-gray-300 border-gray-700 cursor-not-allowed"
                        }`}
                        disabled={listableCount === 0}
                        title="商品情報（テキスト・価格・カテゴリなど）をCSV形式で出力。"
                        onClick={async () => {
                          try {
                            const res = await fetch("/api/export-ebay-csv?format=json");
                            const data = await res.json();
                            if (!res.ok || data.error) {
                              if (data.error === "MISSING_REQUIRED_FIELDS" && data.missing) {
                                const missingList = data.missing
                                  .map((m: any) => `・${m.sku}：${m.reason}`)
                                  .join("\\n");
                                showToast(
                                  `❌ CSV出力できません（必須項目不足）\\n\\n${missingList}\\n\\n→ SKU編集画面でカテゴリを選択してください`,
                                  "error"
                                );
                              } else {
                                showToast(data.error || data.message || "CSV出力に失敗しました", "error");
                              }
                              return;
                            }
                            if (data.listableCount === 0) {
                              showToast("⚠ 出品可能なSKUがありません", "warning");
                              return;
                            }
                            const csvRes = await fetch("/api/export-ebay-csv?format=csv");
                            const blob = await csvRes.blob();
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `ebay-listings-${new Date().toISOString().slice(0, 10)}.csv`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                            showToast(
                              `✅ CSV を出力しました\\n・SKU数：${data.listableCount}`,
                              "success"
                            );
                          } catch (e) {
                            showToast("CSV出力エラー: " + String(e), "error");
                          }
                        }}
                      >
                        <span>
                          <span className="font-bold">①</span> CSV出力 
                          <span className="text-xs ml-2 opacity-90">商品情報</span>
                          {listableCount === 0 && <span className="ml-2">🔒</span>}
                        </span>
                        <span className="text-sm font-semibold">{listableCount}件</span>
                      </button>

                      {/* ② ZIP出力ボタン */}
                      <button
                        className={`px-4 py-3 rounded font-bold border transition text-left flex items-center justify-between ${
                          listableCount > 0
                            ? "bg-purple-700 text-white border-purple-800 hover:bg-purple-800"
                            : "bg-gray-600 text-gray-300 border-gray-700 cursor-not-allowed"
                        }`}
                        disabled={listableCount === 0}
                        title="商品の画像をZIP化します。ファイル名規則：SKU_01.jpg, SKU_02.jpg..."
                        onClick={async () => {
                          try {
                            const res = await fetch("/api/export-ebay-images");
                            if (!res.ok) {
                              const data = await res.json().catch(() => ({}));
                              if (data.error === "MISSING_REQUIRED_FIELDS" && data.missing) {
                                const missingList = data.missing
                                  .map((m: any) => `・${m.sku}：${m.reason}`)
                                  .join("\\n");
                                showToast(
                                  `❌ 画像ZIP出力できません（必須項目不足）\\n\\n${missingList}\\n\\n→ SKU編集画面でカテゴリを選択してください`,
                                  "error"
                                );
                              } else {
                                showToast(data.error || "画像ZIP出力に失敗しました", "error");
                              }
                              return;
                            }
                            const blob = await res.blob();
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `ebay-images-${new Date().toISOString().slice(0, 10)}.zip`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                            showToast(
                              `✅ ZIP を出力しました\n・SKU数：${listableCount}`,
                              "success"
                            );
                          } catch (e) {
                            showToast("ZIP出力エラー: " + String(e), "error");
                          }
                        }}
                      >
                        <span>
                          <span className="font-bold">②</span> 画像ZIP出力
                          <span className="text-xs ml-2 opacity-90">商品画像</span>
                          {listableCount === 0 && <span className="ml-2">🔒</span>}
                        </span>
                        <span className="text-sm font-semibold">{listableCount}SKU / {totalListingImages}枚</span>
                      </button>
                    </div>

                    {/* シンプルな注記（1行） */}
                    <p className="text-xs text-gray-400 border-t border-gray-700 pt-2 mt-2">
                      ※ eBay出品は① → ②の順で行ってください
                    </p>
                    
                    {/* 将来用の余白 */}
                    <p className="text-xs text-gray-500 italic">
                      将来：eBay出品セット自動生成予定
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 検索・フィルタ・並び替え */}
      <div className="space-y-2 mt-1">
        {/* 検索バー */}
        <div>
          <input
            type="text"
            className="w-full px-4 py-2 rounded bg-[#23232a] text-white placeholder-gray-400 border border-gray-700 focus:border-blue-500 outline-none"
            placeholder="🔍 SKU / タイトル / ブランド / 型番 で検索"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* ステータス & オプションフィルタ（凡例を右端に内包） */}
        <div className="flex gap-2 flex-wrap items-center">
          {filterButtons.map((s) => (
            <button
              key={s.key}
              className={`px-3 py-1 rounded-md text-sm border transition ${
                statusFilter === s.key
                  ? "bg-blue-700 text-white border-blue-700"
                  : "bg-gray-700 text-gray-200 border-gray-600 hover:bg-gray-600"
              }`}
              onClick={() => setStatusFilter(s.key as any)}
            >
              {s.label}
            </button>
          ))}
          <label className="ml-4 flex items-center gap-1 text-xs cursor-pointer select-none text-gray-300">
            <input
              type="checkbox"
              className="accent-blue-600"
              checked={showOnlyNeedsAction}
              onChange={(e) => setShowOnlyNeedsAction(e.target.checked)}
            />
            要対応SKUのみ表示
          </label>
          {/* 📌 凡例（フィルタ行右端・簡略版） */}
          <div className="ml-auto hidden md:flex items-center gap-2 flex-wrap justify-end">
            <span className="text-xs text-gray-500 font-semibold">要対応の見方:</span>
            <div className="flex gap-1.5 flex-wrap justify-end">
              <div className="px-2 py-1 bg-red-900/30 border border-red-700 rounded-full text-xs text-red-300 font-semibold whitespace-nowrap" title="未対応（要対応の赤）">
                🔴 未対応
              </div>
              <div className="px-2 py-1 bg-green-900/30 border border-green-700 rounded-full text-xs text-green-300 font-semibold whitespace-nowrap" title="対応済み（OKの緑）">
                🟢 OK
              </div>
            </div>
          </div>
        </div>

        {/* 並び替え */}
        <div className="flex gap-2 items-center flex-wrap text-sm">
          <span className="text-gray-400">並び替え:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2 py-1 rounded bg-gray-700 text-white text-sm border border-gray-600"
          >
            <option value="updated">更新日（新しい順）</option>
            <option value="created">作成日（新しい順）</option>
            <option value="profit">利益率（高い順）</option>
            <option value="image">画像枚数（多い順）</option>
          </select>
        </div>
      </div>
      {/* 新しい管理者用SKUカードUI */}
      {!showDeleted ? (
        <div className="mt-3">
          <div className="bg-[#23232a] rounded-2xl shadow-lg border border-gray-800 p-4">
            <CardUI items={filtered} selectedIds={selectedIds} onSelect={handleSelect} />
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <div className="bg-[#23232a] rounded-2xl shadow-lg border border-gray-800 p-4">
            {loadingDeleted ? (
              <div className="text-white">読み込み中...</div>
            ) : (
              <>
                {deletedItems.length === 0 ? (
                  <div className="text-gray-400">削除済みSKUはありません</div>
                ) : (
                  <CardUI
                    items={deletedItems}
                    selectedIds={[]}
                    onSelect={undefined}
                    onRestore={async (id: string) => {
                      await fetch(`/api/sku-restore/${id}`, { method: "POST" });
                      loadDeleted();
                    }}
                    onPurge={async (id: string) => {
                      await fetch(`/api/delete-sku/${id}`, { method: "DELETE" });
                      loadDeleted();
                    }}
                  />
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ✅ F-3: プレビューモーダル追加 */}
      <EbayExportPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        mode="ready_only"
        onExportCsv={async () => {
          try {
            const res = await fetch("/api/export-ebay-csv?format=json");
            const data = await res.json();
            if (!res.ok || data.error) {
              if (data.error === "MISSING_REQUIRED_FIELDS" && data.missing) {
                const missingList = data.missing
                  .map((m: any) => `・${m.sku}：${m.reason}`)
                  .join("\\n");
                showToast(
                  `❌ CSV出力できません（必須項目不足）\\n\\n${missingList}\\n\\n→ SKU編集画面でカテゴリを選択してください`,
                  "error"
                );
              } else {
                showToast(data.error || data.message || "CSV出力に失敗しました", "error");
              }
              return;
            }
            if (data.listableCount === 0) {
              showToast("⚠ 出品可能なSKUがありません", "warning");
              return;
            }
            const csvRes = await fetch("/api/export-ebay-csv?format=csv");
            const blob = await csvRes.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `ebay-listings-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast(`✅ CSV を出力しました\\n・SKU数：${data.listableCount}`, "success");
          } catch (e) {
            showToast("CSV出力エラー: " + String(e), "error");
          }
        }}
        onExportZip={async () => {
          try {
            const res = await fetch("/api/export-ebay-images");
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              if (data.error === "MISSING_REQUIRED_FIELDS" && data.missing) {
                const missingList = data.missing
                  .map((m: any) => `・${m.sku}：${m.reason}`)
                  .join("\\n");
                showToast(
                  `❌ 画像ZIP出力できません（必須項目不足）\\n\\n${missingList}\\n\\n→ SKU編集画面でカテゴリを選択してください`,
                  "error"
                );
              } else {
                showToast(data.error || "画像ZIP出力に失敗しました", "error");
              }
              return;
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `ebay-images-${new Date().toISOString().slice(0, 10)}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast(`✅ ZIP を出力しました`, "success");
          } catch (e) {
            showToast("ZIP出力エラー: " + String(e), "error");
          }
        }}
      />
    </div>
  );
}



