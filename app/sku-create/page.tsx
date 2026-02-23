"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUserRole } from "@/app/utils/supabase/userRole";

export default function SkuCreatePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("shooting");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // 権限チェック（クライアント側簡易）
  // 本来はサーバー側で保護するのが理想
  const [role, setRole] = useState<string | null>(null);
  useEffect(() => {
    getCurrentUserRole().then(setRole);
  }, []);

  if (role && role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">権限がありません</h2>
          <p>SKU新規作成は管理者のみ可能です。</p>
        </div>
      </div>
    );
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      // SKU番号などはAPI側で自動生成
      const res = await fetch("/api/sku-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, status }),
      });
      if (!res.ok) throw new Error("作成に失敗しました");
      const data = await res.json();
      // 編集ページへ直行
      router.push(`/sku/${data.id}/edit?created=1`);
    } catch (e: any) {
      setError(e.message || "作成に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push("/sku/sku-manager");
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
      <div className="w-full max-w-md bg-slate-800 rounded-lg p-8 shadow-lg">
        <h1 className="text-2xl font-bold mb-2">SKU新規作成</h1>
        <p className="text-xs text-slate-400 mb-6">
          まずはSKUを作成し、後続作業（撮影・編集・出品）を進めます
        </p>
        <form onSubmit={handleCreate} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold mb-2">商品名（仮でOK）</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              className="w-full p-2 rounded bg-slate-700 text-white"
              maxLength={80}
              placeholder="例：カメラ本体"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">初期ステータス</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full p-2 rounded bg-slate-700 text-white"
            >
              <option value="shooting">📷 撮影待ち</option>
              <option value="editing">✂️ 編集待ち</option>
              <option value="listing">🛒 出品待ち</option>
              <option value="done">🏁 完了</option>
            </select>
          </div>
          {error && <div className="text-red-400 text-sm">{error}</div>}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-green-600 rounded hover:bg-green-700 disabled:opacity-50 font-bold"
            >
              {saving ? "作成中..." : "SKUを作成"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 px-4 py-2 bg-slate-600 rounded hover:bg-slate-700 font-bold"
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
