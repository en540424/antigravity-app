import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/app/utils/supabase/server";
import { judgeProfit } from "@/app/lib/profitRule";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("sku_list")
    .select("*", { count: "exact" })
    .eq("id", id)
    .single();

  if (error || !data) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Normalize DB column names → UI expectations
  const profitRate =
    typeof data.profit_rate === "number"
      ? data.profit_rate
      : typeof data.profitRate === "number"
      ? data.profitRate
      : null;

  // 画像情報を Supabase Storage から取得
  let imageCount = 0;
  try {
    const skuValue = data.sku || id;
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
    const imagesRes = await fetch(`${baseUrl}/api/sku-images?sku=${encodeURIComponent(skuValue)}`);
    if (imagesRes.ok) {
      const imagesData = await imagesRes.json();
      imageCount = imagesData.totalCount || imagesData.count || 0;
    }
  } catch (e) {
    console.error("Failed to fetch image count:", e);
  }

  const normalized = {
    ...data,
    imageCount: imageCount > 0 ? imageCount : (data.image_count ?? data.imageCount ?? 0),
    cost: data.purchase_cost_jpy ?? data.cost ?? null,
    expected_price: data.sale_price_jpy ?? data.expected_price ?? null,
    profit: data.profit_jpy ?? data.profit ?? null,
    profitRate,
    ai_title_status: data.ai_title_status ?? (data.ai_title ? "生成済" : "未生成"),
    ai_desc_status:
      data.ai_desc_status ?? (data.ai_description || data.description ? "生成済" : "未生成"),
    listing_status: data.listing_status ?? "-",
    images: data.images ?? [],
  };

  const profitJudge =
    typeof normalized.profitRate === "number"
      ? judgeProfit(normalized.profitRate)
      : { status: "unset", label: "未計算", color: "gray" };

  return NextResponse.json({
    ...normalized,
    profitJudge: profitJudge.status,
    profitJudgeLabel: profitJudge.label,
    profitJudgeColor: profitJudge.color,
  });
}
