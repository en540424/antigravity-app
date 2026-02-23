import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/app/utils/supabase/server";

const SHIPPING_STATUS = [
  "unprocessed",
  "preparing",
  "processing",
  "shipped",
  "delivered",
];

const ALLOWED_FIELDS = ["shipping_status", "tracking_number"];

const FORBIDDEN_FIELDS = [
  // /api/sku-update で扱うもの全て
  "work_status",
  "jp_title",
  "jp_description",
  "accessory_memo",
  "condition_memo",
  "jp_condition",
  "cost",
  "expected_price",
  "domestic_shipping",
  "international_shipping",
  "ebay_fee_rate",
  "payment_fee_rate",
  "profit",
  "profit_rate",
  "ai_status",
  "listing_status",
  "created_at",
  "created_by",
  "ai_en_text",
  // ...他にも必要に応じて追加
];

const STATUS_FLOW = {
  unprocessed: "preparing",
  preparing: "processing",
  processing: "shipped",
  shipped: "delivered",
};
export async function POST(req: NextRequest) {
  const supabase = await getServerSupabase();
  const { data: session } = await supabase.auth.getSession();
  if (!session?.session) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  const user = session.session.user;
  const role = user.user_metadata?.role;
  if (role !== "admin") {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "不正なリクエスト" }, { status: 400 });
  }

  const { sku_id, shipping_status, tracking_number, ...rest } = payload;
  if (!sku_id) {
    return NextResponse.json({ error: "SKU IDが必要です" }, { status: 400 });
  }

  // 禁止フィールドが含まれていたら全体拒否
  for (const key of Object.keys(rest)) {
    if (FORBIDDEN_FIELDS.includes(key)) {
      return NextResponse.json({ error: `禁止フィールド: ${key}` }, { status: 400 });
    }
  }

  // ステータス必須
  if (!shipping_status || !SHIPPING_STATUS.includes(shipping_status)) {
    return NextResponse.json({ error: "不正な発送ステータス" }, { status: 400 });
  }

  // SKU存在チェック
  const { data: sku, error: skuError } = await supabase
    .from("sku_list")
    .select("id")
    .eq("id", sku_id)
    .single();
  if (skuError || !sku) {
    return NextResponse.json({ error: "SKUが存在しません" }, { status: 404 });
  }

  // 発送レコード取得/自動生成
  let { data: shipping, error: shippingError } = await supabase
    .from("shipping")
    .select("*")
    .eq("sku_id", sku_id)
    .single();
  if (shippingError || !shipping) {
    // 自動生成
    const { data: newShipping, error: createError } = await supabase
      .from("shipping")
      .insert({ sku_id, shipping_status: "unprocessed" })
      .select()
      .single();
    if (createError || !newShipping) {
      return NextResponse.json({ error: "発送レコード作成失敗" }, { status: 500 });
    }
    shipping = newShipping;
  }

  // 状態遷移チェック
  const prevStatus = shipping.shipping_status;
  const nextStatus = shipping_status;
  if (prevStatus === nextStatus) {
    return NextResponse.json({ error: "同一ステータスへの再更新は禁止" }, { status: 400 });
  }
  if (STATUS_FLOW[prevStatus] !== nextStatus) {
    return NextResponse.json({ error: "不正な状態遷移" }, { status: 400 });
  }

  // 追跡番号ルール
  if (tracking_number) {
    if (nextStatus !== "shipped") {
      return NextResponse.json({ error: "追跡番号は発送済のみ許可" }, { status: 400 });
    }
    if (shipping.tracking_number && prevStatus === "shipped") {
      return NextResponse.json({ error: "到着時の追跡番号変更禁止" }, { status: 400 });
    }
  }

  // 日時自動入力
  let updateFields: Record<string, any> = { shipping_status: nextStatus };
  if (nextStatus === "shipped") {
    updateFields.shipped_at = new Date().toISOString();
    if (tracking_number) updateFields.tracking_number = tracking_number;
  }
  if (nextStatus === "delivered") {
    updateFields.delivered_at = new Date().toISOString();
  }

  // DB更新
  const { error: updateError } = await supabase
    .from("shipping")
    .update(updateFields)
    .eq("sku_id", sku_id);
  if (updateError) {
    return NextResponse.json({ error: "更新失敗" }, { status: 500 });
  }

  // ログ記録
  await supabase.from("activity_log").insert({
    sku_id,
    prev_status: prevStatus,
    new_status: nextStatus,
    user_id: user.id,
    updated_at: new Date().toISOString(),
  });

  return NextResponse.json({ success: true });
}
