/**
 * eBay出品仕様書：ファイル命名規則・条件・カテゴリ変換
 * 
 * 【重要】
 * このファイルは「業務を人に渡せる仕様」を定義します。
 * 外注・家族・将来の自分でも同じ手順で出品できるよう、
 * すべての規則を明記しています。
 */

/**
 * 画像ファイル命名規則
 * 形式：{SKU}_{用途}_{連番}.jpg
 * 例：NEX-20251224-A005_LISTING_01.jpg
 */
export const IMAGE_PURPOSE = {
  RAW: 'RAW',        // 未加工・保管用
  ORG: 'ORG',        // 加工済・元画像
  LISTING: 'LISTING', // eBay使用（CSV対象）
} as const;

export type ImagePurpose = typeof IMAGE_PURPOSE[keyof typeof IMAGE_PURPOSE];

/**
 * 画像連番ルール
 * 01 が必ずメイン画像
 * UIで「メイン指定」 = LISTING_01 に自動割当
 */
export const IMAGE_NUMBERING = {
  MIN: 1,
  MAX: 25,
  MAIN_INDEX: 1, // LISTING_01 がメイン
  PAD_LENGTH: 2,  // 01, 02, 03...
} as const;

/**
 * ファイル名生成関数
 * @param sku SKU
 * @param purpose 用途（RAW/ORG/LISTING）
 * @param index 連番（1-25）
 * @returns ファイル名（例：NEX-20251224-A005_LISTING_01.jpg）
 */
export function generateImageFileName(
  sku: string,
  purpose: ImagePurpose,
  index: number
): string {
  const paddedIndex = String(index).padStart(IMAGE_NUMBERING.PAD_LENGTH, '0');
  return `${sku}_${purpose}_${paddedIndex}.jpg`;
}

/**
 * CSV出力用の画像ファイル参照名生成
 * LISTING用途のみ使用（01〜必要枚数）
 */
export function generateCsvImageReferences(sku: string, imageCount: number): string[] {
  const references: string[] = [];
  for (let i = 1; i <= Math.min(imageCount, IMAGE_NUMBERING.MAX); i++) {
    references.push(generateImageFileName(sku, IMAGE_PURPOSE.LISTING, i));
  }
  return references;
}

/**
 * Condition（商品状態）変換ロジック
 * UI表示（日本語） → eBay ConditionID（数値）
 */
export const CONDITION_MAP = {
  new: { id: 1000, label: '新品', ebayLabel: 'New' },
  new_other: { id: 1500, label: '新品（箱なし）', ebayLabel: 'New Other (see details)' },
  excellent: { id: 3000, label: '中古：非常に良い', ebayLabel: 'Used - Excellent' },
  very_good: { id: 4000, label: '中古：良い', ebayLabel: 'Used - Very Good' },
  good: { id: 5000, label: '中古：可', ebayLabel: 'Used - Good' },
} as const;

export type ConditionKey = keyof typeof CONDITION_MAP;

/**
 * Condition IDをキーから取得
 */
export function getConditionId(key: ConditionKey): number {
  return CONDITION_MAP[key].id;
}

/**
 * Condition ラベルをキーから取得（UI表示用）
 */
export function getConditionLabel(key: ConditionKey): string {
  return CONDITION_MAP[key].label;
}

/**
 * IDからCondition キーを逆引き
 */
export function getConditionKeyById(id: number): ConditionKey | null {
  for (const [key, value] of Object.entries(CONDITION_MAP)) {
    if (value.id === id) return key as ConditionKey;
  }
  return null;
}

/**
 * Category（eBayカテゴリ）変換ロジック
 * 
 * 内部保存：
 * - categoryId: number  (eBay CategoryID)
 * - categoryPath: string (UI表示用："大 > 中 > 小")
 * 
 * CSV出力：categoryId のみ
 */
export interface EbayCategory {
  id: number;
  path: string; // 表示用："Cameras > Digital Cameras"
}

/**
 * Category を CSV出力用にフォーマット
 * CSV では ID のみ出力
 */
export function formatCategoryForCsv(category: EbayCategory | null): string {
  if (!category) return '0'; // デフォルト
  return String(category.id);
}

/**
 * Category を UI表示用にフォーマット
 */
export function formatCategoryForUI(category: EbayCategory | null): string {
  if (!category) return '未設定';
  return category.path;
}

/**
 * CSV出力前チェック項目
 * これらすべてが揃って初めて出品可能
 */
export interface CsvReadinessCheck {
  hasTitle: boolean;
  hasDescription: boolean;
  hasCondition: boolean;
  hasCategory: boolean;
  hasPrice: boolean;
  hasEnoughImages: boolean;
  mainImageExists: boolean;
}

/**
 * SKUがCSV出力可能か判定
 */
export function isCsvReadyToExport(check: CsvReadinessCheck): boolean {
  return (
    check.hasTitle &&
    check.hasDescription &&
    check.hasCondition &&
    check.hasCategory &&
    check.hasPrice &&
    check.hasEnoughImages &&
    check.mainImageExists
  );
}

/**
 * CSV出力不可の理由を列挙
 */
export function getCsvExportReasons(check: CsvReadinessCheck): {
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!check.hasTitle) errors.push('タイトルが未入力です');
  if (!check.hasDescription) errors.push('説明文が未入力です');
  if (!check.hasCondition) errors.push('コンディションが未設定です');
  if (!check.hasCategory) errors.push('カテゴリが未設定です');
  if (!check.hasPrice) errors.push('価格が未設定です');
  if (!check.hasEnoughImages) errors.push('LISTING画像が7枚未満です');
  if (!check.mainImageExists) warnings.push('メイン画像（01）が見つかりません');

  return { errors, warnings };
}

export interface CsvReadinessInput {
  title?: string | null;
  description?: string | null;
  categoryId?: number | null;
  conditionId?: number | null;
  conditionLabel?: string | null;
  priceJPY?: number | null;
  listingImageCount?: number;
  requiredListingImages?: number;
}

export function evaluateCsvReadiness(input: CsvReadinessInput): {
  ready: boolean;
  check: CsvReadinessCheck;
  errors: string[];
  warnings: string[];
} {
  const requiredListingImages = input.requiredListingImages ?? 7;
  const hasTitle = typeof input.title === 'string' && input.title.trim().length > 0;
  const hasDescription = typeof input.description === 'string' && input.description.trim().length > 0;
  const hasCondition = typeof input.conditionId === 'number'
    ? true
    : typeof input.conditionLabel === 'string' && input.conditionLabel.trim().length > 0;
  const hasCategory = typeof input.categoryId === 'number' && input.categoryId > 0;
  const hasPrice = typeof input.priceJPY === 'number' ? input.priceJPY > 0 : false;
  const hasEnoughImages = typeof input.listingImageCount === 'number'
    ? input.listingImageCount >= requiredListingImages
    : false;
  const mainImageExists = typeof input.listingImageCount === 'number'
    ? input.listingImageCount > 0
    : false;

  const check: CsvReadinessCheck = {
    hasTitle,
    hasDescription,
    hasCondition,
    hasCategory,
    hasPrice,
    hasEnoughImages,
    mainImageExists,
  };

  const { errors, warnings } = getCsvExportReasons(check);
  return {
    ready: isCsvReadyToExport(check),
    check,
    errors,
    warnings,
  };
}
