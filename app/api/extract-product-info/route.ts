import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

/**
 * 画像からAIが抽出する情報の型
 */
export interface ExtractedProductInfo {
  genre: string;           // カメラ・家電・時計・服 etc.
  brand: string;           // SONY / Nikon / Casio / Uniqlo
  model: string;           // 型番：NW-A45 / ILCE-6000 / GA-2100
  color: string;           // 色
  condition: string;       // 商品状態：新品・未使用・美品・良好・可 etc.
  ebayCategory: string;    // eBayカテゴリ番号
  titleOptimized: string;  // タイトル最適化
  description: string;     // 説明文
  itemSpecifics: Record<string, string>;  // Item Specifics
}

export async function POST(req: Request) {
  try {
    const { imageUrl, sku } = await req.json();

    if (!imageUrl || !sku) {
      return NextResponse.json(
        { error: "imageUrl and sku are required" },
        { status: 400 }
      );
    }

    // 画像URLから画像を取得
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch image" },
        { status: 400 }
      );
    }

    // 画像をBase64エンコード
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString("base64");
    const imageType = imageResponse.headers.get("content-type") || "image/jpeg";

    // OpenAI Vision API を使用して画像解析
    const visionPrompt = `
あなたは eBay に出品する商品の情報を抽出する専門家です。
提供された商品画像を分析して、以下の情報を JSON 形式で抽出してください。

抽出する情報:
1. genre: 商品ジャンル（カメラ・家電・時計・服・スポーツ・おもちゃ・楽器など）
2. brand: ブランド名（SONY、Nikon、Casio、Uniqlo など、不明な場合は "Unknown"）
3. model: 型番・モデル番号（見える場合。例: NW-A45、ILCE-6000、GA-2100。不明な場合は "Unknown"）
4. color: 色（黒、白、シルバー、ゴールド、赤、青など）
5. condition: 商品状態（新品未使用、新品・未開封、美品、良好、可、要修理など）
6. ebayCategory: eBayカテゴリ番号（例: 171485 = Cameras & Photography, 26516 = Digital Cameras）
7. titleOptimized: eBay出品用に最適化された日本語タイトル（80文字以内）
8. description: 商品説明（日本語、200文字程度）
9. itemSpecifics: Item Specifics（JSON オブジェクト形式。例: {"Brand": "SONY", "Model": "ILCE-6000"}）

回答は以下の JSON 形式で返してください（他の説明は不要）:
{
  "genre": "...",
  "brand": "...",
  "model": "...",
  "color": "...",
  "condition": "...",
  "ebayCategory": "...",
  "titleOptimized": "...",
  "description": "...",
  "itemSpecifics": {...}
}
    `;

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4-vision",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: visionPrompt,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageUrl,
                  },
                },
              ],
            },
          ],
          max_tokens: 1500,
          temperature: 0.3,
        }),
      }
    );

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error("OpenAI error:", errorData);
      return NextResponse.json(
        { error: "OpenAI API error" },
        { status: 500 }
      );
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices?.[0]?.message?.content || "";

    // JSON を抽出（マークダウンコードブロックで囲まれている場合に対応）
    let jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
    let jsonString = jsonMatch ? jsonMatch[1] : content;

    // JSON がパースできない場合の複数試行
    if (!jsonMatch) {
      jsonMatch = content.match(/\{[\s\S]*\}/);
      jsonString = jsonMatch ? jsonMatch[0] : content;
    }

    let extractedInfo: ExtractedProductInfo;
    try {
      extractedInfo = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "content:", content);
      return NextResponse.json(
        { error: "Failed to parse AI response", content },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sku,
      extractedInfo,
    });
  } catch (error) {
    console.error("Error in extract-product-info:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
