import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase/server-admin";
import { requireAuth } from "@/app/api/_lib/auth";
import { getEbayAccessToken } from "@/app/lib/ebay/token";
import { evaluateCsvReadiness, CONDITION_ENUM_MAP } from "@/app/lib/ebayNamingConvention";
import { getPolicyConfig, calculateListingPrice } from "@/app/lib/ebay/shippingStrategy";
import type { ShippingStrategy, DutyStrategy } from "@/app/lib/ebay/shippingStrategy";

const BUCKET = "product-images";
const EBAY_INVENTORY_BASE = "https://api.ebay.com/sell/inventory/v1";
const EBAY_MARKETPLACE_ID = "EBAY_US";

// eBay Sell Inventory API 共通リクエスト
async function ebayFetch(
  token: string,
  method: string,
  path: string,
  body?: unknown
): Promise<{ ok: boolean; status: number; json: any }> {
  const res = await fetch(`${EBAY_INVENTORY_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Content-Language": "en-US",
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const json = res.status === 204 ? {} : await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);

    const body = await req.json();
    const skuId: string = body?.skuId;
    if (!skuId) {
      return NextResponse.json(
        { ok: false, error: { code: "missing_sku_id", message: "skuId は必須です" } },
        { status: 400 }
      );
    }

    // 1. SKU取得
    const { data: sku, error: skuErr } = await supabaseAdmin
      .from("sku_list")
      .select("*")
      .eq("id", skuId)
      .is("deleted_at", null)
      .single();

    if (skuErr || !sku) {
      return NextResponse.json(
        { ok: false, error: { code: "sku_not_found", message: "SKUが見つかりません" } },
        { status: 404 }
      );
    }

    // 2. LISTING画像枚数カウント
    const { data: listingFiles } = await supabaseAdmin.storage
      .from(BUCKET)
      .list(`${sku.sku}/LISTING`);

    const listingImages = (listingFiles ?? []).filter(
      (f) => f.name !== ".emptyFolderPlaceholder"
    );
    const listingImageCount = listingImages.length;

    // 3. 出品可能チェック
    const categoryId =
      typeof sku.ebay_category_id === "number"
        ? sku.ebay_category_id
        : typeof sku.ebay_category === "string"
        ? Number(sku.ebay_category)
        : typeof sku.category_id === "number"
        ? sku.category_id
        : null;

    const conditionId =
      typeof sku.condition_id === "number" ? sku.condition_id : null;

    const priceJPY =
      typeof sku.sale_price_jpy === "number"
        ? sku.sale_price_jpy
        : typeof sku.expected_price === "number"
        ? sku.expected_price
        : null;

    const titleForListing =
      sku.title_optimized || sku.title || sku.jp_title || null;

    const descForListing =
      sku.description || sku.ai_description || sku.jp_description || null;

    const readiness = evaluateCsvReadiness({
      title: titleForListing,
      description: descForListing,
      categoryId,
      conditionId,
      conditionLabel: sku.jp_condition || sku.condition || sku.sku_condition || null,
      priceJPY,
      listingImageCount,
    });

    if (!readiness.ready) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "not_ready",
            message: "出品可能条件を満たしていません",
            details: readiness.errors,
          },
        },
        { status: 422 }
      );
    }

    // 4. eBayアクセストークン取得
    const token = await getEbayAccessToken();

    // 5. 画像URLを公開URLで生成（最大25枚、LISTING_01..LISTING_25）
    const imageUrls: string[] = listingImages
      .map((f) => {
        const { data } = supabaseAdmin.storage
          .from(BUCKET)
          .getPublicUrl(`${sku.sku}/LISTING/${f.name}`);
        return data.publicUrl;
      })
      .filter(Boolean)
      .slice(0, 25);

    // 6. 戦略取得 + 価格計算
    const shippingStrategy = (sku.shipping_strategy as ShippingStrategy) || "US_DDP";
    const dutyStrategy = (sku.duty_strategy as DutyStrategy) || "DDP";
    const policyConfig = await getPolicyConfig(shippingStrategy);
    const { listingPriceUsd, freeShipping } = calculateListingPrice({
      priceJPY: priceJPY!,
      priceUsdOverride: sku.sale_price_usd,
      dutyStrategy,
      config: policyConfig,
    });

    // 6b. ポリシーID: SKU個別設定 → strategy default の優先順
    const fulfillmentPolicyId =
      (sku.ebay_fulfillment_policy_id as string | null) ?? policyConfig.fulfillment_policy_id;
    const paymentPolicyId =
      (sku.ebay_payment_policy_id as string | null) ?? policyConfig.payment_policy_id;
    const returnPolicyId =
      (sku.ebay_return_policy_id as string | null) ?? policyConfig.return_policy_id;

    // 7. conditionEnum 変換
    const conditionEnum = conditionId != null
      ? (CONDITION_ENUM_MAP[conditionId] ?? "USED_GOOD")
      : "USED_GOOD";

    // ---- STEP A: PUT /inventory_item/{sku} ----
    const inventoryItemBody = {
      product: {
        title: titleForListing,
        description: descForListing,
        imageUrls,
      },
      condition: conditionEnum,
      ...(sku.condition_description
        ? { conditionDescription: sku.condition_description }
        : {}),
      availability: {
        shipToLocationAvailability: {
          quantity: 1,
        },
      },
      ...(process.env.EBAY_MERCHANT_LOCATION_KEY
        ? {
            packageWeightAndSize: {
              dimensions: undefined,
            },
          }
        : {}),
    };

    const putItem = await ebayFetch(
      token,
      "PUT",
      `/inventory_item/${encodeURIComponent(sku.sku)}`,
      inventoryItemBody
    );

    if (!putItem.ok && putItem.status !== 204) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "ebay_inventory_item_failed",
            message: "eBay inventory_item 作成失敗",
            details: putItem.json,
          },
        },
        { status: 502 }
      );
    }

    // ---- STEP B: POST /offer ----
    const offerBody: Record<string, unknown> = {
      sku: sku.sku,
      marketplaceId: EBAY_MARKETPLACE_ID,
      format: "FIXED_PRICE",
      availableQuantity: 1,
      categoryId: String(categoryId),
      listingDescription: descForListing,
      pricingSummary: {
        price: {
          value: String(listingPriceUsd),
          currency: "USD",
        },
      },
      listingPolicies: {
        fulfillmentPolicyId,
        paymentPolicyId,
        returnPolicyId,
      },
      ...(process.env.EBAY_MERCHANT_LOCATION_KEY
        ? { merchantLocationKey: process.env.EBAY_MERCHANT_LOCATION_KEY }
        : {}),
    };

    const postOffer = await ebayFetch(token, "POST", "/offer", offerBody);

    if (!postOffer.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "ebay_offer_failed",
            message: "eBay offer 作成失敗",
            details: postOffer.json,
          },
        },
        { status: 502 }
      );
    }

    const offerId: string = postOffer.json.offerId;
    if (!offerId) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: "no_offer_id", message: "offerId が取得できませんでした" },
        },
        { status: 502 }
      );
    }

    // ---- STEP C: POST /offer/{offerId}/publish ----
    const publish = await ebayFetch(
      token,
      "POST",
      `/offer/${offerId}/publish`,
      {}
    );

    if (!publish.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "ebay_publish_failed",
            message: "eBay publish 失敗",
            details: publish.json,
          },
        },
        { status: 502 }
      );
    }

    const listingId: string = publish.json.listingId;

    // 8. sku_list 更新
    const listingUrl = listingId
      ? `https://www.ebay.com/itm/${listingId}`
      : null;

    await supabaseAdmin
      .from("sku_list")
      .update({
        ebay_item_id: listingId,
        ebay_listing_status: "active",
        ebay_listing_url: listingUrl,
        ebay_synced_at: new Date().toISOString(),
      })
      .eq("id", skuId);

    return NextResponse.json({
      ok: true,
      data: { listingId, url: listingUrl },
    });
  } catch (e: any) {
    const msg = e?.message || "internal_error";
    const status = msg === "認証が必要です" ? 401 : msg === "権限がありません" ? 403 : 500;
    return NextResponse.json(
      { ok: false, error: { code: "server_error", message: msg } },
      { status }
    );
  }
}
