"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type SkuStatus = "shooting" | "editing" | "listing" | "done" | "none";

type SkuDetail = {
  id: string;
  sku: string;
  title: string | null;
  status: SkuStatus | null;
  created_at: string;
  genre?: string | null;
  brand?: string | null;
  model?: string | null;
  color?: string | null;
  condition?: string | null;
  ebay_category?: string | null;
  title_optimized?: string | null;
  description?: string | null;
  item_specifics?: Record<string, string> | null;
  ai_extracted_at?: string | null;
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

export default function SkuDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [sku, setSku] = useState<SkuDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await fetch(`/api/sku/${id}`);
        const data = await res.json();
        setSku(data);
      } catch (error) {
        console.error("Failed to fetch SKU:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-2xl">読み込み中...</div>
      </div>
    );
  }

  if (!sku) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl mb-4">SKUが見つかりません</p>
          <Link href="/sku" className="text-blue-400 hover:text-blue-300">
            SKU一覧に戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* ヘッダー */}
      <div className="bg-slate-950 border-b border-slate-700">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">{sku.sku}</h1>
              <p className="text-slate-400 text-sm mt-1">{sku.title || "（未設定）"}</p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/"
                className="px-4 py-2 bg-slate-700 rounded hover:bg-slate-600 font-semibold"
              >
                ⬅️ ホームに戻る
              </Link>
              <Link
                href={`/sku/${id}/edit`}
                className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 font-semibold"
              >
                ✏️ 編集
              </Link>
              <Link
                href="/sku"
                className="px-4 py-2 bg-slate-700 rounded hover:bg-slate-600 font-semibold"
              >
                一覧に戻る
              </Link>
            </div>
          </div>

          {/* 基本情報 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-800 p-4 rounded">
              <p className="text-slate-400 text-sm mb-1">ステータス</p>
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    STATUS_COLOR[sku.status ?? "none"]
                  }`}
                />
                <span className="font-semibold">{STATUS_LABEL[sku.status ?? "none"]}</span>
              </div>
            </div>
            <div className="bg-slate-800 p-4 rounded">
              <p className="text-slate-400 text-sm mb-1">作成日</p>
              <p className="font-semibold">
                {new Date(sku.created_at).toLocaleDateString("ja-JP")}
              </p>
            </div>
            <div className="bg-slate-800 p-4 rounded">
              <p className="text-slate-400 text-sm mb-1">AI抽出</p>
              <p className="font-semibold">
                {sku.ai_extracted_at ? "✅ 完了" : "❌ 未実行"}
              </p>
            </div>
            <div className="bg-slate-800 p-4 rounded">
              <p className="text-slate-400 text-sm mb-1">ジャンル</p>
              <p className="font-semibold">{sku.genre || "—"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左カラム：商品情報 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 基本商品情報 */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">📦 商品情報</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-400 text-sm mb-1">ブランド</p>
                  <p className="font-semibold text-lg">{sku.brand || "—"}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-1">型番</p>
                  <p className="font-semibold text-lg">{sku.model || "—"}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-1">色</p>
                  <p className="font-semibold text-lg">{sku.color || "—"}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-1">状態</p>
                  <p className="font-semibold text-lg">{sku.condition || "—"}</p>
                </div>
              </div>
            </div>

            {/* eBay情報 */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">🌐 eBay情報</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-slate-400 text-sm mb-1">カテゴリ番号</p>
                  <p className="font-semibold text-lg">{sku.ebay_category || "—"}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-2">タイトル</p>
                  <p className="bg-slate-700 p-3 rounded text-white">
                    {sku.title_optimized || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-2">説明文</p>
                  <p className="bg-slate-700 p-3 rounded text-white whitespace-pre-wrap">
                    {sku.description || "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Item Specifics */}
            {sku.item_specifics && Object.keys(sku.item_specifics).length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">🏷️ Item Specifics</h2>
                <div className="space-y-2">
                  {Object.entries(sku.item_specifics).map(([key, value]) => (
                    <div key={key} className="flex justify-between bg-slate-700 p-3 rounded">
                      <span className="text-slate-300">{key}:</span>
                      <span className="font-semibold">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 右カラム：サマリー */}
          <div className="space-y-6">
            {/* クイックアクション */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4">⚡ クイックアクション</h3>
              <div className="space-y-3">
                <Link
                  href={`/sku/${id}/edit`}
                  className="block w-full px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 font-semibold text-center"
                >
                  ✏️ 商品情報を編集
                </Link>
                <a
                  href={`/upload?sku=${sku.sku}`}
                  className="block w-full px-4 py-2 bg-purple-600 rounded hover:bg-purple-700 font-semibold text-center"
                >
                  📸 画像をアップロード
                </a>
                <a
                  href={`/sku/customize?id=${id}`}
                  className="block w-full px-4 py-2 bg-purple-600 rounded hover:bg-purple-700 font-semibold text-center"
                >
                  🤖 AI生成・プレビュー
                </a>
              </div>
            </div>

            {/* システムメモ */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4">📝 このページについて</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                このページは<strong>閲覧専用</strong>です。商品情報の編集はエディットページで行ってください。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
