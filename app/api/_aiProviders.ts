type Provider = "openai" | "gemini";

export type GenerateTextArgs = {
  prompt: string;
  preferred?: Provider; // default: "gemini"
  // ざっくり調整用（必要になったら使う）
  temperature?: number; // default: 0.4
  maxTokens?: number; // OpenAI: max_tokens / Gemini: maxOutputTokens (目安)
};

export type GenerateTextResult =
  | {
      ok: true;
      text: string;
      provider: Provider;
      model?: string;
      fallbackUsed: boolean;
      details?: any;
    }
  | {
      ok: false;
      message: string;
      providerTried?: Provider[];
      details?: any;
    };

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

/**
 * public entry
 * - preferred をまず試す
 * - 失敗したらもう一方へ自動フォールバック
 */
export async function generateTextWithFallback(
  args: GenerateTextArgs
): Promise<GenerateTextResult & { fallbackUsed?: boolean; provider?: Provider }> {
  const preferred: Provider = args.preferred ?? "gemini";
  const order: Provider[] = preferred === "openai" ? ["openai", "gemini"] : ["gemini", "openai"];

  const tried: Provider[] = [];
  let lastErr: any = null;

  for (let i = 0; i < order.length; i++) {
    const provider = order[i];
    tried.push(provider);

    try {
      const res =
        provider === "openai"
          ? await callOpenAI(args)
          : await callGemini(args);

      if (res.ok) {
        return {
          ok: true,
          text: res.text,
          provider,
          model: res.model,
          fallbackUsed: i > 0,
          details: res.details,
        };
      }

      // 失敗結果（フォールバック可否判定）
      lastErr = res;
      if (!shouldFallback(res)) break; // ユーザー入力やプロンプト起因など「替えても無意味」なら止める
    } catch (e: any) {
      lastErr = normalizeUnknownError(e);
      if (!shouldFallback(lastErr)) break;
    }
  }

  return {
    ok: false,
    message: lastErr?.message ?? "AI生成に失敗しました",
    providerTried: tried,
    details: lastErr?.details ?? lastErr,
  };
}

/* -------------------------
   OpenAI (fetch)
------------------------- */
async function callOpenAI(args: GenerateTextArgs): Promise<{
  ok: boolean;
  text?: string;
  model?: string;
  message?: string;
  status?: number;
  details?: any;
  errorType?: string;
  errorCode?: string;
}> {
  if (!OPENAI_API_KEY) {
    return {
      ok: false,
      message: "OPENAI_API_KEY が未設定です",
      status: 401,
      errorType: "missing_key",
    };
  }

  const temperature = args.temperature ?? 0.4;
  const maxTokens = args.maxTokens ?? 400;

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: args.prompt },
      ],
    }),
  });

  const json = await safeJson(resp);

  if (!resp.ok) {
    const err = json?.error;
    return {
      ok: false,
      message: err?.message || `OpenAI error (${resp.status})`,
      status: resp.status,
      details: json,
      errorType: err?.type,
      errorCode: err?.code,
    };
  }

  const text = json?.choices?.[0]?.message?.content?.trim?.() ?? "";
  return {
    ok: true,
    text,
    model: json?.model ?? OPENAI_MODEL,
    details: { usage: json?.usage },
  };
}

/* -------------------------
   Gemini (AI Studio / v1beta)
------------------------- */
async function callGemini(args: GenerateTextArgs): Promise<{
  ok: boolean;
  text?: string;
  model?: string;
  message?: string;
  status?: number;
  details?: any;
  errorType?: string;
  errorCode?: string;
}> {
  if (!GEMINI_API_KEY) {
    return {
      ok: false,
      message: "GEMINI_API_KEY が未設定です",
      status: 401,
      errorType: "missing_key",
    };
  }

  const temperature = args.temperature ?? 0.4;
  const maxTokens = args.maxTokens ?? 512;

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: args.prompt }],
        },
      ],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    }),
  });

  const json = await safeJson(resp);

  if (!resp.ok) {
    // Gemini のエラー形式は { error: { message, status, code } } など
    const err = json?.error;
    return {
      ok: false,
      message: err?.message || `Gemini error (${resp.status})`,
      status: resp.status,
      details: json,
      errorType: err?.status,
      errorCode: String(err?.code ?? ""),
    };
  }

  const parts = json?.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((p: any) => p?.text ?? "").join("").trim();

  return {
    ok: true,
    text,
    model: GEMINI_MODEL,
    details: {
      promptFeedback: json?.promptFeedback,
      safetyRatings: json?.candidates?.[0]?.safetyRatings,
    },
  };
}

/* -------------------------
   Fallback policy
------------------------- */
function shouldFallback(err: any): boolean {
  const status = err?.status;

  // キー未設定 / 認証エラー / quota / rate limit / サーバーエラー → フォールバック価値あり
  if (status === 401) return true;
  if (status === 403) return true;
  if (status === 408) return true;
  if (status === 429) return true;
  if (status >= 500) return true;

  // OpenAI quotaの代表
  const code = String(err?.errorCode ?? "");
  const type = String(err?.errorType ?? "");
  if (code === "insufficient_quota") return true;
  if (type === "insufficient_quota") return true;

  // 400系は「プロンプト/入力が悪い」可能性が高いので基本フォールバックしない
  // （ただし "preferredが死んでる" のケースもあるので、必要ならここを true に変える）
  if (status >= 400 && status < 500) return false;

  // 不明ならフォールバックしてみる
  return true;
}

/* -------------------------
   Helpers
------------------------- */
async function safeJson(resp: Response) {
  try {
    return await resp.json();
  } catch {
    return null;
  }
}

function normalizeUnknownError(e: any) {
  return {
    ok: false,
    message: e?.message ?? "Unknown error",
    status: e?.status ?? 0,
    details: e,
  };
}
