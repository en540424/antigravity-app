// app/lib/aiProviders.ts
// OpenAI → 失敗時 Gemini に自動フォールバックする共通クライアント（fetchのみ）
//
// 期待する環境変数：
// - OPENAI_API_KEY
// - OPENAI_MODEL (optional) 例: gpt-4o-mini / gpt-4.1-mini など
// - GEMINI_API_KEY
// - GEMINI_MODEL (optional) 例: gemini-1.5-flash / gemini-1.5-pro など
//
// 使い方（例）:
// const res = await generateTextWithFallback({ prompt, preferred: "openai" });
// res.text / res.provider / res.fallbackUsed などを使う

export type AiProvider = "openai" | "gemini";

export type AiResult = {
	ok: true;
	provider: AiProvider;          // 実際に使われたプロバイダ
	preferred: AiProvider;         // 指定した優先プロバイダ
	fallbackUsed: boolean;         // フォールバックしたか
	model?: string;                // 実際に使ったモデル名
	text: string;                  // 生成テキスト（単一）
};

export type AiErrorResult = {
	ok: false;
	providerTried: AiProvider[];   // 試した順
	preferred: AiProvider;
	message: string;
	details?: any;
};

export type GenerateTextArgs = {
	prompt: string;
	preferred?: AiProvider;        // default: "openai"
	// どのモデルを使うか（環境変数より優先）
	openaiModel?: string;
	geminiModel?: string;

	// 生成パラメータ（必要なら増やせる）
	temperature?: number;          // default: 0.3
	maxTokens?: number;            // OpenAI用（default: 900）
	// Geminiは maxOutputTokens（default: 900）として送る
};

function isQuotaOrRateLimit(err: any) {
	// OpenAI: insufficient_quota / rate_limit_exceeded / 429
	const code = err?.error?.code || err?.code;
	const type = err?.error?.type || err?.type;
	const status = err?.status || err?.statusCode;

	if (status === 429) return true;
	if (code === "insufficient_quota") return true;
	if (code === "rate_limit_exceeded") return true;
	if (type === "insufficient_quota") return true;
	if (type === "rate_limit_exceeded") return true;
	return false;
}

function shortText(s: string, n = 2000) {
	if (!s) return s;
	return s.length > n ? s.slice(0, n) + "…" : s;
}

async function callOpenAIText(args: GenerateTextArgs): Promise<AiResult> {
	const apiKey = process.env.OPENAI_API_KEY;
	if (!apiKey) {
		throw Object.assign(new Error("OPENAI_API_KEY is missing"), {
			status: 400,
			error: { code: "missing_openai_key" },
		});
	}

	const model = args.openaiModel || process.env.OPENAI_MODEL || "gpt-4o-mini";
	const temperature = args.temperature ?? 0.3;
	const maxTokens = args.maxTokens ?? 900;

	// Chat Completionsでシンプルに呼ぶ
	const res = await fetch("https://api.openai.com/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			model,
			temperature,
			max_tokens: maxTokens,
			messages: [
				{
					role: "system",
					content:
						"You are a helpful assistant that writes concise, sales-friendly product descriptions for eBay. Return plain text only.",
				},
				{ role: "user", content: args.prompt },
			],
		}),
	});

	const json = await res.json().catch(() => ({}));

	if (!res.ok) {
		// OpenAIのエラー形式をそのまま持ち上げてthrow
		const err = Object.assign(new Error(json?.error?.message || "OpenAI call failed"), {
			status: res.status,
			error: json?.error ?? json,
		});
		throw err;
	}

	const text =
		json?.choices?.[0]?.message?.content ??
		json?.choices?.[0]?.text ??
		"";

	return {
		ok: true,
		provider: "openai",
		preferred: (args.preferred || "openai") as AiProvider,
		fallbackUsed: false,
		model,
		text: (text || "").trim(),
	};
}

