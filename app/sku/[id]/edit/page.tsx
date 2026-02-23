// Sku_condition型の重複定義があれば、どちらか一方のみ残す
// 例:
// type Sku_condition = "new" | "used" | "for_parts" | "unset";
// handleAiGenerateAll未定義エラーを暫定コメントアウト
// const handleAiGenerateAll = () => { /* 未実装 */ };
"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { getCurrentUserRole } from "@/app/utils/supabase/userRole";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  calculateProfit,
  DEFAULT_PROFIT_SETTINGS,
  type ProfitCalculationResult,
} from "../../../lib/profitCalculator";
import CategorySelectModal, { type EbayCategory } from "@/app/components/CategorySelectModal";

type ImageType = "RAW" | "ORIGINAL" | "LISTING";

type SkuImage = {
  id: string;
  storage_path: string;
  public_url: string | null;
  image_type: ImageType;
};

type SkuStatus = "shooting" | "editing" | "listing" | "done" | "none";

type EditingItem = {
  id: string;
  sku: string;
  title: string | null;
  status: SkuStatus | null;
  notes: string | null;
  genre?: string | null;
  brand?: string | null;
  model?: string | null;
  color?: string | null;
  condition?: string | null;
  ebay_category_id?: number | null;
  ebay_category_path_snapshot?: string | null;
  title_optimized?: string | null;
  description?: string | null;
  item_specifics?: any;
  thumbnail_path?: string | null;
  purchaseCostJPY?: number | null;
  domesticShippingJPY?: number | null;
    packagingCostJPY?: number | null;
};

