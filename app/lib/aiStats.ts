// AI生成状況集計用ダミー
export async function getAiStatusSummary() {
  return {
    generated: 1000,
    pending: 100,
    failed: 10,
    needRegenerate: 90,
  };
}
