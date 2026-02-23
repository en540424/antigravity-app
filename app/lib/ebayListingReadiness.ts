/**
 * eBay出品可否判定ロジック
 */

export type ListingReadinessCheck = {
  isReady: boolean;
  missingItems: string[];
  warnings: string[];
};

export function checkListingReadiness(sku: {
  sku: string;
  title?: string | null;
  title_optimized?: string | null;
  description?: string | null;
  ai_description?: string | null;
  // カテゴリ
  ebay_category_id?: number | null;
  ebay_category?: string | null;
  category_id?: number | null;
  // コンディション
  condition?: string | null;
  sku_condition?: string | null;
  // 価格
  sale_price_usd?: number | null;
  sale_price_jpy?: number | null;
  // 画像
  image_count?: number;
  listing_image_count?: number;
}): ListingReadinessCheck {
  const missingItems: string[] = [];
  const warnings: string[] = [];

  // 1. LISTING画像 7枚以上
  const listingCount = sku.listing_image_count ?? sku.image_count ?? 0;
  if (listingCount < 7) {
    missingItems.push(`LISTING画像不足 (${listingCount}/7枚)`);
  } else if (listingCount < 12) {
    warnings.push(`LISTING画像は12枚推奨 (現在${listingCount}枚)`);
  }

  // 2. タイトルあり (title または title_optimized)
  const effectiveTitle = sku.title || sku.title_optimized || '';
  if (effectiveTitle.trim().length === 0) {
    missingItems.push('タイトル未入力');
  } else if (effectiveTitle.length > 80) {
    warnings.push('タイトルが80文字を超えています');
  }

  // 3. 説明文あり (description または ai_description)
  const effectiveDescription = sku.description || sku.ai_description || '';
  if (effectiveDescription.trim().length === 0) {
    missingItems.push('説明文未入力');
  }

  // 4. 価格（USD/JPY）確定
  const hasUSD = typeof sku.sale_price_usd === 'number' && sku.sale_price_usd > 0;
  const hasJPY = typeof sku.sale_price_jpy === 'number' && sku.sale_price_jpy > 0;
  if (!hasUSD && !hasJPY) {
    missingItems.push('販売価格未設定');
  }

  // 5. カテゴリ番号あり（新→旧→旧のフォールバック）
  const categoryId =
    typeof sku.ebay_category_id === 'number'
      ? sku.ebay_category_id
      : typeof sku.ebay_category === 'string'
        ? Number(sku.ebay_category)
        : typeof sku.category_id === 'number'
          ? sku.category_id
          : 0;
  if (!(typeof categoryId === 'number' && categoryId > 0)) {
    missingItems.push('eBayカテゴリ未設定');
  }

  // 6. コンディション確定
  const condition = sku.sku_condition || sku.condition;
  if (!condition || condition === 'none' || condition === 'unset') {
    missingItems.push('コンディション未設定');
  }

  return {
    isReady: missingItems.length === 0,
    missingItems,
    warnings,
  };
}

/**
 * 複数SKUから出品可能なものだけをフィルタリング
 */
export function filterListableSkus<T extends Parameters<typeof checkListingReadiness>[0]>(
  skus: T[]
): { listable: T[]; notListable: Array<T & { reason: string }> } {
  const listable: T[] = [];
  const notListable: Array<T & { reason: string }> = [];

  for (const sku of skus) {
    const check = checkListingReadiness(sku);
    if (check.isReady) {
      listable.push(sku);
    } else {
      notListable.push({
        ...sku,
        reason: check.missingItems.join(', '),
      });
    }
  }

  return { listable, notListable };
}
