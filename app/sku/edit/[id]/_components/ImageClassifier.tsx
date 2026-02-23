"use client";

import React, { useEffect, useRef, useState } from "react";

export default function WorkflowsPage() {
  const [loading, setLoading] = useState(false);
  const [historyCount, setHistoryCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // とりあえずダミー
    setHistoryCount(0);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">役員ツール</h1>
          <p className="text-sm text-gray-500 mt-1">写真・PDFを素早く加工</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        <button
          className="w-full rounded-lg bg-black text-white py-3 font-semibold disabled:opacity-50"
          disabled={loading}
          onClick={() => fileInputRef.current?.click()}
        >
          画像を選ぶ（テスト）
        </button>

        <div className="mt-6 text-sm text-gray-600">
          履歴件数（ダミー）：{historyCount}
        </div>
      </main>

      <input ref={fileInputRef} type="file" className="hidden" />
    </div>
  );
}
