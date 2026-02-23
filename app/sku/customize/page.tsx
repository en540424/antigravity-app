"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// 切替可能なUIコンポーネント
import CardUI from "../sku-manager/ui/card";
import SimpleUI from "../sku-manager/ui/simple";
import CompactUI from "../sku-manager/ui/compact";
import FlatUI from "../sku-manager/ui/flat";
import FullCardUI from "../sku-manager/ui/full-card";
import HightechUI from "../sku-manager/ui/hightech";
import MobileUI from "../sku-manager/ui/mobile";
import CurrentUI from "../sku-manager/ui/current";
import TechDarkUI from "../sku-manager/ui/techDark";

// SKU型
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
  none: "未設定",
};

const UI_COMPONENTS = [
  { key: "card", label: "Card", icon: "🃏" },
  { key: "simple", label: "Simple", icon: "📄" },
  { key: "compact", label: "Compact", icon: "📋" },
  { key: "flat", label: "Flat", icon: "▫️" },
  { key: "full", label: "Full Card", icon: "🧾" },
  { key: "hightech", label: "Hightech", icon: "🤖" },
  { key: "mobile", label: "Mobile", icon: "📱" },
  { key: "current", label: "Current", icon: "🔁" },
  { key: "techdark", label: "Tech Dark", icon: "🌑" },
];

// 編集モーダルの状態
type EditingItem = {
  id: string;
  sku: string;
  title: string | null;
  status: SkuStatus | null;
  notes: string | null;  // ユーザー補足情報
  // AI抽出された商品情報
  genre?: string | null;
  brand?: string | null;
  model?: string | null;
  color?: string | null;
  condition?: string | null;
  // eBayカテゴリ（新→旧→旧）
  ebay_category_id?: number | null;
  ebay_category?: string | null;
  category_id?: number | null;
  title_optimized?: string | null;
  description?: string | null;
  item_specifics?: Record<string, string> | null;
};

