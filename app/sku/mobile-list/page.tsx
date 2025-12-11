"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

// SKU型
type Item = {
  id: string;
  sku: string;
  title: string | null;
  status: string | null;
};

export default function MobileUI() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    fetch("/api/sku-list", { cache: "no-store" })
      .then((r) => r.json())
      .then(setItems);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">
        📱 外注用SKU管理（スマホ特化）
      </h1>

      <div className="flex flex-col gap-4">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/sku/${item.id}`}
            className="
              bg-slate-800 
              rounded-xl 
              p-4 
              shadow-lg 
              active:scale-[0.97]
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

            {/* 画像アップロードへのショートカット風ボタン */}
            <div className="flex gap-2">
              <span
                className="
                  bg-blue-500 
                  text-white 
                  px-3 
                  py-1 
                  rounded-lg 
                  text-xs 
                  font-bold
                "
              >
                画像UP
              </span>

              <span
                className="
                  bg-green-500 
                  text-white 
                  px-3 
                  py-1 
                  rounded-lg 
                  text-xs 
                  font-bold
                "
              >
                詳細
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
