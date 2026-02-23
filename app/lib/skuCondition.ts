/**
 * SKU管理 - 型定義とロジック
 */

// ==================== Enum ====================

/** SKUの処理ステータス */
export type SkuStatus = "shooting" | "editing" | "listing" | "done" | "none";

/** 商品のコンディション */
export type Sku_condition = "new" | "likeNew" | "good" | "fair" | "poor" | "none";

/** 発送ステータス（共通enum） */
export type ShippingStatus =
  | "unprocessed"   // 未処理
  | "preparing"     // 発送準備中
  | "shipping"      // 発送中
  | "shipped"       // 発送済
  | "arrived"       // 到着完了
  | "none";

// ==================== ラベル・カラー ====================

export const SKU_STATUS_LABEL: Record<SkuStatus, string> = {
  shooting: "📷 撮影待ち",
  editing: "✂️ 編集待ち",
  listing: "🛒 出品待ち",
  done: "🏁 完了",
  none: "— 未設定 —",
};

export const SKU_STATUS_COLOR: Record<SkuStatus, string> = {
  none: "bg-gray-400",
  shooting: "bg-blue-500",
  editing: "bg-yellow-400 text-gray-900",
  listing: "bg-purple-500",
  done: "bg-green-600",
};

export const CONDITION_LABEL: Record<Sku_condition, string> = {
  new: "新品",
  likeNew: "未使用",
  good: "良好",
  fair: "可",
  poor: "訳あり",
  none: "未設定",
};

export const CONDITION_OPTIONS: Array<{ value: Sku_condition; label: string }> = [
  { value: "new", label: "新品" },
  { value: "likeNew", label: "未使用" },
  { value: "good", label: "良好" },
  { value: "fair", label: "可" },
  { value: "poor", label: "訳あり" },
  { value: "none", label: "未設定" },
];

export const SHIPPING_STATUS_LABEL: Record<ShippingStatus, string> = {
  unprocessed: "未処理",
  preparing: "発送準備中",
  shipping: "発送中",
  shipped: "発送済",
  arrived: "到着完了",
  none: "未設定",
};

export const SHIPPING_STATUS_COLOR: Record<ShippingStatus, string> = {
  unprocessed: "bg-gray-400",
  preparing: "bg-yellow-400 text-gray-900",
  shipping: "bg-blue-500",
  shipped: "bg-green-500",
  arrived: "bg-green-800",
  none: "bg-gray-300",
};
// ==================== 日本語→英語コンディション変換 ====================
export const CONDITION_JA_TO_EN: Record<string, string> = {
  "新品": "New",
  "未使用": "New (Other)",
  "良好": "Used – Good",
  "可": "Used – Acceptable",
  "訳あり": "For parts or not working",
  "未設定": "Not specified",
};

export function getConditionEn(japanese: string | null | undefined): string {
  return CONDITION_JA_TO_EN[japanese ?? "未設定"] ?? "Not specified";
}

// ==================== SKU型定義 ====================

export type SkuItem = {
  // 利益情報（API拡張用）
  profit?: number | null;
  profitRate?: number | null;
  id: string;
  sku: string;
  title: string | null;
  status: SkuStatus | null;
  condition: Sku_condition | null;
  created_at: string;
  updated_at?: string;

  // 商品情報
  genre?: string | null;
  brand?: string | null;
  model?: string | null;
  color?: string | null;

  // eBay情報
  ebay_category_id?: number | null;
  ebay_category?: string | null; // 旧フィールド（文字列ID）
  category_id?: number | null; // 旧フィールド（数値ID）
  title_optimized?: string | null;
  description?: string | null;
  item_specifics?: Record<string, string> | null;

  // 原価・利益関連（今後拡張）
  purchase_cost_jpy?: number | null;
  shipping_domestic_jpy?: number | null;

  // 発送関連（今後拡張）
  shipping_status?: ShippingStatus | null;
  tracking_number?: string | null;

  // AI関連
  ai_extracted_at?: string | null;
};

// ==================== ロジック関数 ====================

/**
 * SKUからコンディションラベルを取得
 */
export function getConditionLabel(condition: Sku_condition | null | undefined): string {
  return CONDITION_LABEL[condition ?? "none"];
}

/**
 * SKUからステータスラベルを取得
 */
export function getStatusLabel(status: SkuStatus | null | undefined): string {
  return SKU_STATUS_LABEL[status ?? "none"];
}

/**
 * SKUからステータスカラーを取得
 */
export function getStatusColor(status: SkuStatus | null | undefined): string {
  return SKU_STATUS_COLOR[status ?? "none"];
}

/**
 * 発送ステータスラベルを取得
 */
export function getShippingStatusLabel(status: ShippingStatus | null | undefined): string {
  return SHIPPING_STATUS_LABEL[status ?? "none"];
}

/**
 * 発送ステータスカラーを取得
 */
export function getShippingStatusColor(status: ShippingStatus | null | undefined): string {
  return SHIPPING_STATUS_COLOR[status ?? "none"];
}

/**
 * コンディションから最小利益率を取得（目安）
 */
export function getMinProfitRate(condition: Sku_condition | null | undefined): number {
  const rates: Record<Sku_condition, number> = {
    new: 15,
    likeNew: 12,
    good: 10,
    fair: 5,
    poor: 0,
    none: 10,
  };
  return rates[condition ?? "none"];
}
