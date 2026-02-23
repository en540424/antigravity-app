import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/utils/supabase/server';
import { evaluateCsvReadiness } from '@/app/lib/ebayNamingConvention';
import { CONDITION_MAP, getConditionKeyById } from '@/app/lib/ebayNamingConvention';

const BUCKET = 'product-images';

/**
 * eBay CSV出力エンドポイント
 * 出品可能なSKUのみをCSV形式で返す
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();

    // 全SKUを取得（削除済み除外）
    const { data: skus, error } = await supabase
      .from('sku_list')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'SKU取得失敗' }, { status: 500 });
    }

    // 各SKUの画像枚数を取得 + CSV readiness評価
    const skusWithReadiness = await Promise.all(
      (skus || []).map(async (sku) => {
        if (!sku.sku) return { ...sku, listing_image_count: 0, csvReady: false };

        const { data: files } = await supabase.storage
          .from(BUCKET)
          .list(`${sku.sku}/LISTING`);

        const listingCount = (files || []).filter((f) => f.name !== '.emptyFolderPlaceholder').length;

        const descriptionForExport = sku.description ?? sku.ai_description ?? sku.jp_description ?? "";
        // カテゴリIDは新: ebay_category_id → 旧: ebay_category(string) → 旧: category_id(number) の順で決定
        const categoryId =
          typeof sku.ebay_category_id === "number"
            ? sku.ebay_category_id
            : typeof sku.ebay_category === "string"
              ? Number(sku.ebay_category)
              : typeof sku.category_id === "number"
                ? sku.category_id
                : 0;
        const conditionId = typeof sku.condition_id === "number" ? sku.condition_id : null;
        const conditionLabel = sku.jp_condition ?? sku.condition ?? sku.sku_condition ?? null;
        const priceJPY = typeof sku.sale_price_jpy === "number" ? sku.sale_price_jpy : (typeof sku.expected_price === "number" ? sku.expected_price : null);

        const readiness = evaluateCsvReadiness({
          title: sku.title ?? null,
          description: descriptionForExport,
          categoryId,
          conditionId,
          conditionLabel,
          priceJPY,
          listingImageCount: listingCount,
          requiredListingImages: 7,
        });

        return {
          ...sku,
          listing_image_count: listingCount,
          csvReady: readiness.ready,
          csvErrors: readiness.errors,
        };
      })
    );

    // 出品可能なSKUのみフィルタリング
    const listable = skusWithReadiness.filter(s => s.csvReady);
    const notListable = skusWithReadiness.filter(s => !s.csvReady).map(s => ({
      sku: s.sku,
      reason: s.csvErrors?.join(', ') ?? '不明',
    }));

    if (listable.length === 0) {
      return NextResponse.json(
        { error: "MISSING_REQUIRED_FIELDS", message: "出品可能なSKUがありません", missing: notListable },
        { status: 400 }
      );
    }

    // CSV生成
    const csvHeaders = [
      'Action(SiteID=US|Country=US|Currency=USD|Version=1193)',
      'SKU',
      'CustomLabel',
      'Title',
      'Description',
      'Category',
      'Condition',
      'Format',
      'Duration',
      'StartPrice',
      'Quantity',
      'PaymentMethods',
      'ShippingService-1:Option',
      'ShippingService-1:Cost',
      'DispatchTimeMax',
      'ReturnsAcceptedOption',
      'RefundOption',
      'ReturnsWithinOption',
      'ShippingCostPaidByOption',
      'PicURL',
    ];

    const csvRows = listable.map((sku) => {
      // 画像ファイル名参照を生成（最大25枚）
      const imageFileNames: string[] = [];
      for (let i = 1; i <= Math.min(sku.listing_image_count ?? 0, 25); i++) {
        const paddedIndex = String(i).padStart(2, '0');
        imageFileNames.push(`${sku.sku}_LISTING_${paddedIndex}.jpg`);
      }

      // 価格（USD優先、なければJPY換算）
      const priceUSD = sku.sale_price_usd ?? (sku.sale_price_jpy ? (sku.sale_price_jpy / 150).toFixed(2) : '0');

      // Condition ID取得（condition_idがあればそのまま、なければマッピング）
      let conditionIdStr = '3000'; // デフォルト: Used
      if (typeof sku.condition_id === 'number') {
        conditionIdStr = String(sku.condition_id);
      } else {
        const conditionLabel = sku.sku_condition || sku.condition || sku.jp_condition;
        const conditionKey = Object.keys(CONDITION_MAP).find(
          k => CONDITION_MAP[k as keyof typeof CONDITION_MAP].label === conditionLabel
        ) as keyof typeof CONDITION_MAP | undefined;
        if (conditionKey) {
          conditionIdStr = String(CONDITION_MAP[conditionKey].id);
        }
      }

      // タイトル（title優先、なければtitle_optimized）
      const titleForExport = (sku.title || sku.title_optimized || '').replace(/"/g, '""');
      
      // 説明文（description優先、なければai_description）
      const descriptionForExport = (sku.description || sku.ai_description || '').replace(/"/g, '""').replace(/\n/g, ' ');

      // カテゴリID（CSV用）
      const catId =
        typeof sku.ebay_category_id === 'number'
          ? sku.ebay_category_id
          : typeof sku.category_id === 'number'
            ? sku.category_id
            : 0;

      return [
        'Add', // Action
        sku.sku || '', // SKU
        sku.sku || '', // CustomLabel = 内部SKU（注文時のマッピング用）
        titleForExport, // Title
        descriptionForExport, // Description
        String(catId), // Category
        conditionIdStr, // Condition ID
        'FixedPrice', // Format
        'GTC', // Duration (Good 'Til Cancelled)
        String(priceUSD), // StartPrice
        '1', // Quantity
        'PayPal', // PaymentMethods
        'USPSPriorityMailInternational', // ShippingService
        sku.shipping_cost_usd || '35', // ShippingCost
        '3', // DispatchTimeMax
        'ReturnsAccepted', // ReturnsAcceptedOption
        'MoneyBack', // RefundOption
        'Days_30', // ReturnsWithinOption
        'Buyer', // ShippingCostPaidByOption
        imageFileNames.join('|'), // PicURL (ファイル名参照、パイプ区切り)
      ];
    });

    // CSV文字列生成
    const csvContent = [
      csvHeaders.map((h) => `"${h}"`).join(','),
      ...csvRows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    // レスポンスヘッダー設定
    const headers = new Headers();
    headers.set('Content-Type', 'text/csv; charset=utf-8');
    headers.set('Content-Disposition', `attachment; filename="ebay-listings-${new Date().toISOString().slice(0, 10)}.csv"`);

    // 統計情報を含めるためにJSONレスポンスも用意
    const searchParams = req.nextUrl.searchParams;
    const format = searchParams.get('format') || 'csv';

    if (format === 'json') {
      return NextResponse.json({
        success: true,
        listableCount: listable.length,
        notListableCount: notListable.length,
        listableSkus: listable.map((s) => s.sku),
        notListableSkus: notListable,
      });
    }

    return new NextResponse(csvContent, { headers });
  } catch (error) {
    console.error('CSV export error:', error);
    return NextResponse.json(
      { error: 'CSV出力に失敗しました', detail: String(error) },
      { status: 500 }
    );
  }
}
