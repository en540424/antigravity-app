// SKUを起点としたeBay出品データ型定義・生成ロジック
// app/lib/ebayListing.ts

import type { SkuItem, Sku_condition } from "./skuCondition";

export type EbayListingData = {
  sku: string;
  title_en: string; // 英語タイトル（80文字以内）
  description_en: string; // 英語説明文
  condition_en: string; // eBay仕様の英語コンディション
  price_usd: number; // USD
  quantity: number; // 原則1
  imageUrls: string[];
  location: string; // 発送元
  shippingTemplate: string; // 発送方法テンプレ
  returnPolicy: string; // 返品ポリシー
  // 判定用
  isReady: boolean; // 出品可
  notReadyReason?: string; // 不可理由（不足項目名など）
};

// eBay用データ自動生成ロジック
export function generateEbayListingData(sku: SkuItem): EbayListingData {
  // 必須項目の取得
  const title_en = sku.title_optimized || "";
  const description_en = sku.description || "";
  const condition_en = getConditionEnLabel(sku.condition);
  const price_usd = sku.profit ? Math.round(sku.profit) : 0;
  const quantity = 1;
  // SkuItemにimageUrlsはないため空配列で返す
  const imageUrls: string[] = [];
  const location = "Japan";
  const shippingTemplate = "Standard Shipping from Japan";
  const returnPolicy = "30 days returns. Buyer pays for return shipping.";

  // 不足項目チェック
  let isReady = true;
  let notReadyReason = "";
  if (!title_en) { isReady = false; notReadyReason += "タイトル未生成 "; }
  if (!description_en) { isReady = false; notReadyReason += "説明文未生成 "; }
  if (!condition_en || condition_en === "Not specified") { isReady = false; notReadyReason += "コンディション未設定 "; }
  if (!price_usd) { isReady = false; notReadyReason += "利益未計算 "; }
  if (!imageUrls.length) { isReady = false; notReadyReason += "画像不足 "; }

  return {
    sku: sku.sku,
    title_en,
    description_en,
    condition_en,
    price_usd,
    quantity,
    imageUrls,
    location,
    shippingTemplate,
    returnPolicy,
    isReady,
    notReadyReason: isReady ? undefined : notReadyReason.trim(),
  };
}

// 日本語→eBay英語コンディション変換
function getConditionEnLabel(condition: Sku_condition | null | undefined): string {
  // ...既存のsku_condition.tsのロジックを利用...
  if (!condition || condition === "none") return "Not specified";
  switch (condition) {
    case "new": return "New";
    case "likeNew": return "New (Other)";
    case "good": return "Used – Good";
    case "fair": return "Used – Acceptable";
    case "poor": return "For parts or not working";
    default: return "Not specified";
  }
}