export default function Page() {
    // 必要なstateや関数を最低限追加
    const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
    const [profitResult, setProfitResult] = useState<ProfitCalculationResult | null>(null);
    // ✅ 入力中はstring、計算時だけnumber
    const [sellingPriceUSD, setSellingPriceUSD] = useState<string>("");
    const [sellingPriceJPY, setSellingPriceJPY] = useState<string>("");
    const [shippingCostUSD, setShippingCostUSD] = useState<string>("35"); // デフォルト値
    const [shippingCostJPY, setShippingCostJPY] = useState<string>("");
      const [purchaseCostJPY, setPurchaseCostJPY] = useState<string>("");
      const [domesticShippingJPY, setDomesticShippingJPY] = useState<string>("");
    const [exchangeRate, setExchangeRate] = useState<string>("150"); // デフォルト値
    const [priceMode, setPriceMode] = useState<"usd" | "jpy">("usd");
    const [saveBanner, setSaveBanner] = useState<string | null>(null);
      // userRoleのuseState宣言直後でのみcanSwitchPriceModeを定義（重複排除）
      // 他の場所の定義は削除

        // USD基準モード：USD入力 → JPY自動計算
        useEffect(() => {
          if (priceMode !== "usd") return;
          const rate = Number(exchangeRate) || 150;
          const usd = Number(sellingPriceUSD) || 0;
          const shippingUsd = Number(shippingCostUSD) || 0;
          setSellingPriceJPY(usd > 0 ? String(Math.round(usd * rate)) : "");
          setShippingCostJPY(shippingUsd > 0 ? String(Math.round(shippingUsd * rate)) : "");
        }, [sellingPriceUSD, shippingCostUSD, exchangeRate, priceMode]);

        // JPY基準モード：JPY入力 → USD自動計算
        useEffect(() => {
          if (priceMode !== "jpy") return;
          const rate = Number(exchangeRate) || 150;
          const jpy = Number(sellingPriceJPY) || 0;
          const shippingJpy = Number(shippingCostJPY) || 0;
          setSellingPriceUSD(jpy > 0 ? String((jpy / rate).toFixed(2)) : "");
          setShippingCostUSD(shippingJpy > 0 ? String((shippingJpy / rate).toFixed(2)) : "");
        }, [sellingPriceJPY, shippingCostJPY, exchangeRate, priceMode]);

        // 🔁 安全な通貨モード切り替え関数（値を壊さない）
        const switchToUSD = () => {
          // 確認ダイアログ（JPYに値がある場合のみ）
          if (priceMode === "jpy" && sellingPriceJPY !== "") {
            if (!confirm("USD入力モードに切り替えますか？現在のJPY値からUSDを計算します。")) {
              return;
            }
          }
          // JPY → USD変換して表示
          if (sellingPriceJPY !== "" && exchangeRate !== "") {
            const rate = Number(exchangeRate) || 150;
            const usd = Number(sellingPriceJPY) / rate;
            setSellingPriceUSD(String(usd.toFixed(2)));
          }
          if (shippingCostJPY !== "" && exchangeRate !== "") {
            const rate = Number(exchangeRate) || 150;
            const shippingUsd = Number(shippingCostJPY) / rate;
            setShippingCostUSD(String(shippingUsd.toFixed(2)));
          }
          setPriceMode("usd");
        };

        const switchToJPY = () => {
          // 確認ダイアログ（USDに値がある場合のみ）
          if (priceMode === "usd" && sellingPriceUSD !== "") {
            if (!confirm("JPY入力モードに切り替えますか？現在のUSD値からJPYを計算します。")) {
              return;
            }
          }
          // USD → JPY変換して表示
          if (sellingPriceUSD !== "" && exchangeRate !== "") {
            const rate = Number(exchangeRate) || 150;
            const jpy = Number(sellingPriceUSD) * rate;
            setSellingPriceJPY(String(Math.round(jpy)));
          }
          if (shippingCostUSD !== "" && exchangeRate !== "") {
            const rate = Number(exchangeRate) || 150;
            const shippingJpy = Number(shippingCostUSD) * rate;
            setShippingCostJPY(String(Math.round(shippingJpy)));
          }
          setPriceMode("jpy");
        };

        // 利益計算（入力値が変わるたびに再計算）
        useEffect(() => {
          // 📌 販売価格が空の場合は「未計算」状態にする
          const hasSellingPrice = priceMode === "usd" ? sellingPriceUSD !== "" : sellingPriceJPY !== "";
          if (!hasSellingPrice) {
            setProfitResult(null);
            return;
          }

          // 必要な手数料・コスト設定
          const settings = DEFAULT_PROFIT_SETTINGS;
          const packagingCostJPY = 0; // 必要ならstate化
          
          // 🧮 計算は常に「基準USD」から統一
          const rate = Number(exchangeRate) || 150;
          const finalPriceUSD =
            priceMode === "usd"
              ? Number(sellingPriceUSD) || 0
              : (Number(sellingPriceJPY) || 0) / rate;
          const finalShippingUSD =
            priceMode === "usd"
              ? Number(shippingCostUSD) || 0
              : (Number(shippingCostJPY) || 0) / rate;

          setProfitResult(
            calculateProfit({
              sellingPriceUSD: finalPriceUSD,
              shippingCostUSD: finalShippingUSD,
              exchangeRate: rate,
              ebayFeePercent: settings.ebayFeePercent,
              promotedListingPercent: settings.promotedListingPercent,
              internationalPaymentFeePercent: settings.internationalPaymentFeePercent,
              payoneerFeePercent: settings.payoneerFeePercent,
              payoneerFixedFeeUSD: settings.payoneerFixedFeeUSD,
              staffCostMultiplier: settings.staffCostMultiplier,
              purchaseCostJPY: Number(purchaseCostJPY) || 0,
              domesticShippingJPY: Number(domesticShippingJPY) || 0,
              packagingCostJPY,
            })
          );
        }, [sellingPriceUSD, sellingPriceJPY, shippingCostUSD, shippingCostJPY, exchangeRate, priceMode, purchaseCostJPY, domesticShippingJPY]);
    const [showProfitDetails, setShowProfitDetails] = useState(false);
    const [loading, setLoading] = useState(true);
    const [descGenerating, setDescGenerating] = useState(false);
    const [descJa, setDescJa] = useState("");
    const [descJaGenerating, setDescJaGenerating] = useState(false);
    const [descProvider, setDescProvider] = useState<"gemini" | "openai">("gemini");
    const [descProviderUsed, setDescProviderUsed] = useState<"gemini" | "openai" | null>(null);
    const [descFallbackReason, setDescFallbackReason] = useState<string | null>(null);
    const [descBanner, setDescBanner] = useState<{ type: "success" | "warning" | "error"; message: string } | null>(null);

    useEffect(() => {
      if (!descBanner) return;
      const t = setTimeout(() => setDescBanner(null), 3000);
      return () => clearTimeout(t);
    }, [descBanner]);
  // AI日本語説明文生成
  const handleGenerateDescriptionJa = async () => {
    setDescJaGenerating(true);
    try {
      const res = await fetch(`/api/ai-description-ja`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku_id: editingItem?.id,
          description: editingItem?.description,
        }),
      });
      if (!res.ok) throw new Error("生成失敗");
      const data = await res.json();
      setDescJa(data.description_ja || "");
    } catch (e) {
      alert("日本語説明文の生成に失敗しました");
    } finally {
      setDescJaGenerating(false);
    }
  };

    // AI説明文生成
    const handleGenerateDescription = async () => {
      setDescGenerating(true);
      setDescFallbackReason(null);
      setDescBanner(null);
      try {
        const res = await fetch(`/api/ai-description`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sku_id: editingItem?.id,
            sku: editingItem?.sku,
            title: editingItem?.title,
            brand: editingItem?.brand,
            model: editingItem?.model,
            color: editingItem?.color,
            notes: editingItem?.notes,
            provider: descProvider,
          }),
        });
        if (!res.ok) throw new Error("生成失敗");
        const data = await res.json();
        setDescProviderUsed(data.provider_used || descProvider);
        setDescFallbackReason(data.fallback_reason || null);
        setEditingItem((prev) => prev ? { ...prev, description: data.description || "" } : prev);

        if (data.fallback) {
          setDescBanner({ type: "warning", message: "⚠️ OpenAIが上限/混雑のため Geminiで生成しました" });
        } else if (data.provider_used === "openai") {
          setDescBanner({ type: "success", message: "✅ OpenAIで生成しました（仕上げ）" });
        } else {
          setDescBanner({ type: "success", message: "✅ Geminiで生成しました" });
        }
      } catch (e) {
        setDescBanner({ type: "error", message: "❌ AI説明文の生成に失敗しました" });
      } finally {
        setDescGenerating(false);
      }
    };

    // ✅ 削除: profitResultを0で埋めるuseEffect
    // 利益計算は別途useEffectで必ず再実行されるため、ここで強制的に0にすると保存値が見えなくなる

  const [fetchError, setFetchError] = useState("");
  const params = useParams();
  const id = params?.id as string | undefined;

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setFetchError("");
    // 仮API: /api/sku/[id] で取得する想定
    fetch(`/api/sku/${id}`)
      .then(res => {
        if (!res.ok) throw new Error("SKU取得失敗");
        return res.json();
      })
      .then(data => {
        setEditingItem(data);
        // ✅ DB値をstateに反映（null判定で0を落とさない）
        setSellingPriceUSD((data.sale_price_usd ?? 0) > 0 ? String(data.sale_price_usd) : "");
        setSellingPriceJPY((data.sale_price_jpy ?? 0) > 0 ? String(data.sale_price_jpy) : "");
        setShippingCostUSD((data.shipping_cost_usd ?? 0) > 0 ? String(data.shipping_cost_usd) : "35");
        setShippingCostJPY((data.shipping_cost_jpy ?? 0) > 0 ? String(data.shipping_cost_jpy) : "");
        setPurchaseCostJPY((data.purchase_cost_jpy ?? 0) > 0 ? String(data.purchase_cost_jpy) : "");
        setDomesticShippingJPY((data.shipping_cost_jpy ?? 0) > 0 ? String(data.shipping_cost_jpy) : "");
        setExchangeRate(String(data.exchange_rate ?? 150));
        // どちらの価格が実データかでモードを決定（USDが無くJPYだけある場合はJPYモード）
        const hasJPY = (data.sale_price_jpy ?? 0) > 0;
        const hasUSD = (data.sale_price_usd ?? 0) > 0;
        setPriceMode(hasUSD ? "usd" : hasJPY ? "jpy" : "usd");
        // ✅ profitResultの再計算は別のuseEffectで自動実行（ここで0を入れない）
        setLoading(false);
      })
      .catch(e => {
        setFetchError("SKUが見つかりません");
        setLoading(false);
      });
  }, [id]);
  const [saving, setSaving] = useState(false);
  const [imageInfo, setImageInfo] = useState<any>(null);
  const [imagesReady, setImagesReady] = useState(false);
  const [userRole, setUserRole] = useState<string>("admin");
  // userRoleのuseState宣言直後に参照（ReferenceError防止）
  const canSwitchPriceMode = userRole === "admin";
  const [aiGenerating, setAiGenerating] = useState(false);
  const [autoExtracting, setAutoExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string>("");
  const router = useRouter();

  // 画像管理用state
  const [imageTab, setImageTab] = useState<ImageType>("RAW");
  const [images, setImages] = useState<SkuImage[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string>("");
  const [moveBanner, setMoveBanner] = useState<{
    id: string;
    from: ImageType;
    to: ImageType;
    name: string;
  } | null>(null);
  const [undoTimer, setUndoTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [settingThumbnail, setSettingThumbnail] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<EbayCategory | null>(null);
  
  // 画像選択state（ID ベース）
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  
  // 画像枚数カウント
  const counts = useMemo(() => {
    const c = { RAW: 0, ORIGINAL: 0, LISTING: 0 };
    for (const img of images) c[img.image_type]++;
    return c;
  }, [images]);
  const TARGET = { RAW: 3, ORIGINAL: 7, LISTING: 7 };
  
  // タブ管理state
  const [activeTab, setActiveTab] = useState<"images" | "price" | "ebay" | "info">("images");

  // カテゴリ判定ユーティリティ
  function isCategoryReady(item: EditingItem | null) {
    return !!item?.ebay_category_id && (item.ebay_category_id as number) > 0;
  }

  function categoryLabel(item: EditingItem | null) {
    const id = item?.ebay_category_id;
    const path = item?.ebay_category_path_snapshot || undefined;
    if (!id) return "未設定";
    if (path) return `${path}（ID: ${id}）`;
    return `ID: ${id}`;
  }

  function canMoveToListingState(nextStatus: SkuStatus | null, item: EditingItem | null) {
    const needsEbayReady = ["listing", "done"].includes(nextStatus || "");
    if (!needsEbayReady) return true;
    return isCategoryReady(item);
  }

  // カテゴリ選択ハンドラ
  function handleSelectCategory(cat: EbayCategory) {
    setSelectedCategory(cat);
    setEditingItem((prev) => prev ? ({
      ...prev,
      ebay_category_id: cat.category_id,
      ebay_category_path_snapshot: cat.path_en,
    }) : prev);
  }

  // 画像情報を取得（新API: SkuImage型）
  const loadSkuImages = useCallback(async () => {
    if (!editingItem?.sku) return;
    setLoadingImages(true);
    try {
      const res = await fetch(`/api/sku-images?sku=${encodeURIComponent(editingItem.sku)}`);
      if (!res.ok) return;
      const data = await res.json();
      const info = data?.imageInfo || {};

      // 新形式：SkuImage型
      const flat: SkuImage[] = [
        ...(info.raw || []),
        ...(info.original || []),
        ...(info.listing || []),
      ];
      setImages(flat);
    } catch (e) {
      console.error("画像情報取得エラー:", e);
    } finally {
      setLoadingImages(false);
    }
  }, [editingItem?.sku]);

  useEffect(() => {
    if (editingItem?.sku) {
      loadSkuImages();
    }
  }, [editingItem?.sku, loadSkuImages]);

  // UNDOタイマーをクリーンアップ
  useEffect(() => {
    return () => {
      if (undoTimer) clearTimeout(undoTimer);
    };
  }, [undoTimer]);

  // 単一画像の分類変更（Storageは動かさずDBのimage_typeのみ更新）
  const changeImageType = async (
    img: SkuImage,
    to: ImageType,
    opts?: { silent?: boolean }
  ) => {
    if (!img || img.image_type === to) return;

    // LISTINGへは一応確認を挟む（後からUndo可能）
    if (to === "LISTING") {
      const ok = window.confirm("LISTINGへ移動します。後でRAW/ORIGINALへ戻せます。続行しますか？");
      if (!ok) return;
    }

    const from = img.image_type;

    // 楽観更新で即座にUI反映
    setImages((prev) => prev.map((i) => (i.id === img.id ? { ...i, image_type: to } : i)));
    setSelectedIds(new Set());

    try {
      const res = await fetch("/api/sku-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: img.id, image_type: to }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "update failed");
      }

      if (!opts?.silent) {
        if (undoTimer) clearTimeout(undoTimer);
        setMoveBanner({
          id: img.id,
          from,
          to,
          name: (img.storage_path || "").split("/").pop() || img.storage_path,
        });
        const t = setTimeout(() => setMoveBanner(null), 8000);
        setUndoTimer(t);
      }
    } catch (e) {
      console.error("画像タイプ変更エラー:", e);
      setMoveBanner(null);
      if (undoTimer) clearTimeout(undoTimer);
      // DBを正とする
      await loadSkuImages();
    }
  };

  const handleUndoMove = async () => {
    if (!moveBanner) return;
    const { id, from } = moveBanner;
    if (undoTimer) clearTimeout(undoTimer);
    setMoveBanner(null);

    // 楽観的に元に戻す
    setImages((prev) => prev.map((i) => (i.id === id ? { ...i, image_type: from } : i)));

    try {
      const res = await fetch("/api/sku-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, image_type: from }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "undo failed");
      }
    } catch (e) {
      console.error("UNDO失敗:", e);
      await loadSkuImages();
    }
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!editingItem?.sku || !e.target.files?.length) return;

    console.log("📤 画像アップロード開始", {
      sku: editingItem.sku,
      folder: imageTab,
      fileCount: e.target.files.length,
    });

    setUploadingImages(true);
    setImageUploadError("");

    try {
      const formData = new FormData();
      formData.append("sku", editingItem.sku);
      formData.append("imageType", imageTab); // APIが期待しているフィールド名

      for (const file of e.target.files) {
        console.log("📎 ファイル追加:", file.name, file.size, "bytes");
        formData.append("files", file);
      }

      console.log("🌐 APIリクエスト送信中...");
      const res = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });

      console.log("📥 APIレスポンス受信:", res.status, res.statusText);

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        console.error("❌ アップロードエラー:", error);
        throw new Error(error.error || `アップロード失敗 (HTTP ${res.status})`);
      }

      const data = await res.json();
      console.log("✅ アップロード成功:", data);
      
      // 画像一覧を再読み込み
      console.log("🔄 画像リスト再読み込み中...");
      await loadSkuImages();
      
      // ファイルインプットをリセット
      e.target.value = "";
      console.log("✨ アップロード完了");
    } catch (e: any) {
      console.error("💥 アップロード失敗:", e);
      setImageUploadError(e.message || "アップロード失敗");
    } finally {
      setUploadingImages(false);
    }
  };

  const handleSetThumbnail = async (path: string) => {
    if (!editingItem) return;
    setSettingThumbnail(true);
    try {
      const res = await fetch("/api/sku-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingItem.id, thumbnail_path: path }),
      });
      if (!res.ok) throw new Error("サムネイル設定に失敗しました");
      setEditingItem((prev) => (prev ? { ...prev, thumbnail_path: path } : prev));
      setSaveBanner("✅ サムネイルを設定しました");
      setTimeout(() => setSaveBanner(null), 1500);
    } catch (e) {
      setSaveBanner("❌ サムネイルの設定に失敗しました");
      setTimeout(() => setSaveBanner(null), 2500);
    } finally {
      setSettingThumbnail(false);
    }
  };

  // 保存処理: 利益情報もDBへ反映
  const handleSave = async () => {
    if (!editingItem) return;
    // ステータスが「出品待ち」「完了」への変更時、カテゴリ必須チェック
    if (!canMoveToListingState(editingItem.status, editingItem)) {
      setSaveBanner("❌ カテゴリが未設定のため、出品待ちにできません");
      setTimeout(() => setSaveBanner(null), 3000);
      setShowCategoryModal(true);
      return;
    }

    setSaving(true);
    try {
      // 利益・原価・売価・送料なども一緒に保存（string→numberに変換）
      const res = await fetch("/api/sku-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingItem.id,
              thumbnail_path: editingItem.thumbnail_path ?? null,
          profit_jpy: profitResult ? profitResult.netProfitJPY : 0,
          profit_rate: profitResult ? profitResult.profitRate : 0,
          purchase_cost_jpy: Number(purchaseCostJPY) || 0,
          shipping_cost_jpy: Number(domesticShippingJPY) || 0,
          sale_price_usd: Number(sellingPriceUSD) || 0,
          sale_price_jpy: Number(sellingPriceJPY) || 0,
          shipping_cost_usd: Number(shippingCostUSD) || 0,
          exchange_rate: Number(exchangeRate) || 150,
          ebay_category_id: editingItem.ebay_category_id,
          ebay_category_path_snapshot: editingItem.ebay_category_path_snapshot,
        }),
      });
      if (res.ok) {
        setSaveBanner("✅ 保存されました");
        setTimeout(() => setSaveBanner(null), 1500);
      } else {
        setSaveBanner("❌ 保存に失敗しました");
        setTimeout(() => setSaveBanner(null), 2500);
      }
    } finally {
      setSaving(false);
    }
  };
  const bulkChangeType = async (to: ImageType) => {
    if (selectedIds.size === 0) return;

    // UI楽観更新（即反映）
    setImages((prev) =>
      prev.map((img) => (selectedIds.has(img.id) ? { ...img, image_type: to } : img))
    );

    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch("/api/sku-images", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, image_type: to }),
          }).then(async (res) => {
            if (!res.ok) {
              const j = await res.json().catch(() => ({}));
              throw new Error(j?.error || "update failed");
            }
          })
        )
      );
      setSelectedIds(new Set());
    } catch (e) {
      // 失敗したら取り直し（DBが正）
      await loadSkuImages();
    }
  };

  const handleGenerateTitle = () => { setAiGenerating(true); setTimeout(() => setAiGenerating(false), 1000); };
  const handleAutoExtract = () => { setAutoExtracting(true); setTimeout(() => setAutoExtracting(false), 1000); };
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-2xl">読み込み中...</div>
      </div>
    );
  }

  if (!editingItem) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl mb-4">SKUが見つかりません</p>
          <Link href="/sku/sku-manager" className="text-blue-400 hover:text-blue-300">
            SKU管理ページに戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      {/* ===== タブナビゲーション ===== */}
      <div className="sticky top-0 z-50 backdrop-blur-sm border-b border-slate-700 bg-slate-800/95 mb-6">
        <div className="max-w-6xl mx-auto px-4">
          {/* 編集対象サマリー: SKUを常に表示 */}
          {editingItem && (
            <div className="flex items-center gap-3 py-2 text-sm text-slate-200 border-b border-slate-700/70">
              <span className="font-mono text-base font-semibold text-blue-300">{editingItem.sku}</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-300">商品名: <span className="text-slate-400">{editingItem.title || "（未入力）"}</span></span>
              {(() => {
                const requiredKeys = ["Brand", "Model", "Color"] as const;
                const specs = editingItem.item_specifics || {};
                const missing = requiredKeys.filter((k) => !specs[k] || !String(specs[k]).trim());
                return missing.length > 0 ? (
                  <span className="text-red-400 font-semibold">要対応 🔴</span>
                ) : (
                  <span className="text-emerald-300 font-semibold">OK</span>
                );
              })()}
            </div>
          )}

          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab("images")}
              className={`px-6 py-3 font-semibold whitespace-nowrap transition border-b-2 ${
                activeTab === "images"
                  ? "border-blue-500 text-blue-400 bg-blue-900/20"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-700/30"
              }`}
            >
              📸 画像管理
            </button>
            <button
              onClick={() => setActiveTab("price")}
              className={`px-6 py-3 font-semibold whitespace-nowrap transition border-b-2 ${
                activeTab === "price"
                  ? "border-blue-500 text-blue-400 bg-blue-900/20"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-700/30"
              }`}
            >
              💰 価格・利益
            </button>
            <button
              onClick={() => setActiveTab("ebay")}
              className={`px-6 py-3 font-semibold whitespace-nowrap transition border-b-2 ${
                activeTab === "ebay"
                  ? "border-blue-500 text-blue-400 bg-blue-900/20"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-700/30"
              }`}
            >
              🛒 eBay設定
            </button>
            <button
              onClick={() => setActiveTab("info")}
              className={`px-6 py-3 font-semibold whitespace-nowrap transition border-b-2 ${
                activeTab === "info"
                  ? "border-blue-500 text-blue-400 bg-blue-900/20"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-700/30"
              }`}
            >
              📝 商品情報
            </button>
          </div>
        </div>
      </div>

      {/* ===== Sticky作業ナビゲーション ===== */}
      <div className="sticky top-[60px] z-40 backdrop-blur-sm border-b border-slate-700 bg-slate-800/90 mb-4">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            {/* 画像ステータス */}
            <div className={`p-2 rounded ${
              counts.RAW === 0 || counts.ORIGINAL === 0 || counts.LISTING === 0
                ? 'bg-red-900/40 border border-red-600'
                : 'bg-emerald-900/40 border border-emerald-600'
            }`}>
              <div className="font-bold mb-1">📸 画像</div>
              <div className="text-[10px] space-y-0.5">
                <div>RAW: {counts.RAW}/{TARGET.RAW}</div>
                <div>ORIGINAL: {counts.ORIGINAL}/{TARGET.ORIGINAL}</div>
                <div>LISTING: {counts.LISTING}/{TARGET.LISTING}</div>
              </div>
            </div>

            {/* 価格ステータス */}
            <div className={`p-2 rounded ${
              !purchaseCostJPY || (!sellingPriceUSD && !sellingPriceJPY)
                ? 'bg-red-900/40 border border-red-600'
                : 'bg-emerald-900/40 border border-emerald-600'
            }`}>
              <div className="font-bold mb-1">💰 価格</div>
              <div className="text-[10px]">
                <div>原価: {purchaseCostJPY ? '✓' : '✗'}</div>
                <div>販売: {(sellingPriceUSD || sellingPriceJPY) ? '✓' : '✗'}</div>
              </div>
            </div>

            {/* eBayメタデータ */}
            <div className={`p-2 rounded ${
              !editingItem.ebay_category_id || !editingItem.title_optimized
                ? 'bg-red-900/40 border border-red-600'
                : 'bg-emerald-900/40 border border-emerald-600'
            }`}>
              <div className="font-bold mb-1">🏷️ eBay</div>
              <div className="text-[10px]">
                <div>カテゴリ: {editingItem.ebay_category_id ? '✓' : '⚠ 未設定'}</div>
                <div>最適化: {editingItem.title_optimized ? '✓' : '✗'}</div>
                <div className="text-red-300 font-semibold mt-1">
                  {!editingItem.ebay_category_id && '出品: 不可'}
                  {editingItem.ebay_category_id && '出品: 可'}
                </div>
              </div>
            </div>

            {/* 説明文 */}
            <div className={`p-2 rounded ${
              !editingItem.description
                ? 'bg-amber-900/40 border border-amber-600'
                : 'bg-emerald-900/40 border border-emerald-600'
            }`}>
              <div className="font-bold mb-1">📝 説明文</div>
              <div className="text-[10px]">
                {editingItem.description ? '入力済み' : '未入力'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {saveBanner && (
        <div className="fixed top-0 left-0 w-full z-50 text-center py-3 font-bold" style={{ background: saveBanner.startsWith("✅") ? '#064e3b' : '#7f1d1d', color: '#fff' }}>
          {saveBanner}
        </div>
      )}
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">✏️ SKU編集</h1>
          <div className="flex gap-3">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-slate-700 rounded hover:bg-slate-600"
            >
              🔙 戻る
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? "保存中..." : "💾 保存"}
            </button>
          </div>
        </div>

        {/* ===== タブコンテンツエリア ===== */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-6">
          {/* ===== 画像タブ ===== */}
          {activeTab === "images" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-4">📸 画像管理</h2>
              
              {/* 画像情報サマリー */}
              {imageInfo && (
                <div className="p-3 bg-slate-700 rounded text-sm">
                  <h4 className="font-semibold mb-2">📸 画像情報</h4>
                  <div className="space-y-1 text-xs text-gray-300">
                    <div>• RAW (未加工): {imageInfo?.raw || 0} 枚</div>
                    <div>• Original (元画像): {imageInfo?.original || 0} 枚</div>
                    <div>• Edited (編集): {imageInfo?.edited || 0} 枚</div>
                    <div>• Listing (出品用): {imageInfo?.listing || 0} 枚</div>
                  </div>
                  {!imagesReady && (
                    <p className="text-yellow-500 mt-2 text-xs font-semibold">
                      ⚠️ RAW、Original、Listing の画像が必要です
                    </p>
                  )}
                  {imagesReady && (
                    <p className="text-green-500 mt-2 text-xs font-semibold">
                      ✅ 画像が揃っています
                    </p>
                  )}
                </div>
              )}

              {/* 移動のUndoバナー */}
              {moveBanner && (
                <div className="flex items-center justify-between gap-3 p-3 bg-amber-900/60 border border-amber-500 rounded text-xs text-amber-100">
                  <div>
                    {moveBanner.name || "画像"} を {moveBanner.from} → {moveBanner.to} に移動しました。
                    <span className="ml-1 text-amber-200">（Storageは動かさずDBの分類のみ変更）</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleUndoMove}
                    className="px-3 py-1 rounded bg-amber-500 text-black font-semibold hover:bg-amber-400"
                  >
                    元に戻す
                  </button>
                </div>
              )}

              {/* フォルダタブ */}
              <div className="flex gap-2 mb-4 border-b border-slate-700 pb-2">
                {(["RAW", "ORIGINAL", "LISTING"] as const).map((folder) => (
                  <button
                    key={folder}
                    onClick={() => setImageTab(folder)}
                    className={`px-4 py-2 rounded font-semibold text-sm transition ${
                      imageTab === folder
                        ? "bg-blue-600 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    {folder === "RAW" && "📷 未加工"}
                    {folder === "ORIGINAL" && "🎨 元画像"}
                    {folder === "LISTING" && "🛍️ 出品用"}
                    <span className="ml-2 text-xs text-slate-300">({counts[folder]})</span>
                  </button>
                ))}
              </div>

              {/* 一括変更バー（選択時） */}
              {selectedIds.size > 0 && (
                <div className="mb-3 rounded-xl border border-blue-600 bg-blue-900/20 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-blue-200">
                      選択中: {selectedIds.size} 枚
                    </div>

                    <div className="flex gap-2">
                      {(["RAW", "ORIGINAL", "LISTING"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => bulkChangeType(t)}
                          className="rounded-md border border-blue-400 bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-500"
                        >
                          {t}へ
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={() => setSelectedIds(new Set())}
                        className="rounded-md border border-slate-500 bg-slate-800 px-3 py-1 text-xs text-slate-200 hover:bg-slate-700"
                      >
                        解除
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 画像アップロードエラー */}
              {imageUploadError && (
                <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-300 text-sm">
                  ❌ {imageUploadError}
                </div>
              )}

              {/* ファイルアップロード */}
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">
                  {imageTab === "RAW" && "未加工画像をアップロード"}
                  {imageTab === "ORIGINAL" && "元画像をアップロード"}
                  {imageTab === "LISTING" && "出品用画像をアップロード"}
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImages}
                  className="w-full p-2 rounded bg-slate-700 text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 disabled:opacity-50"
                />
                <p className="text-xs text-slate-400 mt-1">複数選択可。drag & drop も対応</p>
              </div>

              {/* アップロード中表示 */}
              {uploadingImages && (
                <div className="mb-4 p-3 bg-blue-900/50 border border-blue-500 rounded text-blue-300 text-sm">
                  ⏳ アップロード中...
                </div>
              )}

              {/* 既存画像の一覧 */}
              {images.length > 0 ? (
                <div className="grid grid-cols-4 gap-3">
                  {images
                    .filter((img) => img.image_type === imageTab)
                    .map((img) => {
                      const imageName = (img.storage_path || "").split("/").pop() || img.storage_path;
                      return (
                      <div
                        key={img.id}
                        className={`relative rounded-lg border p-2 transition-all ${
                          selectedIds.has(img.id)
                            ? "border-blue-400 bg-blue-900/20"
                            : "border-slate-700 bg-slate-800/50"
                        } ${editingItem?.thumbnail_path === img.storage_path ? "ring-2 ring-yellow-400" : ""}`}
                      >
                        {/* チェックボックス - 絶対に見える */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelected(img.id);
                          }}
                          className={`absolute right-2 top-2 z-30 flex h-7 w-7 items-center justify-center rounded-md border shadow-lg transition ${
                            selectedIds.has(img.id)
                              ? "border-blue-200 bg-blue-500 text-white"
                              : "border-slate-300 bg-slate-900/80 text-slate-200"
                          }`}
                          aria-label="select"
                          title="選択"
                        >
                          {selectedIds.has(img.id) ? "✓" : "□"}
                        </button>

                        {editingItem?.thumbnail_path === img.storage_path && (
                          <span className="absolute left-2 top-2 text-[10px] px-2 py-0.5 rounded bg-yellow-500 text-black font-semibold z-20">
                            メイン
                          </span>
                        )}

                        {/* 画像 */}
                        <div className="aspect-square w-full overflow-hidden rounded-md bg-black">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img.public_url || ""}
                            alt={imageName}
                            className="h-full w-full object-cover"
                          />
                        </div>

                        <span className="mt-1 block line-clamp-1 text-[11px] text-slate-300 text-center">
                          {imageName}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleSetThumbnail(img.storage_path)}
                          disabled={settingThumbnail || editingItem?.thumbnail_path === img.storage_path}
                          className="mt-2 w-full text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {editingItem?.thumbnail_path === img.storage_path ? "選択中" : "サムネに設定"}
                        </button>

                        {/* 分類変更ボタン：Storageは触らずimage_typeのみ変更 */}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(["RAW", "ORIGINAL", "LISTING"] as const)
                            .filter((t) => t !== img.image_type)
                            .map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => changeImageType(img, t)}
                                className="flex-1 min-w-[70px] rounded border border-slate-600 bg-slate-700 px-2 py-1 text-[11px] text-slate-100 hover:bg-slate-600"
                              >
                                {t}へ
                              </button>
                            ))}
                        </div>
                      </div>
                    )})}
                </div>
              ) : (
                <div className="text-slate-400 text-sm text-center py-8">
                  このフォルダに画像はありません。上からアップロードしてください。
                </div>
              )}

              {/* 枚数サマリー */}
              <div className="mt-4 p-3 bg-slate-700 rounded text-sm space-y-1">
                <div className="text-slate-300">
                  📸 <span className="font-semibold">画像枚数サマリー</span>
                </div>
                <div className="text-xs text-slate-200 mt-1">
                  RAW: {counts.RAW}/{TARGET.RAW} ／ ORIGINAL: {counts.ORIGINAL}/{TARGET.ORIGINAL} ／ LISTING: {counts.LISTING}/{TARGET.LISTING}
                </div>
                {counts.RAW < TARGET.RAW || counts.ORIGINAL < TARGET.ORIGINAL || counts.LISTING < TARGET.LISTING ? (
                  <div className="text-yellow-300 text-xs mt-2 font-semibold">
                    ⚠️{" "}
                    {[
                      counts.RAW < TARGET.RAW && `RAW が${TARGET.RAW - counts.RAW}枚不足`,
                      counts.ORIGINAL < TARGET.ORIGINAL && `ORIGINAL が${TARGET.ORIGINAL - counts.ORIGINAL}枚不足`,
                      counts.LISTING < TARGET.LISTING && `LISTING が${TARGET.LISTING - counts.LISTING}枚不足`,
                    ]
                      .filter(Boolean)
                      .join("、")}
                  </div>
                ) : (
                  <div className="text-green-400 mt-2 font-semibold text-xs">✅ 画像が揃っています</div>
                )}
              </div>
            </div>
          )}

          {/* ===== 価格・利益タブ ===== */}
          {activeTab === "price" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-4">💰 価格・利益計算</h2>
              
              {/* 出品判定 */}
              {profitResult ? (
                <div
                  className={`mb-4 p-4 rounded-lg ${
                    profitResult.profitRate >= 15
                      ? "bg-green-600"
                      : profitResult.profitRate >= 10
                      ? "bg-yellow-600"
                      : "bg-red-600"
                  }`}
                >
                  <div className="flex items-center justify-between text-white">
                    <span className="text-xl font-bold">
                      {profitResult.profitRate >= 15
                        ? "出品OK"
                        : profitResult.profitRate >= 10
                        ? "要検討"
                        : "利益率低"}
                    </span>
                    <span>
                      利益 ¥{profitResult.netProfitJPY.toLocaleString()} / 利益率 {profitResult.profitRate}%
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mb-4 p-4 rounded-lg bg-slate-600">
                  <div className="flex items-center justify-between text-white">
                    <span className="text-xl font-bold">未計算</span>
                    <span className="text-sm">販売価格を入力してください</span>
                  </div>
                </div>
              )}

              <div className="text-xs text-yellow-300 mb-4">※ このシートは概算です。実際の利益は手数料・為替等で変動します。</div>

              {/* モード切替（管理者のみ） */}
              {canSwitchPriceMode && (
                <div className="mb-4 flex gap-6 items-center">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={priceMode === "usd"}
                      onChange={() => switchToUSD()}
                    />
                    USD基準で計算する
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={priceMode === "jpy"}
                      onChange={() => switchToJPY()}
                    />
                    JPY基準で直接入力する（管理者）
                  </label>
                </div>
              )}
              
              {/* 価格入力フォーム */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">想定販売価格（USD）</label>
                  <input
                    type="number"
                    value={sellingPriceUSD}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSellingPriceUSD(v === "" ? "" : v);
                    }}
                    disabled={priceMode === "jpy"}
                    className="w-full p-2 rounded bg-slate-700 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">想定販売価格（JPY）</label>
                  <input
                    type="number"
                    value={sellingPriceJPY}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSellingPriceJPY(v === "" ? "" : v);
                    }}
                    disabled={priceMode === "usd"}
                    className="w-full p-2 rounded bg-slate-700 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">仕入れ価格（JPY）</label>
                  <input
                    type="number"
                    value={purchaseCostJPY}
                    onChange={(e) => {
                      const v = e.target.value;
                      setPurchaseCostJPY(v === "" ? "" : v);
                    }}
                    className="w-full p-2 rounded bg-slate-700 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">国内送料（JPY）</label>
                  <input
                    type="number"
                    value={domesticShippingJPY}
                    onChange={(e) => {
                      const v = e.target.value;
                      setDomesticShippingJPY(v === "" ? "" : v);
                    }}
                    className="w-full p-2 rounded bg-slate-700 text-white text-sm"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    想定送料（USD）
                    <span className="ml-2 text-xs text-slate-400">デフォルト: 35</span>
                  </label>
                  <input
                    type="number"
                    value={shippingCostUSD}
                    onChange={(e) => {
                      const v = e.target.value;
                      setShippingCostUSD(v === "" ? "" : v);
                    }}
                    disabled={priceMode === "jpy"}
                    className="w-full p-2 rounded bg-slate-700 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">想定送料（JPY）</label>
                  <input
                    type="number"
                    value={shippingCostJPY}
                    onChange={(e) => {
                      const v = e.target.value;
                      setShippingCostJPY(v === "" ? "" : v);
                    }}
                    disabled={priceMode === "usd"}
                    className="w-full p-2 rounded bg-slate-700 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    為替レート（USD→JPY）
                    <span className="ml-2 text-xs text-slate-400">デフォルト: 150</span>
                  </label>
                  <input
                    type="number"
                    value={exchangeRate}
                    onChange={(e) => {
                      const v = e.target.value;
                      setExchangeRate(v === "" ? "" : v);
                    }}
                    className="w-full p-2 rounded bg-slate-700 text-white text-sm"
                  />
                </div>
              </div>

              {/* 利益計算結果 */}
              <div className="p-4 bg-slate-700 rounded-lg space-y-2">
                <h4 className="font-bold text-sm mb-3">💡 利益試算</h4>
                {profitResult ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">総売上:</span>
                      <span className="font-semibold">
                        ¥{profitResult.totalRevenueJPY.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">総手数料:</span>
                      <span className="text-red-400 font-semibold">
                        -¥{profitResult.totalFeesJPY.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">配送コスト:</span>
                      <span className="text-red-400 font-semibold">
                        -¥{profitResult.shippingCostJPY.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t border-slate-700 pt-2">
                      <span>想定純利益（概算）:</span>
                      <span className={profitResult.netProfitJPY >= 0 ? "text-green-400" : "text-red-400"}>
                        ¥{profitResult.netProfitJPY.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span>想定利益率:</span>
                      <span className={profitResult.profitRate >= 15 ? "text-green-400" : profitResult.profitRate >= 10 ? "text-yellow-400" : "text-red-400"}>
                        {profitResult.profitRate}%
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">総売上:</span>
                      <span className="text-slate-500">—</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">総手数料:</span>
                      <span className="text-slate-500">—</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">配送コスト:</span>
                      <span className="text-slate-500">—</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t border-slate-700 pt-2">
                      <span>想定純利益（概算）:</span>
                      <span className="text-slate-500">—</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span>想定利益率:</span>
                      <span className="text-slate-500">—</span>
                    </div>
                  </>
                )}

                {/* 詳細表示トグル */}
                {profitResult && (
                  <>
                    <button
                      onClick={() => setShowProfitDetails(!showProfitDetails)}
                      className="w-full mt-2 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm"
                    >
                      {showProfitDetails ? "詳細を非表示 ▲" : "詳細を表示 ▼"}
                    </button>

                    {/* 詳細情報 */}
                    {showProfitDetails && (
                      <div className="mt-3 pt-3 border-t border-slate-700 space-y-3">
                        <div>
                          <h4 className="text-sm font-bold mb-2 text-red-400">手数料内訳</h4>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span>eBay手数料:</span>
                              <span>¥{profitResult.ebayFeeJPY.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>海外決済手数料:</span>
                              <span>¥{profitResult.internationalPaymentFeeJPY.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Payoneer手数料:</span>
                              <span>¥{profitResult.payoneerFeeJPY.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Payoneer固定:</span>
                              <span>¥{profitResult.payoneerFixedFeeJPY.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* ===== eBayタブ ===== */}
          {activeTab === "ebay" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-4">🛒 eBay設定</h2>
              
              {/* カテゴリセクション */}
              <div className={`p-4 rounded-lg border-2 ${
                !editingItem.ebay_category_id
                  ? 'bg-red-900/20 border-red-600'
                  : 'bg-green-900/20 border-green-600'
              }`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <label className="block text-sm font-semibold mb-1">📂 eBayカテゴリ {!editingItem.ebay_category_id && <span className="text-red-400 text-xs ml-2">⚠ 必須</span>}</label>
                    {!editingItem.ebay_category_id ? (
                      <div className="text-sm text-red-300">カテゴリ: 未設定</div>
                    ) : (
                      <div className="text-sm text-white space-y-1">
                        <div className="font-bold">{selectedCategory?.path_en || editingItem.ebay_category_path_snapshot || 'カテゴリ設定済み'}</div>
                        {selectedCategory?.path_ja && <div className="text-xs text-gray-400">{selectedCategory.path_ja}</div>}
                        <div className="text-xs text-gray-400">ID: {editingItem.ebay_category_id}</div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCategoryModal(true)}
                      className={`px-4 py-2 rounded font-bold text-sm ${
                        !editingItem.ebay_category_id
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {editingItem.ebay_category_id ? 'カテゴリを変更' : 'カテゴリを選択'}
                    </button>
                    {editingItem.ebay_category_id && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItem({ ...editingItem, ebay_category_id: null, ebay_category_path_snapshot: null });
                          setSelectedCategory(null);
                        }}
                        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                      >
                        クリア
                      </button>
                    )}
                  </div>
                </div>
                {!editingItem.ebay_category_id && (
                  <div className="text-xs text-red-300 bg-red-900/30 p-2 rounded mt-2">
                    ⚠️ カテゴリ未設定のため、CSV出力できません。上のボタンから選択してください。
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">カテゴリ番号</label>
                <input
                  type="text"
                  value={editingItem.ebay_category_id ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setEditingItem({
                      ...editingItem,
                      ebay_category_id: v ? Number(v) : null,
                    });
                  }}
                  className="w-full p-2 rounded bg-slate-700 text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">最適化タイトル</label>
                <textarea
                  value={editingItem.title_optimized || ""}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, title_optimized: e.target.value || null })
                  }
                  className="w-full p-2 rounded bg-slate-700 text-white resize-none text-sm"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                  説明文
                  <button
                    type="button"
                    onClick={handleGenerateDescription}
                    disabled={descGenerating}
                    className="ml-2 px-3 py-1 bg-blue-700 text-white rounded hover:bg-blue-800 text-xs disabled:opacity-50"
                  >
                    {descGenerating ? "生成中..." : "🤖 AIで説明文を生成"}
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateDescriptionJa}
                    disabled={descJaGenerating}
                    className="ml-2 px-3 py-1 bg-green-700 text-white rounded hover:bg-green-800 text-xs disabled:opacity-50"
                  >
                    {descJaGenerating ? "翻訳中..." : "🌐 日本語に翻訳"}
                  </button>
                </label>
                <div className="flex items-center gap-2 mb-2 text-xs text-slate-300">
                  <span className="text-slate-400">プロバイダ:</span>
                  <button
                    type="button"
                    onClick={() => setDescProvider("gemini")}
                    className={`px-2 py-1 rounded border ${
                      descProvider === "gemini"
                        ? "bg-indigo-700 border-indigo-500 text-white"
                        : "bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                    }`}
                  >
                    Gemini（デフォルト）
                  </button>
                  <button
                    type="button"
                    onClick={() => setDescProvider("openai")}
                    className={`px-2 py-1 rounded border ${
                      descProvider === "openai"
                        ? "bg-purple-700 border-purple-500 text-white"
                        : "bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                    }`}
                  >
                    OpenAI（仕上げ）
                  </button>
                  {descProviderUsed && (
                    <span className="ml-2 text-slate-400">
                      使用: {descProviderUsed}
                      {descFallbackReason && (
                        <span className="text-amber-300 ml-1">(fallback: {descFallbackReason})</span>
                      )}
                    </span>
                  )}
                </div>
                {descBanner && (
                  <div
                    className={`mb-2 px-3 py-2 rounded border text-xs ${
                      descBanner.type === "success"
                        ? "bg-emerald-900/40 border-emerald-600 text-emerald-100"
                        : descBanner.type === "warning"
                        ? "bg-amber-900/40 border-amber-600 text-amber-100"
                        : "bg-red-900/40 border-red-600 text-red-100"
                    }`}
                  >
                    {descBanner.message}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-slate-400 mb-1">英語説明文（編集可）</div>
                    <textarea
                      value={editingItem.description || ""}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, description: e.target.value || null })
                      }
                      className="w-full p-2 rounded bg-slate-700 text-white resize-y text-sm"
                      rows={16}
                    />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-1">日本語説明文（自動翻訳プレビュー）</div>
                    <textarea
                      value={descJa}
                      readOnly
                      className="w-full p-2 rounded bg-slate-700 text-white resize-y text-sm opacity-90"
                      rows={16}
                      placeholder="日本語説明文がここに表示されます"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== 商品情報タブ（現在の全コンテンツ） ===== */}
          {activeTab === "info" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-4">📝 商品情報</h2>
              
              {/* SKU情報 */}
              <div>
                <label className="block text-sm font-semibold mb-2">SKU番号</label>
                <input
                  type="text"
                  value={editingItem.sku}
                  disabled
                  className="w-full p-2 rounded bg-slate-700 text-slate-400 cursor-not-allowed"
                />
              </div>

              {/* 商品名 */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  商品名（{(editingItem.title || "").length}/80）
                </label>
                <input
                  type="text"
                  value={editingItem.title || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value || null })}
                  maxLength={80}
                  className="w-full p-2 rounded bg-slate-700 text-white"
                />
                <p className="text-xs text-slate-400 mt-1">SKU一覧に表示される名前</p>
              </div>

              {/* 状態 */}
              <div>
                <label className="block text-sm font-semibold mb-2">ステータス</label>
                <select
                  value={editingItem.status || "none"}
                  onChange={(e) => {
                    const nextStatus = (e.target.value as SkuStatus) || null;
                    if (!canMoveToListingState(nextStatus, editingItem)) {
                      alert("カテゴリが未設定のため、出品待ち/完了に変更できません。カテゴリを選択してください。");
                      setShowCategoryModal(true);
                      return;
                    }
                    setEditingItem({ ...editingItem, status: nextStatus });
                  }}
                  className="w-full p-2 rounded bg-slate-700 text-white"
                >
                  <option value="none">未設定</option>
                  <option value="shooting">📷 撮影待ち</option>
                  <option value="editing">✂️ 編集待ち</option>
                  <option value="listing">🛒 出品待ち</option>
                  <option value="done">🏁 完了</option>
                </select>
              </div>

              {/* ユーザー補足情報 */}
              <div>
                <label className="block text-sm font-semibold mb-2">補足情報（AI生成の参考）</label>
                <textarea
                  value={editingItem.notes || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value || null })}
                  className="w-full p-2 rounded bg-slate-700 text-white resize-none text-xs"
                  rows={3}
                  placeholder="例：ブランド名、特徴、用途など"
                />
              </div>

              {/* AI生成・自動抽出（管理者のみ表示） */}
              {userRole === "admin" && (
                <>
                  <button
                    onClick={handleGenerateTitle}
                    disabled={!imagesReady || aiGenerating}
                    className="w-full px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    {aiGenerating ? "🤖 生成中..." : "🤖 AIで商品名を生成"}
                  </button>
                  <button
                    onClick={handleAutoExtract}
                    disabled={!imagesReady || autoExtracting}
                    className="w-full px-4 py-2 bg-purple-600 rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    {autoExtracting ? "🔄 抽出中..." : "🔍 AI自動抽出（商品情報）"}
                  </button>
                </>
              )}

              {/* 抽出エラー表示 */}
              {extractionError && (
                <div className="p-3 bg-red-900 rounded text-red-200 text-sm">
                  ⚠️ {extractionError}
                </div>
              )}

              {/* AI抽出されたメタデータ表示 */}
              {(editingItem.genre || editingItem.brand || editingItem.model) && (
                <div className="p-4 bg-slate-800 rounded border border-slate-700">
                  <h4 className="font-semibold mb-3 text-sm">🤖 AI が抽出した商品情報</h4>
                  <div className="space-y-2 text-xs">
                    {editingItem.genre && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">ジャンル:</span>
                        <span className="font-semibold">{editingItem.genre}</span>
                      </div>
                    )}
                    {editingItem.brand && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">ブランド:</span>
                        <span className="font-semibold">{editingItem.brand}</span>
                      </div>
                    )}
                    {editingItem.model && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">型番:</span>
                        <span className="font-semibold">{editingItem.model}</span>
                      </div>
                    )}
                    {editingItem.color && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">色:</span>
                        <span className="font-semibold">{editingItem.color}</span>
                      </div>
                    )}
                    {editingItem.condition && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">状態:</span>
                        <span className="font-semibold">{editingItem.condition}</span>
                      </div>
                    )}
                    {editingItem.ebay_category_id && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">eBayカテゴリ:</span>
                        <span className="font-semibold">{editingItem.ebay_category_path_snapshot || `ID: ${editingItem.ebay_category_id}`}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 商品情報 */}
              <div className="border-t border-slate-700 pt-6">
                <h3 className="text-lg font-bold mb-4">📦 商品情報</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">ブランド</label>
                    <input
                      type="text"
                      value={editingItem.brand || ""}
                      onChange={(e) => setEditingItem({ ...editingItem, brand: e.target.value || null })}
                      className="w-full p-2 rounded bg-slate-700 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">型番</label>
                    <input
                      type="text"
                      value={editingItem.model || ""}
                      onChange={(e) => setEditingItem({ ...editingItem, model: e.target.value || null })}
                      className="w-full p-2 rounded bg-slate-700 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">色</label>
                    <input
                      type="text"
                      value={editingItem.color || ""}
                      onChange={(e) => setEditingItem({ ...editingItem, color: e.target.value || null })}
                      className="w-full p-2 rounded bg-slate-700 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">状態</label>
                    <input
                      type="text"
                      value={editingItem.condition || ""}
                      onChange={(e) => setEditingItem({ ...editingItem, condition: e.target.value || null })}
                      className="w-full p-2 rounded bg-slate-700 text-white text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 保存ボタン */}
          <div className="border-t border-slate-700 pt-6 flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-3 bg-green-600 rounded hover:bg-green-700 disabled:opacity-50 font-bold text-lg"
            >
              {saving ? "保存中..." : "💾 変更を保存"}
            </button>
            <button
              onClick={() => router.back()}
              className="flex-1 px-4 py-3 bg-slate-700 rounded hover:bg-slate-600 font-bold text-lg"
            >
              ❌ キャンセル
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-700 text-center">
            <a
              href="/"
              className="inline-block px-6 py-2 bg-slate-600 text-white rounded hover:bg-slate-700 font-medium"
            >
              ← ホームに戻る
            </a>
          </div>
        </div>
      </div>

      {/* カテゴリ選択モーダル（ルート直下に配置） */}
      <CategorySelectModal
        open={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onSelect={handleSelectCategory}
      />
    </div>
  );
}
