import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/app/utils/supabase/server";

// 許可されたフィールド定義
const ADMIN_FIELDS = [
  "jp_title",
  "jp_description",
  "accessory_memo",
  "condition_memo",
  "work_status",
  "jp_condition",
  "cost",
  "expected_price",
  "domestic_shipping",
  "international_shipping",
  "ebay_fee_rate",
  "payment_fee_rate",
];
const OUTSOURCE_FIELDS = [
  "work_status",
  // メモ系を許可する場合はここに追加
];
const ENUM_WORK_STATUS = [
  "撮影待ち",
  "編集待ち",
  "出品待ち",
  "完了",
];

// 絶対に更新禁止のフィールド
const FORBIDDEN_FIELDS = [
  "sku",
  "created_at",
  "created_by",
  "ai_en_text",
  "listing_status",
  "shipping_status",
  "tracking_number",
  "profit",
  "profit_rate",
];

// AI再生成フラグ対象
const AI_REGEN_FIELDS = [
  "jp_title",
  "jp_description",
  "condition_memo",
  "accessory_memo",
  "jp_condition",
];


export async function POST(req: NextRequest) {
  const supabase = await getServerSupabase();
  const { data: session } = await supabase.auth.getSession();
  if (!session?.session) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  const user = session.session.user;
  const role = user.user_metadata?.role;
  if (!role || (role !== "admin" && role !== "outsourcer")) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "不正なリクエスト" }, { status: 400 });
  }

  const { sku_id, ...fields } = payload;
  if (!sku_id) {
    return NextResponse.json({ error: "SKU IDが必要です" }, { status: 400 });
  }

  // エラーを一時変数で管理
  let errorResponse: any = null;

  // 禁止フィールドが含まれていたら全体拒否
  for (const key of Object.keys(fields)) {
    if (FORBIDDEN_FIELDS.includes(key)) {
      errorResponse = NextResponse.json({ error: `更新禁止フィールド: ${key}` }, { status: 400 });
      break;
    }
  }
  // 権限ごとの許可フィールドチェック
  if (!errorResponse) {
    const allowedFields = role === "admin" ? ADMIN_FIELDS : OUTSOURCE_FIELDS;
    for (const key of Object.keys(fields)) {
      if (!allowedFields.includes(key)) {
        errorResponse = NextResponse.json({ error: `権限で許可されていないフィールド: ${key}` }, { status: 400 });
        break;
      }
    }
  }
  // work_statusはenumのみ許可
  if (!errorResponse && fields.work_status && !ENUM_WORK_STATUS.includes(fields.work_status)) {
    errorResponse = NextResponse.json({ error: "不正な作業ステータス値" }, { status: 400 });
  }
  // null送信時の安全対策
  if (!errorResponse) {
    for (const key of Object.keys(fields)) {
      if (fields[key] === null) {
        errorResponse = NextResponse.json({ error: `null値の送信は禁止: ${key}` }, { status: 400 });
        break;
      }
    }
  }
  if (errorResponse) return errorResponse;

  // SKU存在チェック
  const { data: sku, error: skuError } = await supabase
    .from("sku_list")
    .select("*")
    .eq("id", sku_id)
    .single();
  if (skuError || !sku) {
    return NextResponse.json({ error: "SKUが存在しません" }, { status: 404 });
  }

  // 更新内容の作成（送信された項目のみ）
  const updateFields: Record<string, any> = {};
  for (const key of Object.keys(fields)) {
    updateFields[key] = fields[key];
  }

  // AI再生成フラグ判定
  let aiStatusUpdate = {};
  if (Object.keys(fields).some((k) => AI_REGEN_FIELDS.includes(k))) {
    aiStatusUpdate = { ai_status: "再生成必要" };
  }

  // DB更新
  const { error: updateError } = await supabase
    .from("sku_list")
    .update({ ...updateFields, ...aiStatusUpdate })
    .eq("id", sku_id);
  if (updateError) {
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }

  // ログ記録
  await supabase.from("activity_log").insert({
    sku_id,
    user_id: user.id,
    role,
    updated_fields: Object.keys(updateFields),
    updated_at: new Date().toISOString(),
  });

  return NextResponse.json({ success: true });
}
