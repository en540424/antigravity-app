/**
 * SKU 判定ロジック集約ファイル
 * 一覧画面と編集画面で共通利用される判定ロジックをここに集約
 */

export type Sku_condition = "new" | "like_new" | "excellent" | "good" | "acceptable" | "poor" | "none" | "unset" | null;

export interface SkuData {
  id?: string;
  sku?: string;
  title?: string;
  brand?: string;
  model?: string;
  color?: string;
  condition?: string;
  sku_condition?: Sku_condition;
  ebay_category_id?: number | null;
  ebay_category?: string | null;
  category_id?: number | null;
  title_optimized?: string;
  description?: string;
  item_specifics?: Record<string, string>;
  sale_price_usd?: number | null;
  sale_price_jpy?: number | null;
  purchase_cost_jpy?: number | null;
  domestic_shipping?: number | null;
  shipping_cost_jpy?: number | null;
  profit_jpy?: number | null;
  profit_rate?: number | null;
  image_count?: number;
  listing_image_count?: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * 画像チェック用フラグ
 */
export function getImageReadinessFlags(sku: SkuData) {
  // sku-images エンドポイントから返される imageInfo を想定
  // RAW, ORIGINAL, LISTING の各カウント
  // ここではシンプルに image_count と listing_image_count を使用
  const listingImageCount = sku.listing_image_count ?? 0;
  const totalImageCount = sku.image_count ?? 0;

  return {
    hasEnoughListingImages: listingImageCount >= 7,
    hasAnyImages: totalImageCount > 0,
    listingCount: listingImageCount,
    totalCount: totalImageCount,
  };
}

/**
 * 価格・利益チェック用フラグ
 */
export function getPriceReadinessFlags(sku: SkuData) {
  const hasCostPrice = typeof sku.purchase_cost_jpy === "number" && sku.purchase_cost_jpy > 0;
  const hasSalePrice =
    (typeof sku.sale_price_usd === "number" && sku.sale_price_usd > 0) ||
    (typeof sku.sale_price_jpy === "number" && sku.sale_price_jpy > 0);
  const hasProfitCalculation =
    typeof sku.profit_jpy === "number" &&
    typeof sku.profit_rate === "number" &&
    sku.profit_rate > 0;

  return {
    hasCostPrice,
    hasSalePrice,
    hasProfitCalculation,
    profitJpy: sku.profit_jpy ?? null,
    profitRate: sku.profit_rate ?? null,
  };
}

/**
 * eBay メタデータチェック用フラグ
 */
export function getEbayReadinessFlags(sku: SkuData) {
  // カテゴリ ID の取得（新→旧→旧フォールバック）
  const categoryId =
    typeof sku.ebay_category_id === "number"
      ? sku.ebay_category_id
      : typeof sku.ebay_category === "string"
        ? Number(sku.ebay_category)
        : typeof sku.category_id === "number"
          ? sku.category_id
          : null;

  const hasCategory = categoryId && categoryId > 0;
  const hasTitleOptimized = !!(sku.title_optimized && sku.title_optimized.trim().length > 0);
  const hasDescription = !!(sku.description && sku.description.trim().length > 0);
  const hasItemSpecifics =
    sku.item_specifics &&
    ["Brand", "Model", "Color"].every((key) => {
      const val = sku.item_specifics![key];
      return val && val.trim().length > 0;
    });

  return {
    hasCategory,
    categoryId: categoryId ?? null,
    hasTitleOptimized,
    hasDescription,
    hasItemSpecifics,
  };
}

/**
 * 全体的な準備完了フラグをまとめた型
 */
export interface ReadinessFlags {
  images: ReturnType<typeof getImageReadinessFlags>;
  price: ReturnType<typeof getPriceReadinessFlags>;
  ebay: ReturnType<typeof getEbayReadinessFlags>;
}

/**
 * 全体的な準備状況を集約
 */
export function getReadinessFlags(sku: SkuData): ReadinessFlags {
  return {
    images: getImageReadinessFlags(sku),
    price: getPriceReadinessFlags(sku),
    ebay: getEbayReadinessFlags(sku),
  };
}

/**
 * 対応が必要な理由のリスト（行ごとの NextAction で表示）
 */
export interface ActionReason {
  icon: string;
  label: string;
  detail: string;
  priority: "critical" | "high" | "medium" | "low";
  action?: string; // タブへのジャンプキーなど
}

export function getReasons(sku: SkuData): ActionReason[] {
  const reasons: ActionReason[] = [];
  const flags = getReadinessFlags(sku);

  // 画像チェック
  if (!flags.images.hasEnoughListingImages) {
    reasons.push({
      icon: "📸",
      label: "画像不足",
      detail: `LISTING ${flags.images.listingCount}/7 必要`,
      priority: "critical",
      action: "images",
    });
  }

  // 価格・利益チェック
  if (!flags.price.hasCostPrice) {
    reasons.push({
      icon: "💰",
      label: "原価未設定",
      detail: "仕入価格を入力してください",
      priority: "critical",
      action: "price",
    });
  }
  if (!flags.price.hasSalePrice) {
    reasons.push({
      icon: "💵",
      label: "販売価格未設定",
      detail: "eBay出品価格を入力してください",
      priority: "critical",
      action: "price",
    });
  }
  if (flags.price.hasCostPrice && flags.price.hasSalePrice && !flags.price.hasProfitCalculation) {
    reasons.push({
      icon: "📊",
      label: "利益未計算",
      detail: "価格から利益を計算できません",
      priority: "high",
      action: "price",
    });
  }

  // eBay メタデータチェック
  if (!flags.ebay.hasCategory) {
    reasons.push({
      icon: "📂",
      label: "eBayカテゴリ未設定",
      detail: "カテゴリを選択してください",
      priority: "high",
      action: "ebay",
    });
  }
  if (!flags.ebay.hasTitleOptimized) {
    reasons.push({
      icon: "✨",
      label: "SEO タイトル未生成",
      detail: "AI でタイトル最適化を生成してください",
      priority: "high",
      action: "ebay",
    });
  }
  if (!flags.ebay.hasDescription) {
    reasons.push({
      icon: "📝",
      label: "説明文未入力",
      detail: "eBay向け説明文 (HTML) を入力してください",
      priority: "high",
      action: "ebay",
    });
  }
  if (!flags.ebay.hasItemSpecifics) {
    reasons.push({
      icon: "🏷",
      label: "商品属性不足",
      detail: "Brand, Model, Color は必須です",
      priority: "high",
      action: "product",
    });
  }

  // 条件チェック
  if (!sku.sku_condition || sku.sku_condition === "none" || sku.sku_condition === "unset") {
    reasons.push({
      icon: "⚠️",
      label: "コンディション未選択",
      detail: "商品の状態を選択してください",
      priority: "high",
      action: "product",
    });
  }

  // 出品タイトルチェック
  if (!sku.title || sku.title.trim().length === 0) {
    reasons.push({
      icon: "📖",
      label: "商品名未入力",
      detail: "SKU作成時の商品名を入力してください",
      priority: "medium",
      action: "product",
    });
  }

  return reasons.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

/**
 * NextAction（次にやるべき作業）を決定
 */
export function determineNextAction(sku: SkuData): { type: string; icon: string; label: string } | null {
  const reasons = getReasons(sku);
  if (reasons.length === 0) return null;

  const topReason = reasons[0];
  return {
    type: topReason.action || "unknown",
    icon: topReason.icon,
    label: topReason.label,
  };
}

/**
 * 出品可能判定
 */
export function canList(sku: SkuData): boolean {
  const flags = getReadinessFlags(sku);
  const reasons = getReasons(sku);

  // 必要な条件が全て満たされているか
  return (
    flags.images.hasEnoughListingImages &&
    flags.price.hasProfitCalculation &&
    flags.ebay.hasCategory &&
    flags.ebay.hasTitleOptimized &&
    flags.ebay.hasDescription &&
    flags.ebay.hasItemSpecifics &&
    sku.sku_condition &&
    sku.sku_condition !== "none" &&
    sku.sku_condition !== "unset" &&
    sku.title &&
    sku.title.trim().length > 0 &&
    reasons.length === 0
  );
}

/**
 * 出品可否ラベル
 */
export function getListingStatus(sku: SkuData): { status: "ok" | "warning" | "ng"; label: string; color: string } {
  const canListFlag = canList(sku);
  const reasons = getReasons(sku);

  if (canListFlag) {
    return { status: "ok", label: "📤 出品OK", color: "emerald" };
  }

  if (reasons.filter((r) => r.priority === "critical").length > 0) {
    return { status: "ng", label: "❌ 出品NG", color: "red" };
  }

  return { status: "warning", label: "⚠️ 要確認", color: "amber" };
}
