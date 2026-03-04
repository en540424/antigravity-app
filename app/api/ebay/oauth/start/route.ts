import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(req: Request) {
  const clientId = process.env.EBAY_CLIENT_ID!;
  const redirectUri = process.env.EBAY_REDIRECT_URI!;
  const scopes = process.env.EBAY_SCOPES!;
  const state = crypto.randomBytes(16).toString("hex");

  // ?debug=1 で実際に送るパラメータを確認できる（確認後削除）
  if (new URL(req.url).searchParams.get("debug") === "1") {
    return NextResponse.json({ clientId, redirectUri, scopes, authorizeUrl: "（生成前）" });
  }

  const authorizeUrl =
    "https://auth.ebay.com/oauth2/authorize" +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&state=${encodeURIComponent(state)}`;

  const res = NextResponse.redirect(authorizeUrl, { status: 302 });
  res.cookies.set("ebay_oauth_state", state, {
    httpOnly: true,
    path: "/",
    maxAge: 300, // 5分
  });
  return res;
}
