

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/app/utils/supabase/server";
import { requireAuth } from "../_lib/auth";
import { logApi } from "../_lib/log";
import { judgeProfit } from "@/app/lib/profitRule";
import { getNextAction } from "@/app/utils/getNextAction";
import { calculateProfit, DEFAULT_PROFIT_SETTINGS } from "@/app/lib/profitCalculator";
import { evaluateCsvReadiness } from "@/app/lib/ebayNamingConvention";

const BUCKET = "product-images";


export async function GET(req: NextRequest) {
  try {
    // 認証は開発中のため一時的に無効化（後で requireAuth を復活させる）
    // const { user, role } = await requireAuth(req);
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from("sku_list")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Supabase query error:", error);
      return NextResponse.json({ error: "取得失敗", details: error.message }, { status: 500 });
    }
    // ストレージ側の画像枚数を取得（image_countが未集計の場合のフォールバック）
    const folderNames = ["RAW", "ORIGINAL", "LISTING", "EDITED", "THUMBNAIL"];
    const imageCountPairs = await Promise.all(
      (data || []).map(async (sku) => {
        if (!sku?.sku) return { id: sku.id, total: 0, listing: 0 };
        let total = 0;
        let listing = 0;
        for (const folder of folderNames) {
          const { data: files } = await supabase.storage.from(BUCKET).list(`${sku.sku}/${folder}`);
          const count = (files || []).filter((f) => f.name !== ".emptyFolderPlaceholder").length;
          total += count;
          if (folder === "LISTING") listing = count;
        }
        return { id: sku.id, total, listing };
      })
    );
    const imageCountMap = new Map(imageCountPairs.map((p) => [p.id, p]));

    // 管理者権限を仮でtrue固定
    const role = "admin";
    const adminFields = [
      "id", "sku", "title", "jp_description", "accessory_memo", "condition_memo", "work_status", "jp_condition", "cost", "expected_price", "domestic_shipping", "international_shipping", "ebay_fee_rate", "payment_fee_rate", "ai_status", "profit", "profit_rate", "listing_status", "created_at", "created_by", "thumbnail_path", "image_count",
      // バッジ表示用フィールドを追加
      "ebay_category_id", "category_id", "description", "ai_description", "brand", "model", "sku_condition", "sale_price_usd", "sale_price_jpy", "purchase_cost_jpy", "shipping_cost_usd", "shipping_cost_jpy", "exchange_rate", "payoneer_fee_rate"
    ];
    const contractorFields = [
      "id", "sku", "title", "jp_description", "accessory_memo", "condition_memo", "work_status", "jp_condition", "created_at", "thumbnail_path", "image_count"
    ];
    let filtered = data.map((sku) => {
      const base: any = {};
      const allow = role === "admin" ? adminFields : contractorFields;
      for (const k of allow) {
        if (sku[k] !== undefined) base[k] = sku[k];
      }
      const imageCounts = imageCountMap.get(sku.id);
      if (base["imageCount"] === undefined) {
        const storageCount = imageCounts?.total ?? 0;
        base["imageCount"] = sku.image_count ?? storageCount;
      }
      base["listingImageCount"] = imageCounts?.listing ?? 0;
      // 商品名（title）をtitleプロパティにコピー
      if (sku.title !== undefined) base.title = sku.title;
      
      // バッジ表示用フィールドを付与
      if (sku.description !== undefined) base.description = sku.description;
      if (sku.ai_description !== undefined && !base.description) base.description = sku.ai_description;
      
      // eBayカテゴリID（新→旧→旧フォールバック）
      if (sku.ebay_category_id !== undefined) base.ebay_category_id = sku.ebay_category_id;
      else if (sku.ebay_category !== undefined && typeof sku.ebay_category === 'string') base.ebay_category_id = Number(sku.ebay_category);
      else if (sku.category_id !== undefined) base.category_id = sku.category_id;
      
      // ブランド・型番
      if (sku.brand !== undefined) base.brand = sku.brand;
      if (sku.model !== undefined) base.model = sku.model;
      
      // サムネイルURLを付与
      if (sku.thumbnail_url) {
        base["thumbnailUrl"] = sku.thumbnail_url;
      } else if (sku.thumbnail_path) {
        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(sku.thumbnail_path);
        base["thumbnailUrl"] = urlData?.publicUrl || null;
      }
      // 利益・利益率（profit_jpy, profit_rate）を profit/profitRate にもマッピング
      if (sku.profit_jpy !== undefined) base.profit = sku.profit_jpy;
      else if (sku.profit !== undefined) base.profit = sku.profit;
      if (sku.profit_rate !== undefined) base.profitRate = sku.profit_rate;
      // 利益計算に必要な最低限の項目が揃っているか（売価・原価が数値）
      const hasPricingInputs =
        typeof sku.sale_price_jpy === "number" || typeof sku.expected_price === "number" || typeof sku.sale_price_usd === "number";
      const hasCostInputs = typeof sku.purchase_cost_jpy === "number" || typeof sku.cost === "number";

      // 表示が0や未計算のままのときは、フロントと同じ利益計算ロジックで再計算して穴埋め（ただし売価・原価が揃っている場合のみ）
      const shouldRecalc =
        hasPricingInputs && hasCostInputs && (
          base.profit == null ||
          base.profitRate == null ||
          ((base.profit === 0 || base.profit === "0") && (base.profitRate === 0 || base.profitRate === "0"))
        );
      if (shouldRecalc) {
        const profitInput = {
          sellingPriceUSD: Number(sku.sale_price_usd) || 0,
          shippingCostUSD: Number(sku.shipping_cost_usd) || 0,
          sellingPriceJPY: typeof sku.sale_price_jpy === "number" ? sku.sale_price_jpy : undefined,
          shippingCostJPY: typeof sku.shipping_cost_jpy === "number" ? sku.shipping_cost_jpy : undefined,
          exchangeRate: Number(sku.exchange_rate) || DEFAULT_PROFIT_SETTINGS.exchangeRate,
          ebayFeePercent: typeof sku.ebay_fee_rate === "number" ? sku.ebay_fee_rate : DEFAULT_PROFIT_SETTINGS.ebayFeePercent,
          promotedListingPercent: DEFAULT_PROFIT_SETTINGS.promotedListingPercent,
          internationalPaymentFeePercent: DEFAULT_PROFIT_SETTINGS.internationalPaymentFeePercent,
          payoneerFeePercent: typeof sku.payoneer_fee_rate === "number" ? sku.payoneer_fee_rate : DEFAULT_PROFIT_SETTINGS.payoneerFeePercent,
          payoneerFixedFeeUSD: DEFAULT_PROFIT_SETTINGS.payoneerFixedFeeUSD,
          purchaseCostJPY: typeof sku.purchase_cost_jpy === "number" ? sku.purchase_cost_jpy : undefined,
          domesticShippingJPY: typeof sku.domestic_shipping === "number" ? sku.domestic_shipping : (typeof sku.shipping_cost_jpy === "number" ? sku.shipping_cost_jpy : undefined),
          packagingCostJPY: 0,
          staffCostMultiplier: DEFAULT_PROFIT_SETTINGS.staffCostMultiplier,
        };
        const profitResult = calculateProfit(profitInput);
        if (!isNaN(profitResult.netProfitJPY)) base.profit = profitResult.netProfitJPY;
        if (!isNaN(profitResult.profitRate)) base.profitRate = profitResult.profitRate;
      }

      // それでも利益が入らない場合の最終フォールバック（単純差分）。売価・原価が無い場合は null のまま返す。
      if (base.profit == null || base.profitRate == null || (base.profit === 0 && base.profitRate === 0)) {
        const sellJPY = typeof sku.sale_price_jpy === "number" ? sku.sale_price_jpy : (typeof sku.expected_price === "number" ? sku.expected_price : null);
        const costJPY = typeof sku.purchase_cost_jpy === "number" ? sku.purchase_cost_jpy : (typeof sku.cost === "number" ? sku.cost : null);
        const shipJPY = typeof sku.shipping_cost_jpy === "number" ? sku.shipping_cost_jpy : 0;
        const domesticJPY = typeof sku.domestic_shipping === "number" ? sku.domestic_shipping : 0;
        if (sellJPY != null && costJPY != null) {
          const fallbackProfit = sellJPY - costJPY - shipJPY - domesticJPY;
          base.profit = fallbackProfit;
          base.profitRate = sellJPY > 0 ? Math.round((fallbackProfit / sellJPY) * 1000) / 10 : 0;
        } else {
          base.profit = null;
          base.profitRate = null;
        }
      }

      // 利益情報が無い場合は評価ラベルをunsetにしてカードで誤表示しない
      if (base.profit == null || base.profitRate == null) {
        base.profitJudge = "unset";
        base.profitJudgeLabel = "未計算";
        base.profitJudgeColor = "gray";
      }
      // 原価・売価もUI用プロパティにマッピング
      if (sku.purchase_cost_jpy !== undefined) base.cost = sku.purchase_cost_jpy;
      else if (sku.cost !== undefined) base.cost = sku.cost;
      if (sku.sale_price_jpy !== undefined) base.expected_price = sku.sale_price_jpy;
      else if (sku.expected_price !== undefined) base.expected_price = sku.expected_price;
      // 利益率判定を追加
      if (typeof base.profitRate === "number") {
        const judge = judgeProfit(base.profitRate);
        base.profitJudge = judge.status;
        base.profitJudgeLabel = judge.label;
        base.profitJudgeColor = judge.color;
      } else {
        base.profitJudge = "unset";
        base.profitJudgeLabel = "未計算";
        base.profitJudgeColor = "gray";
      }
      const descriptionForExport = sku.description ?? sku.ai_description ?? sku.jp_description ?? "";
      const categoryId =
        typeof sku.ebay_category_id === "number"
          ? sku.ebay_category_id
          : typeof sku.ebay_category === "string"
            ? Number(sku.ebay_category)
            : typeof sku.category_id === "number"
              ? sku.category_id
              : null;
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
        listingImageCount: imageCounts?.listing ?? 0,
        requiredListingImages: 7,
      });
      base.csvReady = readiness.ready;
      base.csvReadyErrors = readiness.errors;
      base.csvReadyWarnings = readiness.warnings;
      if (base.can_list === undefined && readiness.ready) {
        base.can_list = true;
      }

      // nextAction・actionReasonsを付与
      const nextActionInput = {
        title: sku.title ?? "",
        condition: sku.jp_condition ?? sku.condition ?? "",
        image_count: imageCounts?.listing ?? base["imageCount"] ?? sku.image_count ?? 0,
        required_image_count: 7,
        cost_price: sku.purchase_cost_jpy ?? sku.cost ?? null,
        sell_price: sku.sale_price_jpy ?? sku.expected_price ?? null,
        profit: base.profit ?? null,
        ai_title: sku.ai_title ?? null,
        ai_description: sku.ai_description ?? null,
        can_list: sku.listing_status === true || sku.listing_status === "OK" ? true : null,
      };
      // 利益計算OKならprofit_not_ready理由を除外
      let actionReasons: string[] = [];
      if ((typeof base.profit === 'number') && base.profit >= 0 && typeof base.profitRate === 'number' && base.profitRate > 0) {
        actionReasons = actionReasons.filter(r => r !== 'profit_not_ready');
      }
      base.nextAction = getNextAction(nextActionInput);
      base.actionReasons = actionReasons;
      base.needsAction = actionReasons.length > 0;
      return base;
    });
    // SKU番号があるものを上、ないものを下。あるものは新しい順（降順）
    // SKU形式: NEX-YYYYMMDD-A001 など（新仕様）
    function isValidSku(sku) {
      if (!sku) return false;
      const s = String(sku).trim();
      return /^NEX-\d{8}-[A-Z]\d{3}$/.test(s);
    }
    // 2段階ソート: 有効SKU（新しい順）→無効SKU（新しい順）
    const validSkus = filtered.filter((item) => isValidSku(item.sku));
    const invalidSkus = filtered.filter((item) => !isValidSku(item.sku));
    validSkus.sort((a, b) => {
      const aDate = a.created_at || '';
      const bDate = b.created_at || '';
      if (bDate !== aDate) return bDate.localeCompare(aDate);
      return String(b.sku || '').localeCompare(String(a.sku || ''));
    });
    invalidSkus.sort((a, b) => {
      const aDate = a.created_at || '';
      const bDate = b.created_at || '';
      return bDate.localeCompare(aDate);
    });
    filtered = [...validSkus, ...invalidSkus];
    // デバッグ: 先頭10件のsku, created_at, titleを出力
    console.log('SKU API sorted preview:', filtered.slice(0, 10).map(x => ({ sku: x.sku, created_at: x.created_at, title: x.title })));
    // ログ記録（GETは記録しない）
    return NextResponse.json(filtered);
  } catch (err: any) {
    console.error("SKU list API error:", err);
    return NextResponse.json({ error: err.message || "認証エラー", stack: err.stack }, { status: err.status || 500 });
  }
}
