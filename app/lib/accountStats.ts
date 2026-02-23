// アカウント別集計用ダミー
export async function getAccountSummary() {
  return [
    { account: "A", skus: 400, profit: 400000 },
    { account: "B", skus: 300, profit: 300000 },
    { account: "C", skus: 500, profit: 500000 },
  ];
}
