"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SkuAutoCreateButton({ onCreated }: { onCreated?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleCreateSku = async () => {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/sku-create-auto", { method: "POST" });
      const data = await res.json();
      if (res.status === 409) {
        setError("同時生成が発生しました。もう一度押してください");
        return;
      }
      if (!res.ok) {
        setError("作成に失敗しました");
        return;
      }
      setMessage(`SKUを作成しました：${data.sku}`);
      setTimeout(() => setMessage(null), 3000);
      if (onCreated) onCreated();
      // 例: SKU一覧をリロードしたい場合はonCreatedで親から渡す
      // router.push(`/sku/${data.id}`); // 生成後に遷移したい場合はこちら
    } catch (err: any) {
      setError("作成に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleCreateSku}
        disabled={loading}
        className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
      >
        {loading ? "生成中..." : "SKUを自動生成"}
      </button>
      {message && (
        <div className="rounded bg-green-100 text-green-800 px-4 py-2">✅ {message}</div>
      )}
      {error && (
        <div className="rounded bg-red-100 text-red-800 px-4 py-2">❌ {error}</div>
      )}
    </div>
  );
}
