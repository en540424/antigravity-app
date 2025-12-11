"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type SkuStatus = "shooting" | "editing" | "listing" | "done" | "none";

type SkuItem = {
  id: string;
  sku: string;
  title: string | null;
  status: SkuStatus | null;
  created_at: string;
};

export default function MobileUI({ onEdit }: { onEdit?: (item: SkuItem) => void } = {}) {
  const [items, setItems] = useState<SkuItem[]>([]);

  useEffect(() => {
    fetch("/api/sku-list", { cache: "no-store" })
      .then((r) => r.json())
      .then(setItems);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">
        📱 外注用SKU管理
      </h1>

      <div className="flex flex-col gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="
              bg-slate-800 
              rounded-xl 
              p-4 
              shadow-lg 
              transition-all
              border border-slate-700
            "
          >
            {/* SKU番号（大きく） */}
            <div className="text-xl font-bold tracking-wide mb-1">
              {item.sku}
            </div>

            {/* 商品名（長文でもスマホで見やすい） */}
            <div className="text-sm text-gray-300 mb-3">
              {item.title || "（商品名未設定）"}
            </div>

            {/* ボタングループ */}
            <div className="flex gap-2 flex-wrap">
              {onEdit && (
                <button
                  onClick={() => onEdit(item)}
                  className="
                    bg-blue-500 
                    text-white 
                    px-3 
                    py-1 
                    rounded-lg 
                    text-xs 
                    font-bold
                    hover:bg-blue-600
                  "
                >
                  ✏️ 編集
                </button>
              )}

              <Link
                href={`/sku/${item.id}`}
                className="
                  bg-green-500 
                  text-white 
                  px-3 
                  py-1 
                  rounded-lg 
                  text-xs 
                  font-bold
                  hover:bg-green-600
                  active:scale-[0.97]
                "
              >
                詳細
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
