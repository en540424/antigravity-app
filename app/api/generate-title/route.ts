import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { prompt } = await req.json();

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
        temperature: 0.6,
      }),
    });

    const json = await response.json();

    const aiText = json.choices?.[0]?.message?.content || "";

    return NextResponse.json({ title: aiText.trim() });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "API失敗" }, { status: 500 });
  }
}
