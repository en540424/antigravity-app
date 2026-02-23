"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* ナビゲーション */}
      <nav className="bg-slate-950 border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-white">🏠 E-NEXUS Photo Manager</h1>
        </div>
      </nav>

      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* ポータル説明 */}
        <section className="mb-12 bg-slate-800 p-8 rounded-xl border border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-4">🎯 ようこそ</h2>
          <p className="text-slate-300 text-lg">
            E-NEXUS Photo Manager は、商品写真の管理と eBay 出品データ生成を一元化するシステムです。
            <br />
            あなた用とスタッフ用のメニューに分かれています。
          </p>
        </section>

        {/* あなた向けメニュー */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8">👤 あなた向けメニュー</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* SKU管理（一覧） */}
            <Link
              href="/sku/sku-manager"
              className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 rounded-xl text-white hover:shadow-2xl transition transform hover:scale-105 cursor-pointer block"
            >
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-xl font-bold mb-2">SKU管理</h3>
              <p className="text-sm text-blue-100 mb-4">
                すべてのSKUを一覧表示・検索・削除・新規生成
              </p>
              <ul className="text-xs text-blue-100 space-y-1">
                <li>✓ 一覧に徹する（編集はしない）</li>
                <li>✓ 状態フィルタ可能</li>
                <li>✓ 一括削除対応</li>
              </ul>
            </Link>

            {/* SKU新規作成 */}
            <Link
              href="/sku-create"
              className="bg-gradient-to-br from-purple-600 to-purple-800 p-8 rounded-xl text-white hover:shadow-2xl transition transform hover:scale-105 cursor-pointer block"
            >
              <div className="text-4xl mb-4">🆕</div>
              <h3 className="text-xl font-bold mb-2">SKU新規作成</h3>
              <p className="text-sm text-purple-100 mb-4">
                新しいSKUを登録します
              </p>
              <ul className="text-xs text-purple-100 space-y-1">
                <li>✓ 新規SKUの追加</li>
                <li>✓ 必須情報の入力</li>
                <li>✓ AI商品名生成</li>
              </ul>
            </Link>

            {/* 利益管理 */}
            <Link
              href="/profit"
              className="bg-gradient-to-br from-green-600 to-green-800 p-8 rounded-xl text-white hover:shadow-2xl transition transform hover:scale-105 cursor-pointer block"
            >
              <div className="text-4xl mb-4">💰</div>
              <h3 className="text-xl font-bold mb-2">利益管理</h3>
              <p className="text-sm text-green-100 mb-4">
                SKUごとの利益分析・集計
              </p>
              <ul className="text-xs text-green-100 space-y-1">
                <li>✓ 総利益・平均利益率表示</li>
                <li>✓ 利益順・利益率順ソート</li>
              </ul>
            </Link>

            {/* 在庫管理 */}
            <Link
              href="/admin/inventory"
              className="bg-gradient-to-br from-orange-600 to-orange-800 p-8 rounded-xl text-white hover:shadow-2xl transition transform hover:scale-105 cursor-pointer block"
            >
              <div className="text-4xl mb-4">📦</div>
              <h3 className="text-xl font-bold mb-2">在庫管理</h3>
              <p className="text-sm text-orange-100 mb-4">
                SKU別在庫状況・再注文管理
              </p>
              <ul className="text-xs text-orange-100 space-y-1">
                <li>✓ 在庫/予約済/利用可能表示</li>
                <li>✓ 在庫切れ警告</li>
              </ul>
            </Link>

            {/* 売上管理 */}
            <Link
              href="/sales"
              className="bg-gradient-to-br from-pink-600 to-pink-800 p-8 rounded-xl text-white hover:shadow-2xl transition transform hover:scale-105 cursor-pointer block"
            >
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-bold mb-2">売上管理</h3>
              <p className="text-sm text-pink-100 mb-4">
                販売実績・売上分析
              </p>
              <ul className="text-xs text-pink-100 space-y-1">
                <li>✓ 日別/月別売上集計</li>
                <li>✓ SKU別売上分析</li>
              </ul>
            </Link>

            {/* 発送管理 */}
            <Link
              href="/admin/shipping"
              className="bg-gradient-to-br from-red-600 to-red-800 p-8 rounded-xl text-white hover:shadow-2xl transition transform hover:scale-105 cursor-pointer block"
            >
              <div className="text-4xl mb-4">🚚</div>
              <h3 className="text-xl font-bold mb-2">発送準備</h3>
              <p className="text-sm text-red-100 mb-4">
                発送ステータス・追跡管理
              </p>
              <ul className="text-xs text-red-100 space-y-1">
                <li>✓ ステータス別表示</li>
                <li>✓ 追跡番号管理</li>
              </ul>
            </Link>
          </div>
        </section>

        {/* 区切り線 */}
        <hr className="border-slate-700 my-16" />

        {/* スタッフ向けメニュー */}
        <section>
          <h2 className="text-3xl font-bold text-white mb-8">👥 スタッフ向けメニュー</h2>
          <p className="text-slate-300 mb-8">
            撮影・編集・アップロード外注時に使用してください。通常業務はSKU編集ページから実施してください。
          </p>

          <div className="mb-6 text-sm text-slate-400 bg-slate-800 border border-slate-700 rounded-lg p-4">
            📸 補助用アップロードページ（管理者/外注用）: 通常は使用せず、SKU編集ページ内の画像管理を利用してください。
            <span className="ml-2 underline text-slate-200"><a href="/upload">/upload</a></span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 撮影 */}
            <Link
              href="/outsourcing"
              className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 rounded-xl text-white hover:shadow-2xl transition transform hover:scale-105 cursor-pointer block"
            >
              <div className="text-4xl mb-4">📷</div>
              <h3 className="text-xl font-bold mb-2">撮影</h3>
              <p className="text-sm text-indigo-100 mb-4">
                撮影待ちSKUの確認・完了報告
              </p>
              <ul className="text-xs text-indigo-100 space-y-1">
                <li>✓ 割当スキュの確認</li>
                <li>✓ 撮影完了報告</li>
              </ul>
            </Link>

            {/* マニュアル */}
            <Link
              href="/manual"
              className="bg-gradient-to-br from-amber-600 to-amber-800 p-8 rounded-xl text-white hover:shadow-2xl transition transform hover:scale-105 cursor-pointer block"
            >
              <div className="text-4xl mb-4">📖</div>
              <h3 className="text-xl font-bold mb-2">マニュアル</h3>
              <p className="text-sm text-amber-100 mb-4">
                使い方・よくある質問・トラブルシューティング
              </p>
              <ul className="text-xs text-amber-100 space-y-1">
                <li>✓ 各機能の説明</li>
                <li>✓ FAQ</li>
              </ul>
            </Link>
          </div>
        </section>

        {/* フッター */}
        <div className="mt-16 pt-12 border-t border-slate-700 text-center text-slate-400">
          <p className="mb-2">E-NEXUS Photo Manager v1.0</p>
          <p className="text-sm">ローカルシステム • <span className="text-slate-500">http://localhost:3000</span></p>
        </div>
      </div>
    </div>
  );
}
