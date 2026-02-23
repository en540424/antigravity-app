import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET() {
  const clientId = process.env.EBAY_CLIENT_ID!;
  const redirectUri = process.env.EBAY_REDIRECT_URI!;
  const scopes = process.env.EBAY_SCOPES!;
  const state = crypto.randomBytes(16).toString("hex");

  const authorizeUrl =
    "https://auth.ebay.com/oauth2/authorize" +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&state=${encodeURIComponent(state)}`;

  // ★一旦これでURLを表示（リダイレクトしない）
  return NextResponse.json({
    clientId,
    redirectUri,
    scopes,
    authorizeUrl,
  });
}
