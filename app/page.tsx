"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* ナビゲーション */}
      <nav className="bg-slate-950 border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-white">📸 E-NEXUS Photo Uploader</h1>
        </div>
      </nav>

      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* メインサイトへのメニュー */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8">🎯 メインシステムメニュー</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* SKU管理 */}
            <a
              href="https://e-nexus-photo-uploader.vercel.app/sku"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 rounded-xl text-white hover:shadow-2xl transition transform hover:scale-105 cursor-pointer"
            >
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-xl font-bold mb-2">SKU管理</h3>
              <p className="text-sm text-blue-100">SKU一覧・検索・削除・状態管理</p>
            </a>

            {/* AI管理 */}
            <a
              href="https://e-nexus-photo-uploader.vercel.app/sku/customize"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gradient-to-br from-purple-600 to-purple-800 p-8 rounded-xl text-white hover:shadow-2xl transition transform hover:scale-105 cursor-pointer"
            >
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="text-xl font-bold mb-2">AI管理</h3>
              <p className="text-sm text-purple-100">商品情報抽出・AI生成・プレビュー</p>
            </a>

            {/* 在庫 */}
            <a
              href="https://e-nexus-photo-uploader.vercel.app/inventory"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gradient-to-br from-green-600 to-green-800 p-8 rounded-xl text-white hover:shadow-2xl transition transform hover:scale-105 cursor-pointer"
            >
              <div className="text-4xl mb-4">📦</div>
              <h3 className="text-xl font-bold mb-2">在庫管理</h3>
              <p className="text-sm text-green-100">在庫数・発送準備・統計</p>
            </a>

            {/* 発送準備 */}
            <a
              href="https://e-nexus-photo-uploader.vercel.app/shipping"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gradient-to-br from-orange-600 to-orange-800 p-8 rounded-xl text-white hover:shadow-2xl transition transform hover:scale-105 cursor-pointer"
            >
              <div className="text-4xl mb-4">🚚</div>
              <h3 className="text-xl font-bold mb-2">発送準備</h3>
              <p className="text-sm text-orange-100">ラベル生成・梱包チェック</p>
            </a>
          </div>
        </section>

        {/* 区切り線 */}
        <hr className="border-slate-700 my-16" />

        {/* 外注メニュー */}
        <section>
          <h2 className="text-3xl font-bold text-white mb-8">👥 外注メニュー（ローカル）</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 撮影 */}
            <a
              href="http://localhost:3000/outsourcing"
              className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 rounded-xl text-white hover:shadow-2xl transition transform hover:scale-105 cursor-pointer"
            >
              <div className="text-4xl mb-4">📷</div>
              <h3 className="text-xl font-bold mb-2">撮影</h3>
              <p className="text-sm text-indigo-100">撮影待ちSKU・完了報告</p>
            </a>

            {/* 画像アップロード */}
            <a
              href="http://localhost:3000/upload"
              className="bg-gradient-to-br from-cyan-600 to-cyan-800 p-8 rounded-xl text-white hover:shadow-2xl transition transform hover:scale-105 cursor-pointer"
            >
              <div className="text-4xl mb-4">☁️</div>
              <h3 className="text-xl font-bold mb-2">画像アップロード</h3>
              <p className="text-sm text-cyan-100">RAW / Edited / Listing 画像アップロード</p>
            </a>

            {/* マニュアル */}
            <a
              href="http://localhost:3000/manual"
              className="bg-gradient-to-br from-red-600 to-red-800 p-8 rounded-xl text-white hover:shadow-2xl transition transform hover:scale-105 cursor-pointer"
            >
              <div className="text-4xl mb-4">📖</div>
              <h3 className="text-xl font-bold mb-2">マニュアル</h3>
              <p className="text-sm text-red-100">使い方・ガイド・よくある質問</p>
            </a>
          </div>
        </section>

        {/* システム情報 */}
        <section className="mt-16 p-8 bg-slate-800 rounded-xl border border-slate-700">
          <h3 className="text-xl font-bold text-white mb-4">💡 システム情報</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-slate-300">
            <div>
              <p className="text-slate-400 mb-1">API レディ</p>
              <p className="text-green-400 font-semibold">✅ GPT-4 Vision</p>
            </div>
            <div>
              <p className="text-slate-400 mb-1">ストレージ</p>
              <p className="text-green-400 font-semibold">✅ Supabase</p>
            </div>
            <div>
              <p className="text-slate-400 mb-1">データベース</p>
              <p className="text-green-400 font-semibold">✅ PostgreSQL</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
