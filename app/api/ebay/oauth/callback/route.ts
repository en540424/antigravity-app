import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/app/utils/supabase/server";
import { requireAuth } from "@/app/api/_lib/auth";

function toBasicAuth(clientId: string, clientSecret: string) {
  const raw = `${clientId}:${clientSecret}`;
  return Buffer.from(raw).toString("base64");
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    const errorDesc = url.searchParams.get("error_description");

    if (error) {
      return NextResponse.json(
        { error, error_description: errorDesc },
        { status: 400 }
      );
    }
    if (!code) {
      return NextResponse.json({ error: "missing_code" }, { status: 400 });
    }

    // CSRFチェック（startで入れたcookieと一致するか）
    const cookieState = req.cookies.get("ebay_oauth_state")?.value;
    if (!cookieState || !state || cookieState !== state) {
      return NextResponse.json({ error: "invalid_state" }, { status: 400 });
    }

    const clientId = process.env.EBAY_CLIENT_ID!;
    const clientSecret = process.env.EBAY_CLIENT_SECRET!;
    const redirectUri = process.env.EBAY_REDIRECT_URI!;
    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.json({ error: "missing_env" }, { status: 500 });
    }

    // ここは「ログイン中ユーザーに紐づけて保存」したいので requireAuth 推奨
    const { user } = await requireAuth(req);
    const userId = user.id;

    // code -> token交換
    const body = new URLSearchParams();
    body.set("grant_type", "authorization_code");
    body.set("code", code);
    body.set("redirect_uri", redirectUri);

    const tokenRes = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${toBasicAuth(clientId, clientSecret)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const tokenJson = await tokenRes.json();

    if (!tokenRes.ok) {
      return NextResponse.json(
        { error: "token_exchange_failed", details: tokenJson },
        { status: 400 }
      );
    }

    // 返却例：access_token, refresh_token, expires_in, refresh_token_expires_in, scope, token_type
    const refreshToken = tokenJson.refresh_token as string | undefined;
    if (!refreshToken) {
      return NextResponse.json(
        { error: "missing_refresh_token", details: tokenJson },
        { status: 400 }
      );
    }

    const supabase = await getServerSupabase();

    // refresh_tokenをDBへ保存（フロントに絶対出さない）
    const { error: dbErr } = await supabase
      .from("ebay_oauth_tokens")
      .upsert({
        user_id: userId,
        refresh_token: refreshToken,
        scope: tokenJson.scope ?? null,
        expires_in: tokenJson.expires_in ?? null,
        updated_at: new Date().toISOString(),
      });

    if (dbErr) {
      return NextResponse.json({ error: "db_save_failed", details: dbErr }, { status: 500 });
    }

    // cookieのstateは使い捨て
    const res = NextResponse.redirect(new URL("/settings/ebay?connected=1", req.url));
    res.cookies.set("ebay_oauth_state", "", { path: "/", maxAge: 0 });

    return res;
  } catch (e: any) {
    return NextResponse.json(
      { error: "unexpected", message: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
