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

    const { title, brand, model, color, notes, sku, sku_id } = body as {
      title?: string | null;
      brand?: string | null;
      model?: string | null;
      color?: string | null;
      notes?: string | null;
      sku?: string | null;
      sku_id?: string | null;
    };

    if (![title, brand, model, color, notes].some(Boolean)) {
      return errorResponse("入力情報が不足しています", 400);
    }

    const prompt = `
You are an eBay listing copywriter. Using the provided details, write a concise English description (4-6 sentences) suitable for a used item. Keep it factual and friendly, highlight notable features, and avoid guarantees about accessories unless stated. Do not use markdown or HTML; return plain text only.

SKU: ${sku ?? "N/A"}
Title: ${title ?? "N/A"}
Brand: ${brand ?? "Unknown"}
Model: ${model ?? "Unknown"}
Color: ${color ?? "Unknown"}
Notes: ${notes ?? "None"}
`;

    // ここから差し替え（リトライロジック）
    const maxAttempts = 2;
    let result: any = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      result = await generateTextWithFallback({ prompt, preferred: "openai" });

      if (result?.ok) break;

      // 1回目失敗したら少し待って再試行（軽い一時障害対策）
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 400));
      }
    }

    if (!result?.ok) {
      const errMsg = "message" in result ? result.message : "AI生成に失敗しました";
      const details = "details" in result ? result.details : undefined;
      return NextResponse.json({ error: errMsg, details }, { status: 502 });
    }
    // ここまで差し替え

    if (sku_id) {
      try {
        await logApi({ sku_id, user_id: user.id, action: "ai_description", model: result.model || result.provider });
      } catch (logError) {
        console.warn("logApi failed:", logError);
      }
    }

    console.info("[ai-description]", {
      provider_used: result.provider,
      fallback_used: result.fallbackUsed,
    });

    return NextResponse.json({
      description: result.text,
      provider_used: result.provider,
      fallback: result.fallbackUsed,
      model: result.model,
    });
  } catch (error: any) {
    const status = error?.status ?? 502;
    const message = error?.message ?? "AI生成に失敗しました";
    return NextResponse.json({ error: message }, { status });
  }
}
