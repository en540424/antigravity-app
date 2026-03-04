import "server-only";
import { supabaseAdmin } from "@/app/lib/supabase/server-admin";

// ---- 型定義 ----

export type ShippingStrategy =
  | "US_DDP"
  | "US_BUYER_PAYS"
  | "GLOBAL_BUYER_PAYS"
  | "EXPRESS_ONLY";

export type DutyStrategy = "DDP" | "BUYER_PAYS";

export type PolicyConfig = {
  strategy: ShippingStrategy;
  fulfillment_policy_id: string;
  payment_policy_id: string;
  return_policy_id: string;
  duty_markup_rate: number;
  shipping_cost_usd: number;
  free_shipping: boolean;
  note: string | null;
};

// ---- DB からポリシー設定を取得 ----
// strategy が未登録の場合は Error をスロー（呼び出し側でハンドリング）
export async function getPolicyConfig(
  strategy: string = "US_DDP"
): Promise<PolicyConfig> {
  const { data, error } = await supabaseAdmin
    .from("shipping_policy_map")
    .select("*")
    .eq("strategy", strategy)
    .single();

  if (error || !data) {
    throw new Error(
      `shipping_policy_map に strategy="${strategy}" が見つかりません。Supabase で登録してください。`
    );
  }

  return data as PolicyConfig;
}

// ---- 出品価格計算 ----
// ポリシー設定（DB取得済み）を受け取り、最終出品価格を返す
export function calculateListingPrice({
  priceJPY,
  priceUsdOverride,
  dutyStrategy,
  config,
}: {
  priceJPY: number;
  priceUsdOverride?: number | null;
  dutyStrategy: DutyStrategy;
  config: PolicyConfig;
}): {
  listingPriceUsd: number;
  shippingCostUsd: number;
  freeShipping: boolean;
} {
  const exchangeRate =
    parseFloat(process.env.EXCHANGE_RATE_JPY_USD || "150") || 150;

  // sku.sale_price_usd が明示設定されていればそれを優先
  const baseUsd =
    typeof priceUsdOverride === "number" && priceUsdOverride > 0
      ? priceUsdOverride
      : Math.round((priceJPY / exchangeRate) * 100) / 100;

  // DDP 戦略のときのみ関税マークアップを加算
  const dutyMultiplier =
    dutyStrategy === "DDP" ? 1 + config.duty_markup_rate / 100 : 1;

  const listingPriceUsd = Math.round(baseUsd * dutyMultiplier * 100) / 100;

  return {
    listingPriceUsd,
    shippingCostUsd: config.shipping_cost_usd,
    freeShipping: config.free_shipping,
  };
}
