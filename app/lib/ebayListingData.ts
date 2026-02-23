// eBay出品データ構造（SKU単位で生成・保存）
export type EbayListingData = {
  sku: string; // 内部SKU（custom label）
  title: string; // 英語タイトル（80文字以内・AI生成）
  description: string; // 英語説明文（eBay形式・AI生成）
  condition: string; // eBayコンディション（英語）
  priceUSD: number; // 価格（USD）
  quantity: number; // 原則1
  imageUrls: string[]; // listing用画像URL一覧
  shippingPolicy: string; // テンプレIDまたは固定名
  returnPolicy: string; // テンプレIDまたは固定名
  handlingTime: number; // 固定
  location: string; // Japan固定
  item_specifics?: Record<string, string>; // 任意
  category?: string; // 任意
};

// 出品可否判定結果
export type ListingEligibility = {
  eligible: boolean;
  reasons: string[]; // 出品不可の場合は理由を列挙
};

// 出品可否判定ロジック
export function checkListingEligibility(skuData: Partial<EbayListingData>): ListingEligibility {
  const reasons: string[] = [];
  if (!skuData.title || skuData.title.length === 0) reasons.push("AI英語タイトル未生成");
  if (!skuData.description || skuData.description.length === 0) reasons.push("AI英語説明未生成");
  if (!skuData.condition || skuData.condition.length === 0) reasons.push("eBayコンディション未設定");
  if (!skuData.imageUrls || skuData.imageUrls.length < 3) reasons.push("listing画像が3枚未満");
  if (!skuData.priceUSD || skuData.priceUSD <= 0) reasons.push("価格未設定");
  if (!skuData.sku || skuData.sku.length === 0) reasons.push("SKU未設定");
  // ステータス判定は呼び出し元で追加可
  return { eligible: reasons.length === 0, reasons };
}