export default function CustomizePage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<string>("card");
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<SkuItem[]>([]);
  const [keyword, setKeyword] = useState("");
  const [filter, setFilter] = useState<SkuStatus | "all">("all");
  
  // 編集モーダル用
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [imageInfo, setImageInfo] = useState<any>(null);
  const [imagesReady, setImagesReady] = useState(false);
  const [autoExtracting, setAutoExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);

  // サーバーから現在の表示モードを読み込み
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/settings/view-mode");
        if (res.ok) {
          const json = await res.json();
          if (json?.viewMode && json.viewMode !== "builtin") {
            setViewMode(json.viewMode as string);
          }
        }
      } catch (e) {
        // ignore
      }

      try {
        const v = localStorage.getItem("sku_view_mode");
        if (v && v !== "builtin") setViewMode(v);
      } catch (e) {
        // ignore
      }

      setLoading(false);
    };

    load();
  }, []);

  // SKU一覧取得
  const fetchList = async () => {
    const res = await fetch("/api/sku-list");
    const json = await res.json();
    setList(json);
  };

  useEffect(() => {
    fetchList();
  }, []);

  // viewModeをlocalStorageに保存
  useEffect(() => {
    try {
      localStorage.setItem("sku_view_mode", viewMode);
    } catch (e) {
      // ignore
    }
  }, [viewMode]);

  // viewMode が変更されたらサーバーに保存
  useEffect(() => {
    const save = async () => {
      try {
        const res = await fetch("/api/settings/view-mode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ viewMode }),
        });

        try {
          const json = await res.json();
          if (json && json.persisted === false) {
            console.warn("Server did not persist viewMode (missing table?)");
          }
        } catch (e) {
          // ignore JSON parse
        }
      } catch (e) {
        // ignore
      }
    };
    save();
  }, [viewMode]);

  const renderComponent = () => {
    switch (viewMode) {
      case "card":
        return <CardUI items={filteredList} />;
      case "simple":
        return <SimpleUI onEdit={handleEditClick} />;
      case "compact":
        return <CompactUI onEdit={handleEditClick} />;
      case "flat":
        return <FlatUI onEdit={handleEditClick} />;
      case "full":
        return <FullCardUI onEdit={handleEditClick} />;
      case "hightech":
        return <HightechUI onEdit={handleEditClick} />;
      case "mobile":
        return <MobileUI onEdit={handleEditClick} />;
      case "current":
        return <CurrentUI onEdit={handleEditClick} />;
      case "techdark":
        return <TechDarkUI onEdit={handleEditClick} />;
      default:
        return <CardUI items={filteredList} />;
    }
  };

  // SKU自動生成
  const generateSKU = async () => {
    const res = await fetch("/api/sku-create", { method: "POST" });
    if (!res.ok) return alert("SKU作成に失敗しました");

    await fetchList();
  };

  // SKU編集
  const handleEditClick = async (item: SkuItem) => {
    setEditingItem({
      id: item.id,
      sku: item.sku,
      title: item.title,
      status: item.status,
      notes: null,
    });
    
    setExtractionError(null);
    
    // SKU の画像情報を取得
    try {
      const res = await fetch(`/api/sku-images?sku=${encodeURIComponent(item.sku)}`);
      if (res.ok) {
        const data = await res.json();
        setImageInfo(data.imageInfo);
        setImagesReady(data.isComplete);
      }
    } catch (e) {
      console.error("画像情報取得エラー:", e);
    }

    // RAW フォルダから画像を取得して自動抽出
    if (imagesReady) {
      await handleAutoExtractProduct(item.sku);
    }
  };

  // 商品情報を自動抽出する
  const handleAutoExtractProduct = async (sku: string) => {
    setAutoExtracting(true);
    setExtractionError(null);

    try {
      const res = await fetch("/api/auto-extract-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        setExtractionError(errorData.error || "自動抽出に失敗しました");
        setAutoExtracting(false);
        return;
      }

      const data = await res.json();
      const { extractedInfo } = data;

      // 抽出された情報を editingItem に反映
      setEditingItem((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          genre: extractedInfo.genre,
          brand: extractedInfo.brand,
          model: extractedInfo.model,
          color: extractedInfo.color,
          condition: extractedInfo.condition,
          title_optimized: extractedInfo.title_optimized,
          description: extractedInfo.description,
          item_specifics: extractedInfo.item_specifics,
          // タイトルも自動抽出された最適化版で更新
          title: extractedInfo.title_optimized,
        };
      });
    } catch (e) {
      console.error("自動抽出エラー:", e);
      setExtractionError("自動抽出処理中にエラーが発生しました");
    } finally {
      setAutoExtracting(false);
    }
  };

  const handleEditSave = async () => {
    if (!editingItem) return;

    if (!editingItem.sku.trim()) {
      return alert("SKUは空にできません");
    }

    setEditLoading(true);

    const res = await fetch("/api/sku-edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingItem.id,
        newSku: editingItem.sku,
        newTitle: editingItem.title,
        newStatus: editingItem.status,
        // AI抽出されたメタデータも保存
        genre: editingItem.genre,
        brand: editingItem.brand,
        model: editingItem.model,
        color: editingItem.color,
        condition: editingItem.condition,
        ebay_category_id: editingItem.ebay_category_id ?? null,
        title_optimized: editingItem.title_optimized,
        description: editingItem.description,
        item_specifics: editingItem.item_specifics,
      }),
    });

    setEditLoading(false);

    if (!res.ok) {
      const error = await res.json();
      return alert(error.error || "更新に失敗しました");
    }

    setEditingItem(null);
    setImageInfo(null);
    setImagesReady(false);
    setExtractionError(null);
    await fetchList();
  };

  const handleEditCancel = () => {
    setEditingItem(null);
    setImageInfo(null);
    setImagesReady(false);
  };

  // AI 商品名自動生成（画像 + ユーザー補足情報を組み合わせ）
  const handleGenerateTitle = async () => {
    if (!editingItem?.sku) {
      alert("SKU を入力してください");
      return;
    }

    if (!imagesReady) {
      alert("画像がまだ揃っていません。RAW、Original、Listing の画像をアップロードしてください。");
      return;
    }

    setAiGenerating(true);

    try {
      // 画像情報とユーザー補足情報を組み合わせたプロンプト
      const imageDescription = `
      利用可能な画像:
      - RAW (未加工): ${imageInfo?.raw || 0} 枚
      - Original (元画像): ${imageInfo?.original || 0} 枚
      - Listing (出品用): ${imageInfo?.listing || 0} 枚
      `;
      
      const userNotes = editingItem.notes ? `\nユーザー補足情報: ${editingItem.notes}` : "";
      
      const prompt = `SKUコード "${editingItem.sku}" に対して以下の情報から適切な商品名を日本語で生成してください。${imageDescription}${userNotes}\n\n要件: 簡潔で、80文字以内の説明文です。`;

      const res = await fetch("/api/generate-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert(`AI 生成に失敗しました: ${errorData.error || "エラー"}`);
        setAiGenerating(false);
        return;
      }

      const data = await res.json();
      const generatedTitle = data.title || "";

      // 80文字を超えた場合は最初の80文字までを使用
      const truncatedTitle = generatedTitle.slice(0, 80);

      // 現在の編集中の item を保持しながら title だけ更新
      setEditingItem((prev) => {
        if (!prev) return null;
        return { ...prev, title: truncatedTitle };
      });
    } catch (e) {
      console.error("AI 生成エラー:", e);
      alert("AI 生成中にエラーが発生しました");
    } finally {
      setAiGenerating(false);
    }
  };

  // 絞り込み処理
  const filteredList = list.filter((item) => {
    const matchKeyword =
      item.sku.includes(keyword) ||
      (item.title ?? "").includes(keyword);

    const itemStatus = item.status ?? "none";
    const matchStatus =
      filter === "all" ? true : itemStatus === filter;

    return matchKeyword && matchStatus;
  });

  if (loading) {
    return <div className="p-4 text-white">読み込み中…</div>;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <div className="flex-shrink-0 bg-slate-900 py-3 px-4 border-b border-slate-700">
        <div className="max-w-6xl mx-auto">
          <div className="mb-2 flex justify-between items-center gap-2">
            <button
              onClick={() => router.back()}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 text-sm font-semibold"
            >
              ⬅️ 前に戻る
            </button>
            <Link
              href="/sku/sku-manager"
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 text-sm font-semibold"
            >
              📋 SKU管理画面
            </Link>
            <Link
              href="/"
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 text-sm font-semibold"
            >
              🏠 ホームに戻る
            </Link>
          </div>
          {/* ヘッダー */}
          <div className="mb-3">
            <h1 className="text-lg font-bold">表示スタイル</h1>
          </div>

          {/* UIセレクター */}
          <div className="mb-3">
            <div className="flex flex-wrap gap-1">
              {UI_COMPONENTS.map((component) => (
                <button
                  key={component.key}
                  onClick={() => setViewMode(component.key)}
                  title={component.label}
                  className={`py-1.5 px-1.5 rounded transition border text-xs flex flex-col items-center gap-0.5 ${
                    viewMode === component.key
                      ? "bg-blue-600 border-blue-400 text-white"
                      : "bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  <span className="text-sm leading-none">{component.icon}</span>
                  <span className="text-xs leading-tight font-semibold">{component.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ボタン行 */}
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              className="px-3 py-1 text-sm bg-blue-600 rounded hover:bg-blue-700"
              onClick={fetchList}
            >
              🔄 更新
            </button>

            <button
              className="px-3 py-1 text-sm bg-green-600 rounded hover:bg-green-700"
              onClick={generateSKU}
            >
              ➕ SKU自動生成
            </button>

            <Link href="/sku/sku-manager">
              <button
                className="px-3 py-1 text-sm bg-purple-600 rounded hover:bg-purple-700"
              >
                🎨 SKU管理へ
              </button>
            </Link>
          </div>

          {/* 検索 */}
          <input
            type="text"
            placeholder="SKU / 商品名で検索"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full p-2 mb-2 rounded bg-slate-800 text-sm"
          />

          {/* フィルター - ボタングループ */}
          <div className="flex flex-wrap gap-1 mb-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-2 py-1 rounded text-xs font-semibold transition ${
                filter === "all"
                  ? "bg-slate-400 text-black"
                  : "bg-slate-700 text-white hover:bg-slate-600"
              }`}
            >
              すべて
            </button>
            <button
              onClick={() => setFilter("shooting")}
              className={`px-2 py-1 rounded text-xs font-semibold transition ${
                filter === "shooting"
                  ? "bg-blue-700 text-white"
                  : "bg-slate-700 text-white hover:bg-slate-600"
              }`}
            >
              📷 撮影待ち
            </button>
            <button
              onClick={() => setFilter("editing")}
              className={`px-2 py-1 rounded text-xs font-semibold transition ${
                filter === "editing"
                  ? "bg-purple-700 text-white"
                  : "bg-slate-700 text-white hover:bg-slate-600"
              }`}
            >
              ✂️ 編集待ち
            </button>
            <button
              onClick={() => setFilter("listing")}
              className={`px-2 py-1 rounded text-xs font-semibold transition ${
                filter === "listing"
                  ? "bg-green-700 text-white"
                  : "bg-slate-700 text-white hover:bg-slate-600"
              }`}
            >
              🛒 出品待ち
            </button>
            <button
              onClick={() => setFilter("done")}
              className={`px-2 py-1 rounded text-xs font-semibold transition ${
                filter === "done"
                  ? "bg-gray-600 text-white"
                  : "bg-slate-700 text-white hover:bg-slate-600"
              }`}
            >
              🏁 完了
            </button>
            <button
              onClick={() => setFilter("none")}
              className={`px-2 py-1 rounded text-xs font-semibold transition ${
                filter === "none"
                  ? "bg-slate-600 text-white"
                  : "bg-slate-700 text-white hover:bg-slate-600"
              }`}
            >
              — 未設定 —
            </button>
          </div>
        </div>
      </div>

      {/* プレビュー */}
      <div className="flex-1 overflow-auto bg-slate-900 px-4">
        <div className="max-w-6xl mx-auto py-3">
          <div className="text-xs text-slate-400 mb-2">
            {filteredList.length}件表示
          </div>
          {renderComponent()}
        </div>
      </div>

      {/* 編集モーダル */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">SKU編集</h3>

            {/* SKU入力 */}
            <div className="mb-4">
              <label className="block text-sm mb-1">SKU</label>
              <input
                type="text"
                value={editingItem.sku}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, sku: e.target.value })
                }
                className="w-full p-2 rounded bg-slate-800"
              />
            </div>

            {/* タイトル入力 */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm">商品名</label>
                <span className={`text-sm font-semibold ${(editingItem.title || "").length > 80 ? "text-red-500" : "text-gray-400"}`}>
                  {(editingItem.title || "").length} / 80
                </span>
              </div>
              <textarea
                value={editingItem.title || ""}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, title: e.target.value || null })
                }
                className="w-full p-2 rounded bg-slate-800 text-white resize-none"
                rows={4}
              />
              
              {/* AI 自動生成ボタン */}
              <button
                onClick={handleGenerateTitle}
                disabled={aiGenerating || !editingItem.sku || !imagesReady}
                className="mt-2 px-3 py-1 text-sm bg-purple-600 rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {aiGenerating ? "生成中..." : "🤖 AI で自動生成"}
              </button>
              
              {(editingItem.title || "").length > 80 && (
                <p className="text-red-500 text-sm mt-2">⚠️ 80文字以内にしてください</p>
              )}
            </div>

            {/* 画像情報表示 */}
            {imageInfo && (
              <div className="mb-4 p-3 bg-slate-800 rounded text-sm">
                <h4 className="font-semibold mb-2">📸 画像情報</h4>
                <div className="space-y-1 text-xs text-gray-300">
                  <div>• RAW (未加工): {imageInfo?.raw || 0} 枚</div>
                  <div>• Original (元画像): {imageInfo?.original || 0} 枚</div>
                  <div>• Edited (編集): {imageInfo?.edited || 0} 枚</div>
                  <div>• Listing (出品用): {imageInfo?.listing || 0} 枚</div>
                </div>
                {!imagesReady && (
                  <p className="text-yellow-500 mt-2 text-xs font-semibold">
                    ⚠️ RAW、Original、Listing の画像が必要です
                  </p>
                )}
                {imagesReady && (
                  <p className="text-green-500 mt-2 text-xs font-semibold">
                    ✅ 画像が揃っています。AI自動生成が可能です
                  </p>
                )}
              </div>
            )}

            {/* ユーザー補足情報入力 */}
            <div className="mb-4">
              <label className="block text-sm mb-1">補足情報（AI生成の参考情報）</label>
              <textarea
                value={editingItem.notes || ""}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, notes: e.target.value || null })
                }
                className="w-full p-2 rounded bg-slate-800 text-white resize-none text-xs"
                rows={2}
                placeholder="例：ブランド名、特徴、用途など"
              />
            </div>

            {/* 自動抽出状態の表示 */}
            {autoExtracting && (
              <div className="mb-4 p-3 bg-blue-900 rounded text-sm text-blue-200">
                🔄 AI が画像を分析中です...
              </div>
            )}

            {extractionError && (
              <div className="mb-4 p-3 bg-red-900 rounded text-sm text-red-200">
                ⚠️ {extractionError}
              </div>
            )}

            {/* AI抽出されたメタデータ表示セクション */}
            {(editingItem.genre || editingItem.brand || editingItem.model) && (
              <div className="mb-4 p-4 bg-slate-800 rounded border border-slate-700">
                <h4 className="font-semibold mb-3 text-sm">🤖 AI が抽出した商品情報</h4>
                
                <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                  {/* ジャンル */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">商品ジャンル</label>
                    <input
                      type="text"
                      value={editingItem.genre || ""}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, genre: e.target.value })
                      }
                      className="w-full p-2 rounded bg-slate-700 text-white text-xs"
                    />
                  </div>
                  
                  {/* ブランド */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">ブランド</label>
                    <input
                      type="text"
                      value={editingItem.brand || ""}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, brand: e.target.value })
                      }
                      className="w-full p-2 rounded bg-slate-700 text-white text-xs"
                    />
                  </div>
                  
                  {/* 型番 */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">型番</label>
                    <input
                      type="text"
                      value={editingItem.model || ""}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, model: e.target.value })
                      }
                      className="w-full p-2 rounded bg-slate-700 text-white text-xs"
                    />
                  </div>
                  
                  {/* 色 */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">色</label>
                    <input
                      type="text"
                      value={editingItem.color || ""}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, color: e.target.value })
                      }
                      className="w-full p-2 rounded bg-slate-700 text-white text-xs"
                    />
                  </div>
                  
                  {/* 商品状態 */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">商品状態</label>
                    <input
                      type="text"
                      value={editingItem.condition || ""}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, condition: e.target.value })
                      }
                      className="w-full p-2 rounded bg-slate-700 text-white text-xs"
                    />
                  </div>
                  
                  {/* eBayカテゴリ */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">eBayカテゴリ番号</label>
                    <input
                      type="number"
                      value={editingItem.ebay_category_id ?? ""}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          ebay_category_id: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full p-2 rounded bg-slate-700 text-white text-xs"
                    />
                  </div>
                </div>

                {/* タイトル最適化 */}
                <div className="mb-3">
                  <label className="block text-xs text-gray-400 mb-1">eBay タイトル最適化</label>
                  <textarea
                    value={editingItem.title_optimized || ""}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, title_optimized: e.target.value })
                    }
                    className="w-full p-2 rounded bg-slate-700 text-white text-xs resize-none"
                    rows={2}
                  />
                </div>

                {/* 説明文 */}
                <div className="mb-3">
                  <label className="block text-xs text-gray-400 mb-1">商品説明</label>
                  <textarea
                    value={editingItem.description || ""}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, description: e.target.value })
                    }
                    className="w-full p-2 rounded bg-slate-700 text-white text-xs resize-none"
                    rows={3}
                  />
                </div>

                {/* Item Specifics */}
                {editingItem.item_specifics && Object.keys(editingItem.item_specifics).length > 0 && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-2 font-semibold">Item Specifics</label>
                    <div className="space-y-2 bg-slate-700 p-2 rounded">
                      {Object.entries(editingItem.item_specifics).map(([key, value]) => (
                        <div key={key} className="flex gap-2">
                          <span className="text-xs text-gray-300 w-24 flex-shrink-0">{key}:</span>
                          <input
                            type="text"
                            value={value}
                            onChange={(e) =>
                              setEditingItem({
                                ...editingItem,
                                item_specifics: {
                                  ...editingItem.item_specifics,
                                  [key]: e.target.value,
                                },
                              })
                            }
                            className="w-full p-1 rounded bg-slate-600 text-white text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ステータス選択 */}
            <div className="mb-6">
              <label className="block text-sm mb-1">ステータス</label>
              <select
                value={editingItem.status ?? "none"}
                onChange={(e) =>
                  setEditingItem({
                    ...editingItem,
                    status: e.target.value === "none" ? null : (e.target.value as SkuStatus),
                  })
                }
                className="w-full p-2 rounded bg-slate-800"
              >
                <option value="none">未設定</option>
                <option value="shooting">📷 撮影待ち</option>
                <option value="editing">✂️ 編集待ち</option>
                <option value="listing">🛒 出品待ち</option>
                <option value="done">🏁 完了</option>
              </select>
            </div>

            {/* ボタン */}
            <div className="flex gap-2">
              <button
                onClick={handleEditSave}
                disabled={editLoading || (editingItem.title || "").length > 80}
                className="flex-1 px-4 py-2 bg-green-600 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editLoading ? "保存中..." : "保存"}
              </button>
              <button
                onClick={handleEditCancel}
                className="flex-1 px-4 py-2 bg-gray-600 rounded hover:bg-gray-700"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
