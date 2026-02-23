// 利益集計用ダミー
export async function getProfitSummary() {
  return {
    totalProfit: 1200000,
    avgProfit: 1000,
    profitByMonth: [
      { month: "2025-12", profit: 120000 },
      { month: "2025-11", profit: 110000 },
    ],
  };
}
