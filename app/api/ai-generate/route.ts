import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/app/utils/supabase/server";
import { calcProfitAndRate } from "@/app/lib/profitCalc";

// AIステータス定義
const AI_STATUS = [
  "not_generated",
  "generated",
  "needs_regeneration",
];

// AI生成に必要な日本語情報
const REQUIRED_FIELDS = [
  "jp_title",
  "jp_description",
  "condition_memo",
  "accessory_memo",
  "jp_condition",
];

const MODEL_NAME = "gpt-4.1"; // 内部用


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

  const { sku_id } = payload;
  if (!sku_id) {
    return NextResponse.json({ error: "SKU IDが必要です" }, { status: 400 });
  }

  // SKU存在チェック
  const { data: sku, error: skuError } = await supabase
    .from("sku_list")
    .select("*")
    .eq("id", sku_id)
    .single();
  if (skuError || !sku) {
    return NextResponse.json({ error: "SKUが存在しません" }, { status: 404 });
  }

  // 必須日本語情報のチェック
  for (const field of REQUIRED_FIELDS) {
    if (!sku[field] || sku[field].trim() === "") {
      return NextResponse.json({ error: `日本語情報不足: ${field}` }, { status: 400 });
    }
  }

  // AI生成（ダミー: 実際は外部API等を呼ぶ）
  // ここでは例として日本語情報を連結して英語文を生成した体にする
  const generatedEn = `ENGLISH: ${REQUIRED_FIELDS.map(f => sku[f]).join(" / ")}`;

  // 利益・利益率を計算
  const { profit, profit_rate } = calcProfitAndRate({
    expected_price: Number(sku.expected_price),
    cost: Number(sku.cost),
    ebay_fee_rate: Number(sku.ebay_fee_rate),
    payment_fee_rate: Number(sku.payment_fee_rate),
    domestic_shipping: Number(sku.domestic_shipping) || 0,
    international_shipping: Number(sku.international_shipping) || 0,
  });

  // ai_contentへ保存（履歴保持: 上書き保存）
  await supabase.from("ai_content").insert({
    sku_id,
    en_text: generatedEn,
    generated_at: new Date().toISOString(),
    model: MODEL_NAME,
    user_id: user.id,
  });

  // ai_status, 利益, 利益率を更新
  await supabase.from("sku_list").update({
    ai_status: "generated",
    profit,
    profit_rate
  }).eq("id", sku_id);

  // ログ記録
  await supabase.from("activity_log").insert({
    sku_id,
    user_id: user.id,
    action: "ai_generate",
    model: MODEL_NAME,
    executed_at: new Date().toISOString(),
  });

  return NextResponse.json({ success: true });
}
