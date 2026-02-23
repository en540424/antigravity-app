import { NextResponse } from "next/server";
import { createSupabaseClient } from "@/app/utils/supabase/createServerClient";
import { cookies } from "next/headers";


// 許可する初期ステータス
const ALLOWED_STATUS = ["shooting", "editing", "listing", "done"];
export async function POST(req: Request) {
  const supabase = createSupabaseClient();

  // 認証バイパス（本番運用時は必ず戻すこと！）
  // const {
  //   data: { session },
  //   error: sessionError,
  // } = await supabase.auth.getSession();
  // if (sessionError || !session) {
  //   return NextResponse.json({ success: false, error: "認証が必要です" }, { status: 401 });
  // }
  // const user = session.user;
  // const { data: roleData } = await supabase
  //   .from("user_roles")
  //   .select("role")
  //   .eq("user_id", user.id)
  //   .single();
  // if (!roleData || roleData.role !== "admin") {
  //   return NextResponse.json({ success: false, error: "管理者のみ作成可能です" }, { status: 403 });
  // }
  const user = { id: "dev-bypass" };

  // 入力取得
  // JSONボディは任意。パースできない場合も空オブジェクトで進める（既存UIがボディなしでPOSTするため）。
  const body = await req
    .json()
    .catch(() => ({} as any));

  const rawTitle = typeof body.title === "string" ? body.title : "";
  const title = rawTitle.trim() === "" ? "(未入力)" : rawTitle.trim();
  const status = body.status;
  const initialStatus = ALLOWED_STATUS.includes(status) ? status : "shooting";

  // SKU番号自動生成（日付＋連番）
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const today = `${y}${m}${d}`;
  // 今日のSKU一覧を取得
  const { data, error } = await supabase
    .from("sku_list")
    .select("sku")
    .like("sku", `${today}-%`);
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
  // 連番決定
  const usedNumbers = new Set<number>();
  if (data && data.length > 0) {
    for (const row of data) {
      const sku: string = row.sku;
      const parts = sku.split("-");
      if (parts.length === 2) {
        const num = Number(parts[1]);
        if (!Number.isNaN(num)) usedNumbers.add(num);
      }
    }
  }
  let nextNum = 1;
  while (usedNumbers.has(nextNum)) nextNum++;
  const nextNumStr = String(nextNum).padStart(4, "0");
  const newSku = `${today}-${nextNumStr}`;

  // 重複チェック
  const { data: exists } = await supabase
    .from("sku_list")
    .select("id")
    .eq("sku", newSku)
    .maybeSingle();
  if (exists) {
    return NextResponse.json({ success: false, error: "SKU番号の重複が発生しました。再試行してください。" }, { status: 409 });
  }

  // 登録（初期値を明示的にセット）
  const { data: inserted, error: insertError } = await supabase
    .from("sku_list")
    .insert({
      sku: newSku,
      title: title.trim(),
      status: initialStatus,
      shipping_status: "pending", // 発送ステータス
      condition: null,
      profit: null,
      profit_rate: null,
      ai_status: "unset",
      can_list: false,
      created_at: new Date().toISOString(),
      created_by: user.id,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ success: false, error: insertError.message }, { status: 400 });
  }

  // ログ記録（将来拡張用）
  // await supabase.from("sku_logs").insert([{ sku_id: inserted.id, action: "create", user_id: user.id }]);

  return NextResponse.json({
    success: true,
    id: inserted.id,
    sku: newSku,
  });
}