async function callGeminiText(args: GenerateTextArgs): Promise<AiResult> {
	const apiKey = process.env.GEMINI_API_KEY;
	if (!apiKey) {
		throw Object.assign(new Error("GEMINI_API_KEY is missing"), {
			status: 400,
			error: { code: "missing_gemini_key" },
		});
	}

	const model = args.geminiModel || process.env.GEMINI_MODEL || "gemini-1.5-flash";
	const temperature = args.temperature ?? 0.3;
	const maxOutputTokens = args.maxTokens ?? 900;

	// Google AI Studio (Generative Language API)
	const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
		model
	)}:generateContent?key=${encodeURIComponent(apiKey)}`;

	const res = await fetch(url, {
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
				maxOutputTokens,
			},
		}),
	});

	const json = await res.json().catch(() => ({}));

	if (!res.ok) {
		const msg =
			json?.error?.message ||
			json?.message ||
			"Gemini call failed";
		const err = Object.assign(new Error(msg), {
			status: res.status,
			error: json?.error ?? json,
		});
		throw err;
	}

	const text =
		json?.candidates?.[0]?.content?.parts
			?.map((p: any) => p?.text)
			?.filter(Boolean)
			?.join("") ?? "";

	return {
		ok: true,
		provider: "gemini",
		preferred: (args.preferred || "openai") as AiProvider,
		fallbackUsed: false,
		model,
		text: (text || "").trim(),
	};
}

/**
 * OpenAI優先（or Gemini優先）で生成し、失敗したら自動的にもう片方へフォールバック。
 * - quota/429/5xx は当然フォールバック
 * - それ以外も「止まらない」を最優先してフォールバック
 */
export async function generateTextWithFallback(
	args: GenerateTextArgs
): Promise<AiResult | AiErrorResult> {
	const preferred: AiProvider = args.preferred ?? "openai";
	const primary = preferred;
	const secondary: AiProvider = preferred === "openai" ? "gemini" : "openai";

	const tried: AiProvider[] = [];

	const tryCall = async (p: AiProvider) => {
		tried.push(p);
		if (p === "openai") return await callOpenAIText({ ...args, preferred });
		return await callGeminiText({ ...args, preferred });
	};

	// 1) まず優先プロバイダ
	try {
		const r = await tryCall(primary);
		return r;
	} catch (e1: any) {
		const status1 = e1?.status;
		const details1 = e1?.error ?? e1;

		// フォールバック条件（「止まらない」最優先）
		const shouldFallback =
			isQuotaOrRateLimit(e1) ||
			status1 === 500 ||
			status1 === 502 ||
			status1 === 503 ||
			status1 === 504 ||
			// ここを厳しめにしたいなら↓を外す
			true;

		if (!shouldFallback) {
			return {
				ok: false,
				providerTried: tried,
				preferred,
				message: `Primary provider failed and fallback is disabled.`,
				details: details1,
			};
		}

		// 2) もう片方へ
		try {
			const r2 = await tryCall(secondary);
			return {
				...r2,
				fallbackUsed: true,
			};
		} catch (e2: any) {
			const details2 = e2?.error ?? e2;
			return {
				ok: false,
				providerTried: tried,
				preferred,
				message:
					`Both providers failed. ` +
					`primary(${primary}): ${shortText(e1?.message || "unknown")} / ` +
					`fallback(${secondary}): ${shortText(e2?.message || "unknown")}`,
				details: { primary: details1, fallback: details2 },
			};
		}
	}
}
export type ProductInfo = {
  sku?: string | null;
  title?: string | null;
  brand?: string | null;
  model?: string | null;
  color?: string | null;
  notes?: string | null;
};

export type Provider = "openai" | "gemini";

type ProviderFailure = {
  provider: Provider;
  status?: number;
  code?: string;
  retryable: boolean;
  fallbackReason?: string;
  message: string;
};

const OPENAI_MODEL = "gpt-4o-mini";
const GEMINI_MODEL = "gemini-1.5-flash";

const systemPrompt = `You are an eBay listing copywriter. Using the provided details, write a concise English description (4-6 sentences) suitable for a used item. Keep it factual and friendly, highlight notable features, and avoid guarantees about accessories unless stated. Do not use markdown or HTML; return plain text only.`;

const buildUserMessage = (input: DescriptionInput) => `
SKU: ${input.sku ?? "N/A"}
Title: ${input.title ?? "N/A"}
Brand: ${input.brand ?? "Unknown"}
Model: ${input.model ?? "Unknown"}
Color: ${input.color ?? "Unknown"}
Notes: ${input.notes ?? "None"}
`;

const toFailure = (err: Partial<ProviderFailure>): ProviderFailure => ({
	provider: err.provider || "openai",
	retryable: false,
	message: err.message || "provider_error",
	status: err.status,
	code: err.code,
	fallbackReason: err.fallbackReason,
});

export async function generateWithOpenAI(input: DescriptionInput, signal?: AbortSignal): Promise<string> {
	if (!process.env.OPENAI_API_KEY) {
		throw toFailure({
			provider: "openai",
			retryable: false,
			fallbackReason: "openai_api_key_missing",
			message: "OpenAI API key missing",
		});
	}

	const res = await fetch("https://api.openai.com/v1/chat/completions", {
		method: "POST",
		signal,
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
		},
		body: JSON.stringify({
			model: OPENAI_MODEL,
			messages: [
				{ role: "system", content: systemPrompt },
				{ role: "user", content: buildUserMessage(input) },
			],
			temperature: 0.4,
			max_tokens: 320,
		}),
	});

	const text = await res.text();
	if (!res.ok) {
		let parsed: any = null;
		try {
			parsed = JSON.parse(text);
		} catch {}
		const code = parsed?.error?.code;
		const status = res.status;
		const failure = toFailure({
			provider: "openai",
			status,
			code,
			message: parsed?.error?.message || text || "OpenAI error",
		});

		if (code === "insufficient_quota") {
			failure.retryable = false;
			failure.fallbackReason = "insufficient_quota";
		} else if (status === 429) {
			failure.retryable = true;
			failure.fallbackReason = "rate_limit";
		} else if (status >= 500 && status < 600) {
			failure.retryable = true;
			failure.fallbackReason = "server_error";
		}
		throw failure;
	}

	let data: any = null;
	try {
		data = JSON.parse(text);
	} catch (e) {
		throw toFailure({ provider: "openai", message: "OpenAI response parse failed" });
	}

	const description = data?.choices?.[0]?.message?.content?.trim();
	if (!description) {
		throw toFailure({ provider: "openai", message: "OpenAI returned empty description" });
	}
	return description;
}

export async function generateWithGemini(input: DescriptionInput, signal?: AbortSignal): Promise<string> {
	if (!process.env.GEMINI_API_KEY) {
		throw toFailure({
			provider: "gemini",
			retryable: false,
			fallbackReason: "gemini_api_key_missing",
			message: "Gemini API key missing",
		});
	}

	const res = await fetch(
		`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
		{
			method: "POST",
			signal,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				contents: [
					{
						role: "user",
						parts: [{ text: `${systemPrompt}\n\n${buildUserMessage(input)}` }],
					},
				],
				generationConfig: {
					temperature: 0.4,
					maxOutputTokens: 320,
				},
			}),
		}
	);

	const json = await res.json().catch(() => null);
	if (!res.ok) {
		throw toFailure({
			provider: "gemini",
			status: res.status,
			message: json?.error?.message || "Gemini error",
			fallbackReason: "gemini_failure",
		});
	}

	const description = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
	if (!description) {
		throw toFailure({ provider: "gemini", message: "Gemini returned empty description" });
	}
	return description;
}

