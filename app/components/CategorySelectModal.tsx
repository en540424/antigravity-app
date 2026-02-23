"use client";

import React, { useEffect, useMemo, useState } from "react";

export type EbayCategory = {
  category_id: number;
  parent_id: number | null;
  name_en: string;
  name_ja: string | null;
  path_en: string;
  path_ja: string | null;
  level: number;
  leaf: boolean;
  enabled: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;

  // SKUに反映するためのハンドラ
  onSelect: (cat: EbayCategory) => void;

  // デフォルト値
  defaultLeafOnly?: boolean;
  defaultEnabledOnly?: boolean;
};

const LS_FAV = "ebayCategoryFavorites";
const LS_RECENT = "ebayCategoryRecents";

function loadNumberArray(key: string): number[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((x) => typeof x === "number");
  } catch {
    return [];
  }
}

function saveNumberArray(key: string, arr: number[]) {
  try {
    localStorage.setItem(key, JSON.stringify(arr));
  } catch {
    // ignore
  }
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

export default function CategorySelectModal({
  open,
  onClose,
  onSelect,
  defaultLeafOnly = true,
  defaultEnabledOnly = true,
}: Props) {
  const [tab, setTab] = useState<"search" | "favorites" | "recents">("search");

  const [q, setQ] = useState("");
  const [leafOnly, setLeafOnly] = useState(defaultLeafOnly);
  const [enabledOnly, setEnabledOnly] = useState(defaultEnabledOnly);

  const [items, setItems] = useState<EbayCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [selected, setSelected] = useState<EbayCategory | null>(null);

  const [favorites, setFavorites] = useState<number[]>([]);
  const [recents, setRecents] = useState<number[]>([]);

  // 初回localStorageロード
  useEffect(() => {
    if (!open) return;
    setFavorites(loadNumberArray(LS_FAV));
    setRecents(loadNumberArray(LS_RECENT));
  }, [open]);

  // open時に状態初期化
  useEffect(() => {
    if (!open) return;
    setTab("search");
    setErr(null);
    setItems([]);
    setSelected(null);
    setQ("");
    setLeafOnly(defaultLeafOnly);
    setEnabledOnly(defaultEnabledOnly);
  }, [open, defaultLeafOnly, defaultEnabledOnly]);

  // 検索（debounce）
  useEffect(() => {
    if (!open) return;
    if (tab !== "search") return;

    const t = setTimeout(async () => {
      const query = q.trim();
      if (!query) {
        setItems([]);
        setErr(null);
        return;
      }

      setLoading(true);
      setErr(null);
      try {
        const params = new URLSearchParams();
        params.set("q", query);
        params.set("leafOnly", String(leafOnly));
        params.set("enabledOnly", String(enabledOnly));
        params.set("limit", "50");

        const res = await fetch(`/api/ebay/categories?${params.toString()}`, {
          method: "GET",
        });

        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.detail || `HTTP ${res.status}`);
        }

        const j = await res.json();
        setItems(Array.isArray(j.items) ? j.items : []);
      } catch (e: any) {
        setItems([]);
        setErr(e?.message ?? "検索に失敗しました");
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [open, tab, q, leafOnly, enabledOnly]);

  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);
  const recentSet = useMemo(() => new Set(recents), [recents]);

  function toggleFavorite(id: number) {
    const next = favoriteSet.has(id)
      ? favorites.filter((x) => x !== id)
      : uniq([id, ...favorites]).slice(0, 50);
    setFavorites(next);
    saveNumberArray(LS_FAV, next);
  }

  function pushRecent(id: number) {
    const next = uniq([id, ...recents]).slice(0, 50);
    setRecents(next);
    saveNumberArray(LS_RECENT, next);
  }

  function handlePick(cat: EbayCategory) {
    if (!cat.leaf) return; // leaf制御（念のため）
    setSelected(cat);
  }

  function handleConfirm() {
    if (!selected) return;
    pushRecent(selected.category_id);
    onSelect(selected);
    onClose();
  }

  // favorites/recents はカテゴリの詳細が必要になるので検索APIで引く
  async function fetchByIds(ids: number[]) {
    // 1件ずつ叩くのは遅いので、ID検索を順次（最大10件くらいなら許容）
    // 将来は /api/ebay/categories/by-ids を作ってまとめるのが理想
    const result: EbayCategory[] = [];
    for (const id of ids.slice(0, 20)) {
      try {
        const res = await fetch(
          `/api/ebay/categories?q=${encodeURIComponent(String(id))}&leafOnly=false&enabledOnly=false&limit=1`
        );
        if (!res.ok) continue;
        const j = await res.json();
        const arr: EbayCategory[] = Array.isArray(j.items) ? j.items : [];
        if (arr[0]) result.push(arr[0]);
      } catch {
        // ignore
      }
    }
    return result;
  }

  const [favItems, setFavItems] = useState<EbayCategory[]>([]);
  const [recentItems, setRecentItems] = useState<EbayCategory[]>([]);

  useEffect(() => {
    if (!open) return;

    const run = async () => {
      if (tab === "favorites") {
        setLoading(true);
        setErr(null);
        const data = await fetchByIds(favorites);
        setFavItems(data);
        setLoading(false);
      }
      if (tab === "recents") {
        setLoading(true);
        setErr(null);
        const data = await fetchByIds(recents);
        setRecentItems(data);
        setLoading(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab]);

  if (!open) return null;

  const listItems =
    tab === "search" ? items : tab === "favorites" ? favItems : recentItems;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* overlay */}
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
        aria-hidden
      />

      {/* modal */}
      <div className="relative w-[min(980px,95vw)] max-h-[90vh] overflow-hidden rounded-2xl bg-slate-800 shadow-2xl border border-slate-600">
        <div className="flex items-center justify-between border-b border-slate-600 px-5 py-4 bg-slate-900">
          <div className="text-lg font-semibold text-white">📂 カテゴリを選択（eBay）</div>
          <button
            className="rounded-lg px-3 py-1 text-sm text-white hover:bg-slate-700 transition"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Search area */}
        <div className="border-b border-slate-600 px-5 py-4 bg-slate-800">
          <div className="flex flex-col gap-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="検索（ID / 英語 / 日本語 / パス）"
              className="w-full rounded-xl border border-slate-600 bg-slate-700 text-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
            />

            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-200">
              <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                <input
                  type="checkbox"
                  checked={leafOnly}
                  onChange={(e) => setLeafOnly(e.target.checked)}
                  className="w-4 h-4"
                />
                末端（leaf）のみ表示
              </label>

              <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                <input
                  type="checkbox"
                  checked={enabledOnly}
                  onChange={(e) => setEnabledOnly(e.target.checked)}
                  className="w-4 h-4"
                />
                有効のみ（enabled）
              </label>

              <div className="ml-auto text-xs text-slate-400">
                ※ 末端カテゴリのみ選択できます
              </div>
            </div>
          </div>

          {/* tabs */}
          <div className="mt-4 flex gap-2">
            <TabButton active={tab === "search"} onClick={() => setTab("search")}>
              検索結果
            </TabButton>
            <TabButton
              active={tab === "favorites"}
              onClick={() => setTab("favorites")}
            >
              お気に入り
            </TabButton>
            <TabButton active={tab === "recents"} onClick={() => setTab("recents")}>
              最近使った
            </TabButton>
          </div>
        </div>

        {/* list */}
        <div className="max-h-[55vh] overflow-auto px-5 py-3 bg-slate-900">
          {err && (
            <div className="mb-3 rounded-xl bg-red-900/50 border border-red-600 px-4 py-3 text-sm text-red-200">
              ❌ 検索に失敗しました：{err}
            </div>
          )}

          {tab === "search" && !q.trim() && (
            <div className="rounded-xl bg-slate-700 px-4 py-6 text-sm text-slate-300">
              🔍 検索ワードを入力してください（例：camera / tools / 12345）
            </div>
          )}

          {loading && (
            <div className="py-6 text-center text-sm text-slate-400">⏳ 検索中…</div>
          )}

          {!loading && listItems.length === 0 && (tab !== "search" || q.trim()) && (
            <div className="py-6 text-center text-sm text-slate-400">
              該当するカテゴリがありません
            </div>
          )}

          <ul className="space-y-2">
            {listItems.map((cat) => {
              const isSelected = selected?.category_id === cat.category_id;
              const isFav = favoriteSet.has(cat.category_id);
              const disabled = !cat.leaf;

              return (
                <li
                  key={cat.category_id}
                  className={[
                    "rounded-2xl border p-4 transition",
                    isSelected ? "border-blue-500 bg-blue-900/30" : "border-slate-600 bg-slate-800",
                    disabled ? "opacity-50" : "hover:bg-slate-700 hover:border-slate-500",
                  ].join(" ")}
                >
                  <div className="flex items-start gap-3">
                    <button
                      className="mt-1 text-lg transition hover:scale-110"
                      onClick={() => toggleFavorite(cat.category_id)}
                      title={isFav ? "お気に入り解除" : "お気に入り"}
                    >
                      {isFav ? "⭐" : "☆"}
                    </button>

                    <button
                      className="flex-1 text-left"
                      disabled={disabled}
                      onClick={() => handlePick(cat)}
                      title={disabled ? "末端カテゴリのみ選択できます" : "選択"}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-semibold text-white">{cat.path_en}</div>
                        <span className="rounded-full bg-slate-600 px-2 py-0.5 text-xs text-slate-200">
                          ID: {cat.category_id}
                        </span>
                        {cat.leaf ? (
                          <span className="rounded-full bg-green-600 px-2 py-0.5 text-xs text-white font-semibold">
                            ✓ leaf
                          </span>
                        ) : (
                          <span className="rounded-full bg-yellow-600 px-2 py-0.5 text-xs text-white">
                            親カテゴリ（選択不可）
                          </span>
                        )}
                        {!cat.enabled && (
                          <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">
                            disabled
                          </span>
                        )}
                      </div>

                      {cat.path_ja && (
                        <div className="mt-1 text-sm text-slate-400">{cat.path_ja}</div>
                      )}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* footer */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-600 px-5 py-4 bg-slate-800">
          <div className="text-sm text-slate-200">
            {selected ? (
              <>
                ✓ 選択中：<span className="font-semibold text-white">{selected.path_en}</span>{" "}
                <span className="text-slate-400">(ID: {selected.category_id})</span>
              </>
            ) : (
              <span className="text-slate-400">カテゴリを選択してください</span>
            )}
          </div>

          <div className="flex gap-2">
            <button
              className="rounded-xl border border-slate-600 bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-600 transition"
              onClick={onClose}
            >
              キャンセル
            </button>
            <button
              className={[
                "rounded-xl px-4 py-2 text-sm font-bold text-white transition",
                selected ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-600 cursor-not-allowed",
              ].join(" ")}
              disabled={!selected}
              onClick={handleConfirm}
            >
              ✓ 確定
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-xl px-3 py-2 text-sm font-semibold transition",
        active ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
