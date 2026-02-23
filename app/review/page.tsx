"use client";
import { useState } from "react";

const checklistItems = [
  { label: "SKU登録数・増加数の確認", key: "sku" },
  { label: "利益・利益率の確認", key: "profit" },
  { label: "AI生成状況の確認", key: "ai" },
  { label: "外注作業進捗の確認", key: "outsourcing" },
  { label: "障害・ロールバック記録の確認", key: "rollback" },
  { label: "改善点の決定・記録", key: "improvement" },
];

export default function ReviewChecklistPage() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  return (
    <div className="p-8 max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold mb-4">定期レビュー チェックリスト</h1>
      <ul className="space-y-3">
        {checklistItems.map((item) => (
          <li key={item.key} className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={!!checked[item.key]}
              onChange={() => setChecked((c) => ({ ...c, [item.key]: !c[item.key] }))}
              className="w-5 h-5"
            />
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={Object.keys(checked).length !== checklistItems.length || Object.values(checked).some((v) => !v)}
        >
          レビュー完了として記録
        </button>
      </div>
    </div>
  );
}
