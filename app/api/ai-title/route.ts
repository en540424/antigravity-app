import { NextResponse } from "next/server";

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

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, // ← あなたのAPIキー
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 100,
      }),
    });

    const data = await res.json();

    const aiTitle = data.choices?.[0]?.message?.content?.trim();

    return NextResponse.json({
      title: aiTitle ?? "",
    });
  } catch (error) {
    console.error("AI error:", error);
    return NextResponse.json({ error: "AI生成エラー" }, { status: 500 });
  }
}
