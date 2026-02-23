import { getAllSkusWithStats } from "../lib/skuStats";
import { getProfitSummary } from "../lib/profitStats";
import { getAiStatusSummary } from "../lib/aiStats";
import { getOutsourcingSummary } from "../lib/outsourcingStats";
import { getAccountSummary } from "../lib/accountStats";

export default async function KPISummaryPage() {
  // SKU/利益/AI/作業効率/外注/アカウント別集計を取得
  const [skuStats, profitStats, aiStats, outsourcingStats, accountStats] = await Promise.all([
    getAllSkusWithStats(),
    getProfitSummary(),
    getAiStatusSummary(),
    getOutsourcingSummary(),
    getAccountSummary(),
  ]);

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold">KPIダッシュボード</h1>
      <section>
        <h2 className="text-xl font-semibold mb-2">SKU集計</h2>
        <pre>{JSON.stringify(skuStats, null, 2)}</pre>
      </section>
      <section>
        <h2 className="text-xl font-semibold mb-2">利益集計</h2>
        <pre>{JSON.stringify(profitStats, null, 2)}</pre>
      </section>
      <section>
        <h2 className="text-xl font-semibold mb-2">AI生成状況</h2>
        <pre>{JSON.stringify(aiStats, null, 2)}</pre>
      </section>
      <section>
        <h2 className="text-xl font-semibold mb-2">外注作業効率</h2>
        <pre>{JSON.stringify(outsourcingStats, null, 2)}</pre>
      </section>
      <section>
        <h2 className="text-xl font-semibold mb-2">アカウント別集計</h2>
        <pre>{JSON.stringify(accountStats, null, 2)}</pre>
      </section>
    </div>
  );
}
