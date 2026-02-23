import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/api/_lib/auth";
import { logApi } from "@/app/api/_lib/log";
import { generateTextWithFallback } from "@/app/api/_aiProviders";

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const body = await req.json().catch(() => null);
    if (!body) {
      return errorResponse("不正なリクエスト", 400);
    }

    const { description, sku_id } = body as { description?: string | null; sku_id?: string | null };

    if (!description) {
      return errorResponse("description が必要です", 400);
    }
    const prompt = `
You are a professional translator. Translate the provided English eBay listing description into natural Japanese for buyers. Keep it concise, factual, and free of markdown or HTML.

English description:
${description}
`;

    const result = await generateTextWithFallback({
      prompt,
      preferred: "gemini",
      temperature: 0.3,
      maxTokens: 320,
    });

      if (!result.ok) {
        const errMsg = "message" in result ? result.message : "AI生成に失敗しました";
        const details = "details" in result ? result.details : undefined;
        return NextResponse.json({ error: errMsg, details }, { status: 502 });
    }

    const description_ja = result.text?.trim();

    if (!description_ja) {
      return errorResponse("AI生成結果を取得できませんでした", 502);
    }

    if (sku_id) {
      try {
        await logApi({ sku_id, user_id: user.id, action: "ai_description_ja", model: result.model || result.provider });
      } catch (logError) {
        console.warn("logApi failed:", logError);
      }
    }

    return NextResponse.json({
      description_ja,
      provider_used: result.provider,
      fallback: result.fallbackUsed,
      model: result.model,
    });
  } catch (error: any) {
    const status = error?.status ?? 502;
    const message = error?.message ?? "サーバーエラーが発生しました";
    return NextResponse.json({ error: message }, { status });
  }
}
