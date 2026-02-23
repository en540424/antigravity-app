// 利益・利益率計算（コアロジック）
export function calcProfitAndRate({
  expected_price,
  cost,
  ebay_fee_rate,
  payment_fee_rate,
  domestic_shipping = 0,
  international_shipping = 0,
}: {
  expected_price?: number;
  cost?: number;
  ebay_fee_rate?: number;
  payment_fee_rate?: number;
  domestic_shipping?: number;
  international_shipping?: number;
}) {
  if (
    typeof expected_price !== "number" ||
    typeof cost !== "number" ||
    isNaN(expected_price) ||
    isNaN(cost)
  ) {
    return { profit: null, profit_rate: null };
  }
  const ebayFee = typeof ebay_fee_rate === "number" ? (expected_price * ebay_fee_rate) / 100 : 0;
  const paymentFee = typeof payment_fee_rate === "number" ? (expected_price * payment_fee_rate) / 100 : 0;
  const shipping =
    (typeof domestic_shipping === "number" ? domestic_shipping : 0) +
    (typeof international_shipping === "number" ? international_shipping : 0);
  const profit = expected_price - cost - ebayFee - paymentFee - shipping;
  const profit_rate = expected_price > 0 ? Math.round((profit / expected_price) * 1000) / 10 : null;
  return { profit, profit_rate };
}
