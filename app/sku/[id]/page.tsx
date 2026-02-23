"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { judgeProfit } from "@/app/lib/profitRule";

// 次の作業判定（簡易）
function getNextAction(sku: any) {
  const requiredImages = 6;
  if (!sku.imageCount || sku.imageCount < requiredImages) return "image";
  if (!sku.title || sku.title === "(未入力)" || sku.is_temp_title) return "edit";
  if (!sku.jp_condition && !sku.condition) return "edit";
  if (sku.cost == null || sku.cost === "" || sku.expected_price == null || sku.expected_price === "") return "edit";
  if (!sku.ai_title_status || sku.ai_title_status === "未生成") return "edit";
  if (!sku.ai_desc_status || sku.ai_desc_status === "未生成") return "edit";
  if (!sku.listing_status || sku.listing_status === "未判定" || sku.listing_status === "-") return "listing";
  return "ok";
}

export default function SkuDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [sku, setSku] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/sku-detail?id=${encodeURIComponent(id)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("not found");
        const data = await res.json();
        if (!data || !data.id) throw new Error("not found");
        setSku(data);
        setError("");
      })
      .catch(() => setError("データが見つかりませんでした"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ padding: 32, textAlign: "center" }}>読み込み中...</div>;
  if (error) return <div style={{ padding: 32, textAlign: "center", color: "red" }}>{error}</div>;
  if (!sku) return null;
  const isAdmin = true; // TODO: 権限判定

  // --- 要対応サマリー判定 ---
  const reasons: string[] = [];
  const requiredImages = 6;
  if (!sku.imageCount || sku.imageCount < requiredImages) reasons.push(`画像が不足しています（${sku.imageCount || 0} / ${requiredImages}）`);
  if (!sku.title || sku.title === "(未入力)" || sku.is_temp_title) reasons.push("商品名が未確定です");
  if (!sku.jp_condition && !sku.condition) reasons.push("コンディション未設定です");
  if (sku.cost == null || sku.cost === "" || sku.expected_price == null || sku.expected_price === "") reasons.push("価格情報が未入力です");
  if (sku.profit == null || sku.profit === "" || sku.profitJudge === "判定不可" || sku.profitJudge === "-") reasons.push("利益判定ができません");
  if (!sku.ai_title_status || sku.ai_title_status === "未生成") reasons.push("AIタイトルが未生成です");
  if (!sku.ai_desc_status || sku.ai_desc_status === "未生成") reasons.push("AI説明文が未生成です");
  if (!sku.listing_status || sku.listing_status === "未判定" || sku.listing_status === "-") reasons.push("出品可否が未判定です");
  const isOk = reasons.length === 0;

  return (
    <div className="min-h-screen bg-[#18181b] py-10">
      <div className="max-w-2xl mx-auto p-6 bg-[#23232a] rounded-2xl shadow-lg border border-gray-800 text-white">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white">SKU詳細</h1>
          <Link href="/" className="px-3 py-1 rounded bg-gray-700 text-white text-sm hover:bg-gray-600 border border-gray-600">🏠 ホーム</Link>
        </div>
        <div className="mb-4 text-sm text-gray-300">SKU番号: <span className="font-mono text-lg text-white">{sku.sku || "(未入力)"}</span></div>
        <div className="mb-2 font-semibold text-lg">商品名: <span className={sku.title ? '' : 'text-gray-500'}>{sku.title || sku.jp_title || <span className='text-gray-500'>(未入力)</span>}</span></div>
        <div className="mb-2 text-xs text-gray-400">作成日: {sku.created_at ? new Date(sku.created_at).toLocaleString() : "-"} ／ 最終更新: {sku.updated_at ? new Date(sku.updated_at).toLocaleString() : "-"}</div>
        <div className="mb-2">ステータス: <span className="px-2 py-1 rounded bg-gray-700 text-white">{sku.status || "-"}</span></div>
        {/* 要対応サマリー */}
        <div className={`my-4 p-4 rounded-xl border-2 ${isOk ? "bg-green-900/30 border-green-600" : "bg-yellow-900/30 border-yellow-600"}`}>
          <div className="font-bold mb-1 text-white">要対応サマリー</div>
          {isOk ? (
            <div className="text-green-400 font-bold flex items-center gap-2">✅ 出品可能</div>
          ) : (
            <>
              <div className="text-red-400 font-bold flex items-center gap-2">❌ 要対応（{reasons.length}項目）</div>
              <ul className="mt-1 ml-2 text-sm text-red-200 list-disc">
                {reasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </>
          )}
        </div>
        {/* 画像状況 */}
        <div className="mb-4">
          <div className="font-bold text-white">画像状況</div>
          <div className={sku.imageCount < requiredImages ? "text-red-400" : "text-green-400"}>📸 画像枚数: {sku.imageCount || 0} / {requiredImages} {sku.imageCount < requiredImages ? "（未完了）" : "（OK）"}</div>
          {/* サムネイル一覧 */}
          <div className="flex gap-2 mt-2">
            {(sku.images || []).map((img: string, i: number) => (
              <img key={i} src={img} alt="img" className="w-16 h-16 object-cover rounded border border-gray-700" />
            ))}
          </div>
        </div>
        {/* 価格・利益 */}
        <div className="mb-4">
          <div className="font-bold text-white">価格・利益</div>
          <div>原価: {sku.cost == null || sku.cost === "" ? <span className="text-red-400">未入力</span> : <span className="text-white">{sku.cost}</span>}</div>
          <div>売価: {sku.expected_price == null || sku.expected_price === "" ? <span className="text-red-400">未入力</span> : <span className="text-white">{sku.expected_price}</span>}</div>
          <div>利益: {sku.profit == null || sku.profit === "" ? <span className="text-red-400">計算不可</span> : <span className="text-white">{sku.profit}</span>}</div>
          <div className="flex items-center gap-2">
            <span>利益率:</span>
            {sku.profitRate == null || sku.profitRate === "" ? (
              <span className="text-red-400">計算不可</span>
            ) : (
              (() => {
                const result = judgeProfit(Number(sku.profitRate));
                return (
                  <span className={`badge badge-${result.color}`} style={{ minWidth: 70, display: 'inline-block' }}>
                    {result.status === "ok" && "🟢"}
                    {result.status === "warning" && "🟡"}
                    {result.status === "ng" && "🔴"}
                    {result.label}
                    <span className="ml-1 text-xs text-gray-500">({Number(sku.profitRate).toFixed(1)}%)</span>
                  </span>
                );
              })()
            )}
          </div>
        </div>
        {/* AI生成状況 */}
        <div className="mb-4">
          <div className="font-bold text-white">AI生成状況</div>
          <div>タイトル: {sku.ai_title_status === "生成済" ? <span className="text-green-400">生成済</span> : <span className="text-red-400">未生成</span>}</div>
          <div>説明文: {sku.ai_desc_status === "生成済" ? <span className="text-green-400">生成済</span> : <span className="text-red-400">未生成</span>}</div>
          <div>最終生成日時: {sku.ai_updated_at ? <span className="text-white">{new Date(sku.ai_updated_at).toLocaleString()}</span> : <span className="text-gray-500">-</span>}</div>
        </div>
        {/* 出品ステータス */}
        <div className="mb-4">
          <div className="font-bold text-white">出品ステータス</div>
          <div>eBay出品: {sku.listing_status || <span className="text-red-400">未出品</span>}</div>
          <div>CSV/API連携: {sku.csv_status || <span className="text-red-400">未実行</span>}</div>
        </div>
        {/* ボタン群（次の作業だけ強調） */}
        <div className="flex gap-3 mt-6">
          <Link
            href={`/sku/${sku.id}/edit`}
            className="px-4 py-2 rounded bg-purple-600 text-white font-bold shadow hover:bg-purple-700"
          >✏️ 編集する<br /><span className="text-xs">価格・商品情報・画像</span></Link>
          {isAdmin && (
            <button
              className={
                getNextAction(sku) === "listing"
                  ? "px-4 py-2 rounded bg-orange-600 text-white font-bold shadow hover:bg-orange-700"
                  : "px-4 py-2 rounded bg-gray-700 text-white opacity-60"
              }
              disabled={getNextAction(sku) !== "listing"}
            >📄 出品データを確認（管理者）</button>
          )}
        </div>
      </div>
    </div>
  );
}
