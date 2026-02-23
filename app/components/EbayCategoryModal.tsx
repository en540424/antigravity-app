"use client";

import { useEffect, useState } from "react";

interface EbayCategory {
  category_id: number;
  parent_id: number | null;
  name_en: string;
  name_ja: string | null;
  path_en: string;
  path_ja: string | null;
  level: number;
  leaf: boolean;
  enabled: boolean;
}

interface EbayCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (category: EbayCategory) => void;
  currentCategoryId?: number | null;
}

type TabType = "search" | "favorites" | "recent";

export default function EbayCategoryModal({
  isOpen,
  onClose,
  onSelect,
  currentCategoryId,
}: EbayCategoryModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [leafOnly, setLeafOnly] = useState(true);
  const [enabledOnly, setEnabledOnly] = useState(true);
  const [sortBy, setSortBy] = useState<"relevance" | "id">("relevance");
  const [activeTab, setActiveTab] = useState<TabType>("search");
  const [searchResults, setSearchResults] = useState<EbayCategory[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [recents, setRecents] = useState<number[]>([]);
  const [favoriteCategories, setFavoriteCategories] = useState<EbayCategory[]>([]);
  const [recentCategories, setRecentCategories] = useState<EbayCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<EbayCategory | null>(null);

  // localStorage から お気に入り/最近使ったを読み込み
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedFavorites = localStorage.getItem("ebayCategoryFavorites");
      const storedRecents = localStorage.getItem("ebayCategoryRecents");
      if (storedFavorites) {
        try {
          setFavorites(JSON.parse(storedFavorites));
        } catch (e) {
          setFavorites([]);
        }
      }
      if (storedRecents) {
        try {
          setRecents(JSON.parse(storedRecents));
        } catch (e) {
          setRecents([]);
        }
      }
    }
  }, []);

  // 検索実行
  useEffect(() => {
    if (!isOpen || activeTab !== "search") return;
    
    const timer = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, leafOnly, enabledOnly, sortBy, activeTab, isOpen]);

  // お気に入り/最近使ったカテゴリ取得
  useEffect(() => {
    if (!isOpen) return;
    if (activeTab === "favorites" && favorites.length > 0) {
      loadCategoriesByIds(favorites, setFavoriteCategories);
    }
    if (activeTab === "recent" && recents.length > 0) {
      loadCategoriesByIds(recents, setRecentCategories);
    }
  }, [activeTab, favorites, recents, isOpen]);

  const performSearch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (leafOnly) params.set("leaf_only", "true");
      if (enabledOnly) params.set("enabled_only", "true");
      params.set("sort", sortBy);
      params.set("limit", "50");

      const res = await fetch(`/api/ebay-categories/search?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
      } else {
        setSearchResults([]);
      }
    } catch (e) {
      console.error("カテゴリ検索エラー:", e);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCategoriesByIds = async (ids: number[], setter: (cats: EbayCategory[]) => void) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ebay-categories/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        const data = await res.json();
        setter(data.categories || []);
      } else {
        setter([]);
      }
    } catch (e) {
      console.error("カテゴリ一括取得エラー:", e);
      setter([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = (categoryId: number) => {
    const newFavorites = favorites.includes(categoryId)
      ? favorites.filter((id) => id !== categoryId)
      : [...favorites, categoryId];
    setFavorites(newFavorites);
    localStorage.setItem("ebayCategoryFavorites", JSON.stringify(newFavorites));
  };

  const addToRecent = (categoryId: number) => {
    const newRecents = [categoryId, ...recents.filter((id) => id !== categoryId)].slice(0, 20);
    setRecents(newRecents);
    localStorage.setItem("ebayCategoryRecents", JSON.stringify(newRecents));
  };

  const handleSelectCategory = (category: EbayCategory) => {
    if (!category.leaf) return;
    setSelectedCategory(category);
  };

  const handleConfirm = () => {
    if (!selectedCategory) return;
    addToRecent(selectedCategory.category_id);
    onSelect(selectedCategory);
    onClose();
  };

  const renderCategoryRow = (category: EbayCategory) => {
    const isFavorite = favorites.includes(category.category_id);
    const isSelected = selectedCategory?.category_id === category.category_id;
    const isDisabled = !category.leaf;

    return (
      <div
        key={category.category_id}
        className={`p-3 border-b border-gray-700 flex items-center justify-between transition ${
          isDisabled
            ? "bg-gray-800 opacity-50 cursor-not-allowed"
            : isSelected
            ? "bg-blue-900 border-blue-600 cursor-pointer"
            : "hover:bg-gray-700 cursor-pointer"
        }`}
        onClick={() => !isDisabled && handleSelectCategory(category)}
        title={isDisabled ? "末端カテゴリのみ選択できます" : ""}
      >
        <div className="flex-1">
          <div className="font-bold text-white">{category.path_en}</div>
          {category.path_ja && (
            <div className="text-xs text-gray-400 mt-1">{category.path_ja}</div>
          )}
        </div>
        <div className="flex items-center gap-2 ml-4">
          <div className="text-xs text-gray-400">ID: {category.category_id}</div>
          {category.leaf && (
            <span className="px-2 py-1 bg-green-700 text-white text-xs rounded">末端</span>
          )}
          <button
            className={`text-xl ${isFavorite ? "text-yellow-400" : "text-gray-500"}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(category.category_id);
            }}
            title={isFavorite ? "お気に入り解除" : "お気に入り追加"}
          >
            {isFavorite ? "★" : "☆"}
          </button>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  const displayedResults =
    activeTab === "search"
      ? searchResults
      : activeTab === "favorites"
      ? favoriteCategories
      : recentCategories;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-gray-700">
        {/* ヘッダー */}
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">カテゴリを選択（eBay）</h2>
        </div>

        {/* 検索エリア */}
        <div className="p-4 border-b border-gray-700 bg-gray-800">
          <input
            type="text"
            className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 outline-none mb-3"
            placeholder="検索（ID / 英語 / 日本語 / パス）"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="flex gap-4 items-center flex-wrap">
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                className="accent-blue-600"
                checked={leafOnly}
                onChange={(e) => setLeafOnly(e.target.checked)}
              />
              末端（leaf）のみ表示
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                className="accent-blue-600"
                checked={enabledOnly}
                onChange={(e) => setEnabledOnly(e.target.checked)}
              />
              有効のみ
            </label>
            <select
              className="px-3 py-1 bg-gray-700 text-white rounded border border-gray-600 text-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "relevance" | "id")}
            >
              <option value="relevance">関連度</option>
              <option value="id">ID昇順</option>
            </select>
          </div>
        </div>

        {/* タブ */}
        <div className="flex border-b border-gray-700 bg-gray-800">
          <button
            className={`flex-1 px-4 py-3 font-bold transition ${
              activeTab === "search"
                ? "bg-blue-700 text-white border-b-2 border-blue-500"
                : "text-gray-400 hover:text-white"
            }`}
            onClick={() => setActiveTab("search")}
          >
            検索結果
          </button>
          <button
            className={`flex-1 px-4 py-3 font-bold transition ${
              activeTab === "favorites"
                ? "bg-blue-700 text-white border-b-2 border-blue-500"
                : "text-gray-400 hover:text-white"
            }`}
            onClick={() => setActiveTab("favorites")}
          >
            お気に入り ({favorites.length})
          </button>
          <button
            className={`flex-1 px-4 py-3 font-bold transition ${
              activeTab === "recent"
                ? "bg-blue-700 text-white border-b-2 border-blue-500"
                : "text-gray-400 hover:text-white"
            }`}
            onClick={() => setActiveTab("recent")}
          >
            最近使った ({recents.length})
          </button>
        </div>

        {/* 結果リスト */}
        <div className="flex-1 overflow-y-auto bg-gray-850">
          {loading ? (
            <div className="p-8 text-center text-gray-400">読み込み中...</div>
          ) : displayedResults.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              {activeTab === "search" && "検索結果がありません"}
              {activeTab === "favorites" && "お気に入りがありません"}
              {activeTab === "recent" && "最近使ったカテゴリがありません"}
            </div>
          ) : (
            displayedResults.map((cat) => renderCategoryRow(cat))
          )}
        </div>

        {/* フッター */}
        <div className="p-4 border-t border-gray-700 bg-gray-800 flex items-center justify-between">
          <div className="text-sm text-gray-300">
            {selectedCategory ? (
              <>
                選択中: <span className="font-bold text-white">{selectedCategory.path_en}</span>{" "}
                <span className="text-gray-400">(ID: {selectedCategory.category_id})</span>
              </>
            ) : (
              <span className="text-gray-500">カテゴリを選択してください</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              className="px-4 py-2 bg-gray-700 text-white rounded font-bold hover:bg-gray-600 border border-gray-600"
              onClick={onClose}
            >
              キャンセル
            </button>
            <button
              className={`px-4 py-2 rounded font-bold border ${
                selectedCategory
                  ? "bg-blue-700 text-white border-blue-800 hover:bg-blue-800"
                  : "bg-gray-600 text-gray-400 border-gray-700 cursor-not-allowed"
              }`}
              onClick={handleConfirm}
              disabled={!selectedCategory}
            >
              確定
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
