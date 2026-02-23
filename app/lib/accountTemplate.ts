// アカウント属性テンプレート（スケール・横展開用）
export interface AccountTemplate {
  name: string;
  email: string;
  role: "admin" | "outsourcing" | "viewer";
  kpiTarget?: number;
  notes?: string;
}

export const defaultAccountTemplates: AccountTemplate[] = [
  { name: "管理者A", email: "adminA@example.com", role: "admin", kpiTarget: 1000 },
  { name: "外注B", email: "outsourcingB@example.com", role: "outsourcing", kpiTarget: 300 },
  { name: "閲覧C", email: "viewerC@example.com", role: "viewer" },
];

export function getAccountTemplate(role: AccountTemplate["role"]) {
  return defaultAccountTemplates.filter((a) => a.role === role);
}
