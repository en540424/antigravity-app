
import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/app/utils/supabase/server";
import { supabaseAdmin } from "@/app/lib/supabase/server-admin";
// import { requireAuth } from "../_lib/auth";

export async function POST(req: NextRequest) {
  try {
    // 🔐 認証（後でONにする）
    // await requireAuth(req);

    const supabase = await getServerSupabase();

    // ① 今日の日付
    const now = new Date();
    const ymd = now.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD

    // ② 今日のSKU一覧を取得
    const { data: todaySkus, error } = await supabase
      .from("sku_list")
      .select("sku")
      .like("sku", `NEX-${ymd}-%`);

    if (error) {
      return NextResponse.json({ error: "SKU取得失敗" }, { status: 500 });
    }

    // ③ 最大連番を計算
    let maxLetter = "A";
    let maxNumber = 0;

    for (const row of todaySkus || []) {
      const match = row.sku.match(/^NEX-\d{8}-([A-Z])(\d{3})$/);
      if (!match) continue;

      const letter = match[1];
      const num = Number(match[2]);

      if (
        letter > maxLetter ||
        (letter === maxLetter && num > maxNumber)
      ) {
        maxLetter = letter;
        maxNumber = num;
      }
    }

    // ④ 次のSKUを決定
    let nextLetter = maxLetter;
    let nextNumber = maxNumber + 1;

    if (nextNumber > 999) {
      nextNumber = 1;
      nextLetter = String.fromCharCode(maxLetter.charCodeAt(0) + 1);
    }

    if (nextLetter > "Z") {
      return NextResponse.json(
        { error: "本日のSKU上限に達しました" },
        { status: 409 }
      );
    }

    const sku = `NEX-${ymd}-${nextLetter}${String(nextNumber).padStart(3, "0")}`;

    // ⑤ INSERT（UNIQUE制約で守られる）
    const { data, error: insertError } = await supabaseAdmin
      .from("sku_list")
      .insert({ sku, title: "" }) // titleはNOT NULL制約のため空文字で挿入
      .select("id, sku, created_at")
      .single();

    if (insertError) {
      // UNIQUE違反
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "SKUが競合しました。再試行してください。" },
          { status: 409 }
        );
      }
      // デバッグ用: エラー詳細も返し、サーバーログにも出力
      // eslint-disable-next-line no-console
      console.error("SKU作成失敗:", insertError);
      return NextResponse.json({ error: "SKU作成失敗", detail: insertError }, { status: 500 });
    }

    // ✅ 成功
    return NextResponse.json({
      success: true,
      sku: data.sku,
      id: data.id,
      created_at: data.created_at,
    });

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "サーバーエラー" },
      { status: 500 }
    );
  }
}
