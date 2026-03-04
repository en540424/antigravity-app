import "server-only";
import { getEbayAccessToken } from "@/app/lib/ebay/token";

const EBAY_API_BASE = "https://api.ebay.com";
const MARKETPLACE_ID = "EBAY_US";

async function fetchFromEbay(path: string) {
  const accessToken = await getEbayAccessToken();

  const res = await fetch(`${EBAY_API_BASE}${path}?marketplace_id=${MARKETPLACE_ID}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`eBay API error: ${res.status} ${text}`);
  }

  return res.json();
}

export async function listFulfillmentPolicies() {
  return fetchFromEbay("/sell/account/v1/fulfillment_policy");
}

export async function listPaymentPolicies() {
  return fetchFromEbay("/sell/account/v1/payment_policy");
}

export async function listReturnPolicies() {
  return fetchFromEbay("/sell/account/v1/return_policy");
}
