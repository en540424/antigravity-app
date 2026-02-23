/**
 * 利益計算モジュール
 * eBay販売における利益を計算します
 */

export type ProfitCalculationInput = {
  // 想定売値情報
  sellingPriceUSD: number;
  shippingCostUSD: number;
  // JPYモード用
  sellingPriceJPY?: number;
  shippingCostJPY?: number;
  
  // eBayコスト設定
  exchangeRate: number; // USD→JPY為替レート
  ebayFeePercent: number; // eBay手数料(%)
  promotedListingPercent: number; // Promoted Listing(%)
  internationalPaymentFeePercent: number; // 海外決済手数料(%)
  payoneerFeePercent: number; // Payoneer手数料(%)
  payoneerFixedFeeUSD: number; // Payoneer固定手数料(USD)
  
  // その他コスト
  purchaseCostJPY?: number; // 仕入れ原価(JPY)
  domesticShippingJPY?: number; // 国内送料(JPY)
  packagingCostJPY?: number; // 梱包費(JPY)
  staffCostMultiplier?: number; // スタッフコスト係数
};

export type ProfitCalculationResult = {
  // 売上
  sellingPriceJPY: number;
  shippingRevenueJPY: number;
  totalRevenueJPY: number;
  
  // 手数料
  ebayFeeJPY: number;
  promotedListingFeeJPY: number;
  internationalPaymentFeeJPY: number;
  payoneerFeeJPY: number;
  payoneerFixedFeeJPY: number;
  totalFeesJPY: number;
  
  // コスト
  purchaseCostJPY: number;
  domesticShippingJPY: number;
  packagingCostJPY: number;
  shippingCostJPY: number;
  totalCostJPY: number;
  
  // 利益
  grossProfitJPY: number; // 粗利
  netProfitJPY: number; // 純利益
  profitRate: number; // 利益率(%)
  
  // その他
  exchangeRate: number;
};

/**
 * 利益を計算する
 */
export function calculateProfit(input: ProfitCalculationInput): ProfitCalculationResult {
  const {
    sellingPriceUSD,
    shippingCostUSD,
    sellingPriceJPY: inputSellingPriceJPY,
    shippingCostJPY: inputShippingCostJPY,
    exchangeRate,
    ebayFeePercent,
    promotedListingPercent,
    internationalPaymentFeePercent,
    payoneerFeePercent,
    payoneerFixedFeeUSD,
    purchaseCostJPY = 0,
    domesticShippingJPY = 0,
    packagingCostJPY = 0,
    staffCostMultiplier = 1,
  } = input;

  // 売上（JPY換算）
  const sellingPriceJPY = typeof inputSellingPriceJPY === "number" ? inputSellingPriceJPY : Math.round(sellingPriceUSD * exchangeRate);
  const shippingRevenueJPY = typeof inputShippingCostJPY === "number" ? inputShippingCostJPY : Math.round(shippingCostUSD * exchangeRate);
  const totalRevenueJPY = sellingPriceJPY + shippingRevenueJPY;

  // eBay手数料（商品価格のみに適用、送料含まず）
  const ebayFeeJPY = Math.round(sellingPriceJPY * (ebayFeePercent / 100));
  
  // Promoted Listing手数料（商品価格のみに適用）
  const promotedListingFeeJPY = Math.round(sellingPriceJPY * (promotedListingPercent / 100));
  
  // 海外決済手数料（商品価格+送料に適用）
  const internationalPaymentFeeJPY = Math.round(totalRevenueJPY * (internationalPaymentFeePercent / 100));
  
  // Payoneer手数料（商品価格+送料に適用）
  const payoneerFeeJPY = Math.round(totalRevenueJPY * (payoneerFeePercent / 100));
  const payoneerFixedFeeJPY = Math.round(payoneerFixedFeeUSD * exchangeRate);
  
  // 手数料合計
  const totalFeesJPY = ebayFeeJPY + promotedListingFeeJPY + internationalPaymentFeeJPY + payoneerFeeJPY + payoneerFixedFeeJPY;

  // 配送コスト（USD換算 or JPY直接入力）
  const shippingCostJPY = typeof inputShippingCostJPY === "number" ? inputShippingCostJPY : Math.round(shippingCostUSD * exchangeRate);
  
  // コスト合計
  const totalCostJPY = purchaseCostJPY + domesticShippingJPY + packagingCostJPY + shippingCostJPY;

  // 粗利（売上 - 手数料 - 配送コスト）
  const grossProfitJPY = totalRevenueJPY - totalFeesJPY - shippingCostJPY;
  
  // 純利益（粗利 - その他コスト）× スタッフコスト係数
  const netProfitJPY = Math.round((grossProfitJPY - purchaseCostJPY - domesticShippingJPY - packagingCostJPY) * staffCostMultiplier);
  
  // 利益率（純利益 / 売上 × 100）
  const profitRate = totalRevenueJPY > 0 ? parseFloat((netProfitJPY / totalRevenueJPY * 100).toFixed(1)) : 0;

  return {
    sellingPriceJPY,
    shippingRevenueJPY,
    totalRevenueJPY,
    ebayFeeJPY,
    promotedListingFeeJPY,
    internationalPaymentFeeJPY,
    payoneerFeeJPY,
    payoneerFixedFeeJPY,
    totalFeesJPY,
    purchaseCostJPY,
    domesticShippingJPY,
    packagingCostJPY,
    shippingCostJPY,
    totalCostJPY,
    grossProfitJPY,
    netProfitJPY,
    profitRate,
    exchangeRate,
  };
}

/**
 * デフォルト設定値
 */
export const DEFAULT_PROFIT_SETTINGS = {
  exchangeRate: 150,
  ebayFeePercent: 12.9,
  promotedListingPercent: 0,
  internationalPaymentFeePercent: 1.35,
  payoneerFeePercent: 2.0,
  payoneerFixedFeeUSD: 0.4,
  staffCostMultiplier: 1.0,
};
