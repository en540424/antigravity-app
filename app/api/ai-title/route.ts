import { NextResponse } from "next/server";
import { generateTextWithFallback } from "@/app/lib/aiProviders";

export async function POST(req: Request) {
  try {
    const { current, sku } = await req.json();

    const prompt = `
あなたはプロのeBay SEOライターです。
以下の情報をもとに、80文字以内の商品タイトルを作成してください。
・SKU: ${sku}
・現在のタイトル: ${current}

注意点:
・英語で書く
・検索されやすいキーワードを優先
・不要な単語は使わない
・80文字以内で収める
    `;

    const result = await generateTextWithFallback({ prompt, preferred: "openai", maxTokens: 100, temperature: 0.3 });

    if (!result.ok) {
      const errResult = result as { message: string; details?: unknown };
      return NextResponse.json({ error: errResult.message, details: errResult.details }, { status: 502 });
    }

    const aiTitle = result.text?.trim() || "";

    return NextResponse.json({
      title: aiTitle,
      provider_used: result.provider,
      fallback: result.fallbackUsed,
      model: result.model,
    });
  } catch (error) {
    console.error("AI error:", error);
    return NextResponse.json({ error: "AI生成エラー" }, { status: 502 });
  }
}
