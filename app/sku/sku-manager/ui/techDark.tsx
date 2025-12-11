"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type SkuStatus = "shooting" | "editing" | "listing" | "done" | "none";

type SkuItem = {
  id: string;
  sku: string;
  title: string | null;
  status: SkuStatus | null;
  created_at: string;
};

export default function TechDarkUI({ onEdit }: { onEdit?: (item: SkuItem) => void } = {}) {
  const [items, setItems] = useState<SkuItem[]>([]);

  useEffect(() => {
    fetch("/api/sku-list", { cache: "no-store" })
      .then((r) => r.json())
      .then(setItems);
  }, []);

  return (
    <div className="bg-[#0a0f1c] min-h-screen text-blue-400 p-6">
      <h1 className="text-3xl font-bold border-b border-blue-600 pb-3 mb-6">
        ⚙ SKU MANAGER
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {items.map((item) => (
          <div
            key={item.id}
            className="p-5 bg-[#111827] rounded-xl border border-blue-700 hover:border-cyan-400 hover:shadow-xl transition"
          >
            <div className="font-mono text-xl text-cyan-300">{item.sku}</div>
            <div className="text-blue-200 mt-1">{item.title || "(未入力)"}</div>
            {onEdit && (
              <button
                onClick={() => onEdit(item)}
                className="mt-2 px-2 py-1 text-xs bg-blue-600 rounded hover:bg-blue-700"
              >
                ✏️ 編集
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
