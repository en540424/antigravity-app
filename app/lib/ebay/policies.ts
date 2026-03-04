import "server-only";
import { getEbayAccessToken } from "./token";
import { supabaseAdmin } from "@/app/lib/supabase/server-admin";

export type EbayPolicyType = "FULFILLMENT" | "PAYMENT" | "RETURN";

export type EbayPolicyRecord = {
  policy_type: EbayPolicyType;
  policy_id: string;
  name: string;
  description: string | null;
};

const EBAY_ACCOUNT_BASE = "https://api.ebay.com/sell/account/v1";
const MARKETPLACE_ID = "EBAY_US";

const PATH_MAP: Record<EbayPolicyType, string> = {
  FULFILLMENT: "/fulfillment_policy",
  PAYMENT:     "/payment_policy",
  RETURN:      "/return_policy",
};

const ID_FIELD_MAP: Record<EbayPolicyType, string> = {
  FULFILLMENT: "fulfillmentPolicyId",
  PAYMENT:     "paymentPolicyId",
  RETURN:      "returnPolicyId",
};

// eBay Account API から指定タイプのポリシー一覧を取得
async function fetchFromEbay(
  token: string,
  type: EbayPolicyType
): Promise<EbayPolicyRecord[]> {
  const url = `${EBAY_ACCOUNT_BASE}${PATH_MAP[type]}?marketplace_id=${MARKETPLACE_ID}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      `eBay policies fetch failed (${type}): ${JSON.stringify(json)}`
    );
  }

  // レスポンス例: { fulfillmentPolicies: [...], total: N }
  const listKey = Object.keys(json).find((k) => k.endsWith("Policies")) ?? "";
  const items: any[] = json[listKey] ?? [];

  return items.map((item) => ({
    policy_type: type,
    policy_id:   item[ID_FIELD_MAP[type]] as string,
    name:        item.name as string,
    description: (item.description as string | undefined) ?? null,
  }));
}

// 全種類を eBay から取得 → ebay_policy_master へ upsert
export async function syncPolicies(): Promise<{
  synced: number;
  deactivated: number;
  errors: string[];
}> {
  const token = await getEbayAccessToken();
  const types: EbayPolicyType[] = ["FULFILLMENT", "PAYMENT", "RETURN"];
  const runStartedAt = new Date().toISOString();
  let synced = 0;
  const errors: string[] = [];

  for (const type of types) {
    try {
      const records = await fetchFromEbay(token, type);
      for (const r of records) {
        const { error } = await supabaseAdmin
          .from("ebay_policy_master")
          .upsert(
            {
              policy_type:  r.policy_type,
              policy_id:    r.policy_id,
              name:         r.name,
              description:  r.description,
              is_active:    true,
              last_seen_at: runStartedAt,
              updated_at:   runStartedAt,
            },
            { onConflict: "policy_type,policy_id" }
          );
        if (error) {
          errors.push(`${type}/${r.policy_id}: ${error.message}`);
        } else {
          synced++;
        }
      }
    } catch (e: any) {
      errors.push(`${type}: ${e.message}`);
    }
  }

  // 今回の同期で見えなかったポリシーを無効化（削除ではなく is_active=false）
  const { data: deactivatedRows, error: deactivateError } = await supabaseAdmin
    .from("ebay_policy_master")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .lt("last_seen_at", runStartedAt)
    .eq("is_active", true)
    .select("id");
  if (deactivateError) {
    errors.push(`deactivate_stale: ${deactivateError.message}`);
  }

  return { synced, deactivated: deactivatedRows?.length ?? 0, errors };
}
