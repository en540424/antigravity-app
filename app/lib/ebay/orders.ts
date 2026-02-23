import "server-only";
import { getEbayAccessToken } from "./token";

type EbayLineItem = {
  lineItemId: string;
  sku?: string;
  quantity: number;
  title?: string;
};

export type EbayOrder = {
  orderId: string;
  lastModifiedDate?: string;
  lineItems: EbayLineItem[];
};

export async function fetchRecentOrders(hoursBack = 2): Promise<EbayOrder[]> {
  const token = await getEbayAccessToken();

  const now = new Date();
  const from = new Date(now.getTime() - hoursBack * 60 * 60 * 1000);
  const fromIso = from.toISOString();

  const url = new URL("https://api.ebay.com/sell/fulfillment/v1/order");
  url.searchParams.set("filter", `lastmodifieddate:[${fromIso}..]`);
  url.searchParams.set("limit", "50");

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(`getOrders failed: ${JSON.stringify(json)}`);
  }

  return (json.orders ?? []) as EbayOrder[];
}
