import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

export async function POST(req?: Request) {
  // リクエストボディから日付を取得（オプション）
  let targetDate = "";
  if (req) {
    try {
      const body = await req.json();
      targetDate = body.date || "";
    } catch (e) {
      // JSON解析失敗時は無視
    }
  }

  // 対象日付を決定
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const today = targetDate || `${y}${m}${d}`; // 20251211 みたいな形

  // 今日の SKU 一覧を取得（例：20251211-0001, 20251211-0002...）
  const { data, error } = await supabase
    .from("sku_list")
    .select("sku")
    .like("sku", `${today}-%`);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // SKUのリストをパースして連番を抽出
  const usedNumbers = new Set<number>();
  if (data && data.length > 0) {
    for (const row of data) {
      const sku: string = row.sku;
      const parts = sku.split("-");
      if (parts.length === 2) {
        const num = Number(parts[1]);
        if (!Number.isNaN(num)) {
          usedNumbers.add(num);
        }
      }
    }
  }

  // 最初の空きナンバーを探す（1から順に）
  let nextNum = 1;
  while (usedNumbers.has(nextNum)) {
    nextNum++;
  }

  const nextNumStr = String(nextNum).padStart(4, "0");
  const newSku = `${today}-${nextNumStr}`;

  // Supabase に登録
  const { data: inserted, error: insertError } = await supabase
    .from("sku_list")
    .insert({
      sku: newSku,
      title: "",
      status: "none",
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  return NextResponse.json(inserted);
}
