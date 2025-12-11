"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// SKU型
type SkuStatus = "shooting" | "editing" | "listing" | "done" | "none";

type SkuItem = {
  id: string;
  sku: string;
  title: string | null;
  status: SkuStatus | null;
  created_at: string;
};

// ステータス表示用
const STATUS_LABEL: Record<SkuStatus, string> = {
  shooting: "📷 撮影待ち",
  editing: "✂️ 編集待ち",
  listing: "🛒 出品待ち",
  done: "🏁 完了",
  none: "未設定",
};

const STATUS_COLOR: Record<SkuStatus, string> = {
  shooting: "bg-blue-700",
  editing: "bg-purple-700",
  listing: "bg-green-700",
  done: "bg-gray-600",
  none: "bg-slate-600",
};

// 編集モーダルの状態
type EditingItem = {
  id: string;
  sku: string;
  title: string | null;
  status: SkuStatus | null;
};

export default function SKUManagerPage() {
  const [list, setList] = useState<SkuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 検索
  const [keyword, setKeyword] = useState("");

  // 状態フィルタ
  const [filter, setFilter] = useState<SkuStatus | "all">("all");

  // 編集モーダル用
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  // SKU復帰用
  const [showRestoreInput, setShowRestoreInput] = useState(false);
  const [restoreSku, setRestoreSku] = useState("");
  const [restoreLoading, setRestoreLoading] = useState(false);

  // 一括削除用：選択済みSKUのID
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // localStorageから初期値を読み込み
  useEffect(() => {
    const load = async () => {
      await fetchList();
    };

    load();
  }, []);

  // ----------------------------------------------------
  // SKU一覧取得
  // ----------------------------------------------------
  const fetchList = async () => {
    const res = await fetch("/api/sku-list");
    const json = await res.json();
    setList(json);
    setLoading(false);
  };

  useEffect(() => {
    fetchList();
  }, []);

  // ----------------------------------------------------
  // SKU自動生成
  // ----------------------------------------------------
  const generateSKU = async () => {
    const res = await fetch("/api/sku-create", { method: "POST" });
    if (!res.ok) return alert("SKU作成に失敗しました");

    await fetchList();
  };

  // ----------------------------------------------------
  // SKU削除
  // ----------------------------------------------------
  const deleteSku = async (id: string) => {
    if (!confirm("本当に削除しますか？")) return;

    const item = list.find(i => i.id === id);
    if (!item) return;

    try {
      const res = await fetch("/api/delete-sku", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, sku: item.sku, withImages: false }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Delete error:", data);
        return alert(data.error || "削除に失敗しました");
      }

      if (data.success) {
        alert("削除しました");
        await fetchList();
      }
    } catch (e) {
      console.error("Delete error:", e);
      alert("削除に失敗しました");
    }
  };

  // 一括削除
  // ----------------------------------------------------
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) {
      return alert("削除するSKUを選択してください");
    }

    if (!confirm(`${selectedIds.size}個のSKUを削除しますか？`)) return;

    setBulkDeleting(true);

    let successCount = 0;
    let failCount = 0;

    for (const id of selectedIds) {
      try {
        const item = list.find(i => i.id === id);
        if (!item) continue;

        const res = await fetch("/api/delete-sku", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, sku: item.sku, withImages: false }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (e) {
        failCount++;
      }
    }

    setBulkDeleting(false);
    setSelectedIds(new Set());

    alert(`完了: ${successCount}個削除、${failCount}個失敗`);
    await fetchList();
  };

  // チェックボックス操作
  // ----------------------------------------------------
  const toggleSelectId = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredList.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredList.map(item => item.id)));
    }
  };

  // ----------------------------------------------------
  // SKU編集
  // ----------------------------------------------------
  const handleEditClick = (item: SkuItem) => {
    setEditingItem({
      id: item.id,
      sku: item.sku,
      title: item.title,
      status: item.status,
    });
  };

  const handleEditSave = async () => {
    if (!editingItem) return;

    if (!editingItem.sku.trim()) {
      return alert("SKUは空にできません");
    }

    setEditLoading(true);

    const res = await fetch("/api/sku-edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingItem.id,
        newSku: editingItem.sku,
        newTitle: editingItem.title,
        newStatus: editingItem.status,
      }),
    });

    setEditLoading(false);

    if (!res.ok) {
      const error = await res.json();
      return alert(error.error || "更新に失敗しました");
    }

    setEditingItem(null);
    await fetchList();
  };

  const handleEditCancel = () => {
    setEditingItem(null);
  };

  // ----------------------------------------------------
  // SKU復帰
  // ----------------------------------------------------
  const handleRestoreSku = async () => {
    if (!restoreSku.trim()) {
      return alert("SKUを入力してください");
    }

    setRestoreLoading(true);

    const res = await fetch("/api/sku-restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sku: restoreSku.trim(),
      }),
    });

    setRestoreLoading(false);

    if (!res.ok) {
      const error = await res.json();
      return alert(error.error || "復帰に失敗しました");
    }

    setRestoreSku("");
    setShowRestoreInput(false);
    await fetchList();
  };

  // ----------------------------------------------------
  // 絞り込み処理
  // ----------------------------------------------------
  const filteredList = list.filter((item) => {
    const matchKeyword =
      item.sku.includes(keyword) ||
      (item.title ?? "").includes(keyword);

    // statusがnullの場合は"none"として扱う
    const itemStatus = item.status ?? "none";
    const matchStatus =
      filter === "all" ? true : itemStatus === filter;

    return matchKeyword && matchStatus;
  });

  // ----------------------------------------------------
  // UIレンダリング
  // ----------------------------------------------------
  return (
    <div className="max-w-3xl mx-auto p-4 text-white">

      {/* ボタン行 */}
      <div className="flex gap-3 mb-4">
        <Link
          href="/"
          className="px-4 py-2 bg-slate-800 rounded hover:bg-slate-700 border border-slate-700"
        >
          ⬅️ ホーム
        </Link>
        <button
          className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
          onClick={fetchList}
        >
          🔄 更新
        </button>

        <button
          className="px-4 py-2 bg-green-600 rounded hover:bg-green-700"
          onClick={generateSKU}
        >
          ➕ SKU自動生成
        </button>

        <button
          className="px-4 py-2 bg-yellow-600 rounded hover:bg-yellow-700"
          onClick={() => setShowRestoreInput(!showRestoreInput)}
        >
          🔧 SKU復帰
        </button>

        <Link href="/sku/customize">
          <button
            className="px-4 py-2 bg-purple-600 rounded hover:bg-purple-700"
          >
            🎨 UI 切り替え
          </button>
        </Link>

        {selectedIds.size > 0 && (
          <button
            className="px-4 py-2 bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
          >
            {bulkDeleting ? "削除中..." : `🗑️ ${selectedIds.size}個削除`}
          </button>
        )}
      </div>

      {/* SKU復帰入力 */}
      {showRestoreInput && (
        <div className="mb-4 p-4 bg-slate-800 rounded">
          <h3 className="font-bold mb-2">削除されたSKUを復帰</h3>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="例: 20251211-0001"
              value={restoreSku}
              onChange={(e) => setRestoreSku(e.target.value)}
              className="flex-1 p-2 rounded bg-slate-700"
            />
            <button
              onClick={handleRestoreSku}
              disabled={restoreLoading}
              className="px-4 py-2 bg-yellow-600 rounded hover:bg-yellow-700 disabled:opacity-50"
            >
              {restoreLoading ? "復帰中..." : "復帰"}
            </button>
            <button
              onClick={() => setShowRestoreInput(false)}
              className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-700"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* 検索 */}
      <input
        type="text"
        placeholder="SKU / 商品名で検索"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        className="w-full p-2 mb-3 rounded bg-slate-800"
      />

      {/* フィルター - ボタングループ */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1 rounded text-sm font-semibold transition ${
            filter === "all"
              ? "bg-slate-400 text-black"
              : "bg-slate-700 text-white hover:bg-slate-600"
          }`}
        >
          すべて
        </button>
        <button
          onClick={() => setFilter("shooting")}
          className={`px-3 py-1 rounded text-sm font-semibold transition ${
            filter === "shooting"
              ? "bg-blue-700 text-white"
              : "bg-slate-700 text-white hover:bg-slate-600"
          }`}
        >
          📷 撮影待ち
        </button>
        <button
          onClick={() => setFilter("editing")}
          className={`px-3 py-1 rounded text-sm font-semibold transition ${
            filter === "editing"
              ? "bg-purple-700 text-white"
              : "bg-slate-700 text-white hover:bg-slate-600"
          }`}
        >
          ✂️ 編集待ち
        </button>
        <button
          onClick={() => setFilter("listing")}
          className={`px-3 py-1 rounded text-sm font-semibold transition ${
            filter === "listing"
              ? "bg-green-700 text-white"
              : "bg-slate-700 text-white hover:bg-slate-600"
          }`}
        >
          🛒 出品待ち
        </button>
        <button
          onClick={() => setFilter("done")}
          className={`px-3 py-1 rounded text-sm font-semibold transition ${
            filter === "done"
              ? "bg-gray-600 text-white"
              : "bg-slate-700 text-white hover:bg-slate-600"
          }`}
        >
          🏁 完了
        </button>
        <button
          onClick={() => setFilter("none")}
          className={`px-3 py-1 rounded text-sm font-semibold transition ${
            filter === "none"
              ? "bg-slate-600 text-white"
              : "bg-slate-700 text-white hover:bg-slate-600"
          }`}
        >
          — 未設定 —
        </button>
      </div>

      {/* すべて選択 / 解除 */}
      {filteredList.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <input
            type="checkbox"
            id="selectAll"
            checked={selectedIds.size > 0 && selectedIds.size === filteredList.length}
            onChange={toggleSelectAll}
            className="w-5 h-5 cursor-pointer"
          />
          <label htmlFor="selectAll" className="cursor-pointer text-sm">
            {selectedIds.size === filteredList.length
              ? "すべて解除"
              : "すべて選択"}
          </label>
        </div>
      )}

      {/* ローディング */}
      {loading && <div>読み込み中…</div>}

      {/* SKUカード */}
      <div className="flex flex-col gap-4">
        {filteredList.map((item) => (
          <div
            key={item.id}
            className={`p-4 rounded-lg shadow relative transition ${
              selectedIds.has(item.id)
                ? "bg-slate-800 border-2 border-blue-500"
                : "bg-slate-900"
            }`}
          >
            {/* チェックボックス + SKU番号・商品名 */}
            <div className="flex items-start gap-3 mb-2">
              <input
                type="checkbox"
                checked={selectedIds.has(item.id)}
                onChange={() => toggleSelectId(item.id)}
                className="w-5 h-5 cursor-pointer mt-1"
              />
              <Link href={`/sku/${item.id}`}>
                <div className="cursor-pointer flex-1">
                  <h2 className="text-xl font-bold">{item.sku}</h2>
                  <p className="text-gray-300 break-all">
                    {item.title || "（商品名なし）"}
                  </p>
                </div>
              </Link>
            </div>

            {/* ステータス */}
            <div className="mt-2">
              <span
                className={`px-3 py-1 text-sm rounded ${STATUS_COLOR[item.status ?? "none"]}`}
              >
                {STATUS_LABEL[item.status ?? "none"]}
              </span>
            </div>

            {/* 作成日 */}
            <div className="text-gray-400 text-sm mt-2">
              作成日：{new Date(item.created_at).toLocaleString("ja-JP")}
            </div>

            {/* ボタン行 */}
            <div className="absolute top-4 right-4 flex gap-2">
              <button
                onClick={() => handleEditClick(item)}
                className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700 text-sm"
              >
                ✏️ 編集
              </button>
              <button
                onClick={() => deleteSku(item.id)}
                className="px-3 py-1 bg-red-600 rounded hover:bg-red-700 text-sm"
              >
                削除
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 編集モーダル */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">SKU編集</h3>

            {/* SKU入力 */}
            <div className="mb-4">
              <label className="block text-sm mb-1">SKU</label>
              <input
                type="text"
                value={editingItem.sku}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, sku: e.target.value })
                }
                className="w-full p-2 rounded bg-slate-800"
              />
            </div>

            {/* タイトル入力 */}
            <div className="mb-4">
              <label className="block text-sm mb-1">商品名</label>
              <input
                type="text"
                value={editingItem.title || ""}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, title: e.target.value || null })
                }
                className="w-full p-2 rounded bg-slate-800"
              />
            </div>

            {/* ステータス選択 */}
            <div className="mb-6">
              <label className="block text-sm mb-1">ステータス</label>
              <select
                value={editingItem.status ?? "none"}
                onChange={(e) =>
                  setEditingItem({
                    ...editingItem,
                    status: e.target.value === "none" ? null : (e.target.value as SkuStatus),
                  })
                }
                className="w-full p-2 rounded bg-slate-800"
              >
                <option value="none">未設定</option>
                <option value="shooting">📷 撮影待ち</option>
                <option value="editing">✂️ 編集待ち</option>
                <option value="listing">🛒 出品待ち</option>
                <option value="done">🏁 完了</option>
              </select>
            </div>

            {/* ボタン */}
            <div className="flex gap-2">
              <button
                onClick={handleEditSave}
                disabled={editLoading}
                className="flex-1 px-4 py-2 bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
              >
                {editLoading ? "保存中..." : "保存"}
              </button>
              <button
                onClick={handleEditCancel}
                className="flex-1 px-4 py-2 bg-gray-600 rounded hover:bg-gray-700"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
