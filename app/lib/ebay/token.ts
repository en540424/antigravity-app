import "server-only";

export async function getEbayAccessToken(): Promise<string> {
  const clientId = process.env.EBAY_CLIENT_ID || "";
  const clientSecret = process.env.EBAY_CLIENT_SECRET || "";
  const refreshToken = process.env.EBAY_REFRESH_TOKEN || "";

  console.log("EBAY_ENV_CHECK", {
    clientIdHead: clientId.slice(0, 12),
    refreshLen: refreshToken.length,
    refreshTail: refreshToken.slice(-6),
  });

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing EBAY env vars");
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const body = new URLSearchParams();
  body.set("grant_type", "refresh_token");
  body.set("refresh_token", refreshToken);
  if (process.env.EBAY_SCOPES) {
    body.set("scope", process.env.EBAY_SCOPES);
  }

  const res = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body,
  });

  const text = await res.text();
  console.log("EBAY TOKEN RESPONSE:", text);
  const json = JSON.parse(text);
  if (!res.ok) {
    throw new Error(`eBay token refresh failed: ${JSON.stringify(json)}`);
  }

  const accessToken = json.access_token as string | undefined;
  if (!accessToken) {
    throw new Error("eBay token refresh failed: missing access_token");
  }

  return accessToken;
}
