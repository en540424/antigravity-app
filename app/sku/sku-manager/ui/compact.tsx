// Compact UI: 最小表示の簡易カード。`simple.tsx` と似ているので用途が重複する場合は統合を検討してください。
"use client";

import React from "react";

type SkuItem = {
  id: string;
  sku: string;
  title: string | null;
  status: string | null;
  created_at: string;
};

export default function CompactCards({ onEdit }: { onEdit?: (item: SkuItem) => void } = {}) {
  return (
    <div className="p-4 text-sm text-slate-300">Compact UI（プレースホルダ）</div>
  );
}
