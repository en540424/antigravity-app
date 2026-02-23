// 外注作業効率集計用ダミー
export async function getOutsourcingSummary() {
  return {
    totalTasks: 500,
    completed: 480,
    pending: 20,
    avgCompletionTime: 2.5, // 日
  };
}
