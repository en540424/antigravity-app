// 利益率判定ルール（将来は設定画面で変更可）
export const PROFIT_RULE = {
  ok: 10,        // 10%以上 → 出品OK
  warning: 5,    // 5%以上10%未満 → 要再検討
  ng: 5          // 5%未満 → 出品NG
};

export type ProfitJudgeResult = {
  status: 'ok' | 'warning' | 'ng' | 'unset';
  label: string;
  color: 'green' | 'yellow' | 'red' | 'gray';
};

// 利益率判定関数（API・UI共通で利用）
export function judgeProfit(profitRate?: number): ProfitJudgeResult {
  if (profitRate === undefined || isNaN(profitRate)) {
    return { status: 'unset', label: '未計算', color: 'gray' };
  }
  if (profitRate >= PROFIT_RULE.ok) {
    return { status: 'ok', label: '出品OK', color: 'green' };
  }
  if (profitRate >= PROFIT_RULE.warning) {
    return { status: 'warning', label: '要再検討', color: 'yellow' };
  }
  return { status: 'ng', label: '出品NG', color: 'red' };
}