export const randomDelay = (minMs: number, maxMs: number) => {
	const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
	return new Promise((resolve) => setTimeout(resolve, ms));
};

type GenerateResult = {
	description: string;
	providerUsed: Provider;
	fallback: boolean;
	fallbackReason?: "insufficient_quota" | "rate_limit" | "server_error";
};

/**
 * Try OpenAI first; on quota/429/5xx/fetch errors fall back to Gemini.
 */
export async function generateDescription(input: DescriptionInput): Promise<GenerateResult> {
	let description = "";
	let providerUsed: Provider = "openai";
	let fallback = false;
	let fallbackReason: GenerateResult["fallbackReason"];

	const tryOpenAI = async () => {
		description = await generateWithOpenAI(input);
	};

	try {
		await tryOpenAI();
	} catch (err: any) {
		const reason = (err?.fallbackReason as GenerateResult["fallbackReason"]) || undefined;
		const retryable = Boolean(err?.retryable) || reason === "rate_limit" || reason === "server_error";

		if (reason === "insufficient_quota") {
			fallback = true;
			fallbackReason = reason;
		} else if (retryable) {
			await randomDelay(800, 1200);
			try {
				await tryOpenAI();
			} catch (retryErr: any) {
				fallback = true;
				fallbackReason = (retryErr?.fallbackReason as GenerateResult["fallbackReason"]) || reason || "server_error";
			}
		} else {
			fallback = true;
			fallbackReason = reason || "server_error";
		}

		if (fallback) {
			description = await generateWithGemini(input);
			providerUsed = "gemini";
		}
	}

	return { description, providerUsed, fallback, fallbackReason };
}
