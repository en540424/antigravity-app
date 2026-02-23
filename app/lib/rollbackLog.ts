// app/lib/rollbackLog.ts
// 障害・ロールバック運用のための記録・即時停止・ロールバック用ユーティリティ

export type RollbackLog = {
  timestamp: string;
  type: "UI" | "AI" | "出品" | "データ" | "その他";
  description: string;
  affected: string; // 影響範囲
  action: string;   // 対応内容
};

// ログ保存（仮: ローカルストレージ or API連携に拡張可）
export function saveRollbackLog(log: RollbackLog) {
  const logs = getRollbackLogs();
  logs.push(log);
  localStorage.setItem("rollbackLogs", JSON.stringify(logs));
}

export function getRollbackLogs(): RollbackLog[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem("rollbackLogs");
  return raw ? JSON.parse(raw) : [];
}

export function clearRollbackLogs() {
  localStorage.removeItem("rollbackLogs");
}
