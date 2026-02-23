"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CONDITION_OPTIONS, type Sku_condition, getConditionLabel, getMinProfitRate, type SkuStatus } from "../../../lib/skuCondition";
import { calculateProfit as calcProfitLib, DEFAULT_PROFIT_SETTINGS } from "@/app/lib/profitCalculator";
import ImageClassifier from "./_components/ImageClassifier";

// AI生成ステータス型
type AiGenStatus = "not_generated" | "generated" | "needs_regen" | "error";


type EditingItem = {
  id: string;
  sku: string;
  title: string | null;
  status: SkuStatus | null;
  genre: string | null;
  brand: string | null;
  model: string | null;
  color: string | null;
  condition: string | null;
  ebay_category_id: number | null;
  ebay_category_path_snapshot: string | null;
  title_optimized: string | null;
  description: string | null;
  item_specifics: Record<string, string>;
  ai_extracted_at: string | null;
  thumbnail_path: string | null;
  inventory_status: string | null;
  inbound_date: string | null;
  listed_date: string | null;
  shipped_date: string | null;
  stale_days: number | null;
  shipping_carrier: string | null;
  shipping_tracking: string | null;
  purchase_cost_jpy: number | null;
  shipping_cost_jpy: number | null;
  domestic_shipping: number | null;
  ebay_fee_rate: number | null;
  payoneer_fee_rate: number | null;
  sale_price_usd: number | null;
  sale_price_jpy: number | null;
  cost_jpy: number | null;
  ebay_fee_jpy: number | null;
  payoneer_fee_jpy: number | null;
  total_fee_jpy: number | null;
  profit_jpy: number | null;
  profit_rate: number | null;
  is_profitable: boolean | null;
  channel: string | null;
  shipping_cost_usd: number | null;
  ebay_fee_percent: number | null;
  promoted_listing_percent: number | null;
  sale_fee_percent: number | null;
  exchange_rate: number | null;
  sku_condition: string | null;
  deleted_at: string | null;
  notes?: string | null;
  supplier_name?: string | null;
  procurement_date?: string | null;
  procurement_method?: string | null;
  procurement_cost_jpy?: number | null;
  receipt_exists?: boolean;
  procurement_notes?: string | null;
};

type SalesChannel = "ebay" | "domestic" | "other";

type ProfitCalc = {
  channel: SalesChannel;
  // 販売価格
  sellingPriceUSD: number | null;
  // 送料
  shippingCostUSD: number;
  // 手数料率
  ebayFeesPercent: number;
  promotedListingPercent: number;
  saleFeePercent: number;
  payoneerFeePercent: number;
  payoneerFixedUSD: number;
  // 為替
  exchangeRate: number;
  // サーバースナップショット用
  costPriceJPY?: number | null;
  shippingCostJPY?: number | null;
};

const PROFIT_DEFAULTS: ProfitCalc = {
  channel: "ebay",
  sellingPriceUSD: null,
  shippingCostUSD: 35,
  ebayFeesPercent: 12.9,
  promotedListingPercent: 0,
  saleFeePercent: 1.35,
  payoneerFeePercent: 2.0,
  payoneerFixedUSD: 0.4,
  exchangeRate: 150,
};

const STATUS_LABEL: Record<SkuStatus, string> = {
  shooting: "📷 撮影待ち",
  editing: "✂️ 編集待ち",
  listing: "🛒 出品待ち",
  done: "🏁 完了",
  none: "未設定",
};

export default function SkuEditPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;

  // AI生成ステータス管理
  const [aiGenStatus, setAiGenStatus] = useState<AiGenStatus>("not_generated");
  const [aiGenError, setAiGenError] = useState<string | null>(null);
  const prevJaInfo = useRef<{ title: string; description: string; item_specifics: any } | null>(null);

  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageInfo, setImageInfo] = useState<any>(null);
  const [imagesReady, setImagesReady] = useState(false);
  const [autoExtracting, setAutoExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [item_specificsDraft, setItem_specificsDraft] = useState<Record<string, string>>({});
  const [requiredError, setRequiredError] = useState<string | null>(null);
  const [profitCalc, setProfitCalc] = useState<ProfitCalc>({ ...PROFIT_DEFAULTS });
  const [selectedTemplate, setSelectedTemplate] = useState<string>("basic");
  const [templateSelecting, setTemplateSelecting] = useState(false);
  const [templateToast, setTemplateToast] = useState<string | null>(null);
  const [saveBanner, setSaveBanner] = useState<{ type: "success" | "warning" | "error"; message: string } | null>(null);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  
  // タブ状態管理
  const [activeTab, setActiveTab] = useState<"images" | "price" | "ebay" | "info">("images");

  // データ読み込み
  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch(`/api/sku/${id}`);
        if (!res.ok) throw new Error("データ取得失敗");
        const data = await res.json();
        // DBカラム名→UI型へ明示的にマッピング（null/undefinedも明示的に初期化）
        const mapped: EditingItem = {
          id: data.id ?? "",
          sku: data.sku ?? "",
          title: data.title ?? "",
          status: data.status ?? "none",
          genre: data.genre ?? "",
          brand: data.brand ?? "",
          model: data.model ?? "",
          color: data.color ?? "",
          condition: data.condition ?? "",
          ebay_category_id: typeof data.ebay_category_id === "number" ? data.ebay_category_id : null,
          ebay_category_path_snapshot: data.ebay_category_path_snapshot ?? null,
          title_optimized: data.title_optimized ?? "",
          description: data.description ?? "",
          item_specifics: data.item_specifics ?? {},
          ai_extracted_at: data.ai_extracted_at ?? null,
          thumbnail_path: data.thumbnail_path ?? "",
          inventory_status: data.inventory_status ?? "",
          inbound_date: data.inbound_date ?? null,
          listed_date: data.listed_date ?? null,
          shipped_date: data.shipped_date ?? null,
          stale_days: data.stale_days ?? null,
          shipping_carrier: data.shipping_carrier ?? "",
          shipping_tracking: data.shipping_tracking ?? "",
          purchase_cost_jpy: (data.purchase_cost_jpy != null && !isNaN(Number(data.purchase_cost_jpy))) ? Number(data.purchase_cost_jpy) : null,
          shipping_cost_jpy: (data.shipping_cost_jpy != null && !isNaN(Number(data.shipping_cost_jpy))) ? Number(data.shipping_cost_jpy) : 0,
          domestic_shipping: (data.domestic_shipping != null && !isNaN(Number(data.domestic_shipping))) ? Number(data.domestic_shipping) : null,
          ebay_fee_rate: data.ebay_fee_rate ?? 0,
          payoneer_fee_rate: data.payoneer_fee_rate ?? 0,
          sale_price_usd: (data.sale_price_usd != null && !isNaN(Number(data.sale_price_usd))) ? Number(data.sale_price_usd) : null,
          sale_price_jpy: (data.sale_price_jpy != null && !isNaN(Number(data.sale_price_jpy))) ? Number(data.sale_price_jpy) : null,
          cost_jpy: data.cost_jpy ?? 0,
          ebay_fee_jpy: data.ebay_fee_jpy ?? 0,
          payoneer_fee_jpy: data.payoneer_fee_jpy ?? 0,
          total_fee_jpy: data.total_fee_jpy ?? 0,
          // 旧スキーマ互換（profit / profitRate）。数値文字列も取りこぼさないように正規化
          profit_jpy: (data.profit_jpy !== undefined && data.profit_jpy !== null)
            ? (isNaN(Number(data.profit_jpy)) ? null : Number(data.profit_jpy))
            : (data.profit !== undefined && data.profit !== null)
              ? (isNaN(Number(data.profit)) ? null : Number(data.profit))
              : null,
          profit_rate: (data.profit_rate !== undefined && data.profit_rate !== null)
            ? (isNaN(Number(data.profit_rate)) ? null : Number(data.profit_rate))
            : (data.profitRate !== undefined && data.profitRate !== null)
              ? (isNaN(Number(data.profitRate)) ? null : Number(data.profitRate))
              : null,
          is_profitable: data.is_profitable ?? null,
          channel: data.channel ?? "ebay",
          shipping_cost_usd: (data.shipping_cost_usd != null && !isNaN(Number(data.shipping_cost_usd))) ? Number(data.shipping_cost_usd) : 0,
          ebay_fee_percent: data.ebay_fee_percent ?? 12.9,
          promoted_listing_percent: data.promoted_listing_percent ?? 0,
          sale_fee_percent: data.sale_fee_percent ?? 1.35,
          exchange_rate: (data.exchange_rate != null && !isNaN(Number(data.exchange_rate))) ? Number(data.exchange_rate) : 150,
          sku_condition: data.sku_condition ?? "",
          deleted_at: data.deleted_at ?? null,
          notes: data.notes ?? null,
          supplier_name: data.supplier_name ?? null,
          procurement_date: data.procurement_date ?? null,
          procurement_method: data.procurement_method ?? null,
          procurement_cost_jpy: data.procurement_cost_jpy ?? null,
          receipt_exists: data.receipt_exists ?? false,
          procurement_notes: data.procurement_notes ?? null,
        };
        // ローカル下書きがあれば復元（編集中の消失防止）
        const draftKey = `sku-edit-draft-${id}`;
        const draftRaw = typeof window !== "undefined" ? window.localStorage.getItem(draftKey) : null;
        if (draftRaw) {
          try {
            const draft = JSON.parse(draftRaw);
            setEditingItem({ ...mapped, ...draft });
            setSaveBanner({ type: "warning", message: "ローカル下書きを復元しました" });
          } catch {
            setEditingItem(mapped);
          }
        } else {
          setEditingItem(mapped);
        }
        // Item Specifics を初期化
        setItem_specificsDraft(mapped.item_specifics ?? {});

        // 利益計算の値をサーバー保存分 or ローカルドラフトから復存
        const profitDraftKey = `sku-edit-profit-${id}`;
        let profitDraft: Partial<ProfitCalc> | null = null;
        try {
          const profitDraftRaw = typeof window !== "undefined" ? window.localStorage.getItem(profitDraftKey) : null;
          if (profitDraftRaw) {
            profitDraft = JSON.parse(profitDraftRaw);
            console.log("[loadData] Restored profitDraft from localStorage:", profitDraft);
          }
        } catch (e) {
          console.warn("[loadData] Failed to parse profitDraft:", e);
        }

        const inferredExchangeRate = data.sale_price_usd && data.sale_price_jpy
          ? Math.round((data.sale_price_jpy / data.sale_price_usd) * 100) / 100
          : PROFIT_DEFAULTS.exchangeRate;

        // サーバー値を優先。profitDraftはサーバー値が欠けている項目のみ補完に使用。
        let profitCalcData: ProfitCalc = {
          ...PROFIT_DEFAULTS,
          channel: (data.channel as any) || "ebay",
          sellingPriceUSD: data.sale_price_usd ?? null,
          shippingCostUSD: (typeof data.shipping_cost_usd === "number" ? data.shipping_cost_usd : PROFIT_DEFAULTS.shippingCostUSD),
          ebayFeesPercent: (typeof data.ebay_fee_percent === "number" ? data.ebay_fee_percent : PROFIT_DEFAULTS.ebayFeesPercent),
          promotedListingPercent: (typeof data.promoted_listing_percent === "number" ? data.promoted_listing_percent : PROFIT_DEFAULTS.promotedListingPercent),
          saleFeePercent: (typeof data.sale_fee_percent === "number" ? data.sale_fee_percent : PROFIT_DEFAULTS.saleFeePercent),
          payoneerFeePercent: (typeof data.payoneer_fee_percent === "number" ? data.payoneer_fee_percent : PROFIT_DEFAULTS.payoneerFeePercent),
          payoneerFixedUSD: (typeof (data as any).payoneer_fixed_usd === "number" ? (data as any).payoneer_fixed_usd : PROFIT_DEFAULTS.payoneerFixedUSD),
          exchangeRate: inferredExchangeRate,
          costPriceJPY: (typeof data.purchase_cost_jpy === "number" ? data.purchase_cost_jpy : null),
          shippingCostJPY: (typeof data.shipping_cost_jpy === "number" ? data.shipping_cost_jpy : null),
        };
        if (profitDraft) {
          profitCalcData = {
            ...profitCalcData,
            sellingPriceUSD: profitCalcData.sellingPriceUSD ?? (typeof profitDraft.sellingPriceUSD === "number" ? profitDraft.sellingPriceUSD : null),
            shippingCostUSD: (typeof profitCalcData.shippingCostUSD === "number" && profitCalcData.shippingCostUSD > 0) ? profitCalcData.shippingCostUSD : (typeof profitDraft.shippingCostUSD === "number" ? profitDraft.shippingCostUSD : PROFIT_DEFAULTS.shippingCostUSD),
            ebayFeesPercent: (typeof profitCalcData.ebayFeesPercent === "number" && profitCalcData.ebayFeesPercent > 0) ? profitCalcData.ebayFeesPercent : (typeof profitDraft.ebayFeesPercent === "number" ? profitDraft.ebayFeesPercent : PROFIT_DEFAULTS.ebayFeesPercent),
            promotedListingPercent: (typeof profitCalcData.promotedListingPercent === "number") ? profitCalcData.promotedListingPercent : (typeof profitDraft.promotedListingPercent === "number" ? profitDraft.promotedListingPercent : PROFIT_DEFAULTS.promotedListingPercent),
            saleFeePercent: (typeof profitCalcData.saleFeePercent === "number") ? profitCalcData.saleFeePercent : (typeof profitDraft.saleFeePercent === "number" ? profitDraft.saleFeePercent : PROFIT_DEFAULTS.saleFeePercent),
            payoneerFeePercent: (typeof profitCalcData.payoneerFeePercent === "number") ? profitCalcData.payoneerFeePercent : (typeof profitDraft.payoneerFeePercent === "number" ? profitDraft.payoneerFeePercent : PROFIT_DEFAULTS.payoneerFeePercent),
            payoneerFixedUSD: (typeof profitCalcData.payoneerFixedUSD === "number") ? profitCalcData.payoneerFixedUSD : (typeof profitDraft.payoneerFixedUSD === "number" ? profitDraft.payoneerFixedUSD : PROFIT_DEFAULTS.payoneerFixedUSD),
            exchangeRate: (typeof profitCalcData.exchangeRate === "number" && profitCalcData.exchangeRate > 0) ? profitCalcData.exchangeRate : (typeof profitDraft.exchangeRate === "number" ? profitDraft.exchangeRate : PROFIT_DEFAULTS.exchangeRate),
            shippingCostJPY: (typeof profitCalcData.shippingCostJPY === "number" && profitCalcData.shippingCostJPY > 0) ? profitCalcData.shippingCostJPY : (typeof profitDraft.shippingCostJPY === "number" ? profitDraft.shippingCostJPY : null),
          } as ProfitCalc;
        }
        console.log("[loadData] Setting profitCalc:", profitCalcData);
        setProfitCalc(profitCalcData);

        // 画像情報取得
        const imgRes = await fetch(`/api/sku-images?sku=${data.sku}`);
        if (imgRes.ok) {
          const imgData = await imgRes.json();
          console.log('[SKU Edit] Image data:', imgData);
          const info = imgData.imageInfo || {};
          setImageInfo(info);  // imageInfo を直接設定
          const rawCount = info.RAW ?? 0;
          const originalCount = info.ORIGINAL ?? 0;
          const listingCount = info.LISTING ?? 0;
          const ready = rawCount > 0 || originalCount > 0 || listingCount > 0;
          setImagesReady(ready);
        }
      } catch (err) {
        console.error(err);
        alert("データの読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  // 編集監視してローカル下書き保存（30秒ごと）
  useEffect(() => {
    const draftKey = `sku-edit-draft-${id}`;
    let timer: any;
    timer = setInterval(() => {
      if (editingItem) {
        const snapshot = {
          title: editingItem.title,
          status: editingItem.status,
          genre: editingItem.genre,
          brand: editingItem.brand,
          model: editingItem.model,
          color: editingItem.color,
          condition: editingItem.condition,
          sku_condition: editingItem.sku_condition,
          ebay_category_id: editingItem.ebay_category_id,
          ebay_category_path_snapshot: editingItem.ebay_category_path_snapshot,
          title_optimized: editingItem.title_optimized,
          description: editingItem.description,
          item_specifics: editingItem.item_specifics,
        };
        try {
          window.localStorage.setItem(draftKey, JSON.stringify(snapshot));
        } catch {}
      }
    }, 30000);
    return () => { if (timer) clearInterval(timer); };
  }, [editingItem, id]);

  // 編集されたら未保存フラグをセット
  useEffect(() => {
    setHasUnsaved(true);
  }, [editingItem?.title, editingItem?.description, editingItem?.item_specifics, profitCalc.sellingPriceUSD, editingItem?.purchase_cost_jpy]);

  // 利益計算の入力値もローカルに保持して再訪時に復元
  useEffect(() => {
    if (loading) return;
    const profitDraftKey = `sku-edit-profit-${id}`;
    try {
      window.localStorage.setItem(profitDraftKey, JSON.stringify(profitCalc));
    } catch {}
  }, [profitCalc, id, loading]);

  // 画面離脱防止（未保存警告）
  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsaved) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [hasUnsaved]);

  // 保存（必須項目チェックあり）
  const handleSave = async () => {
    if (!editingItem) return;

    // 必須チェック: 保存ボタンは必須項目が必須
    const requiredKeys = ["Brand", "Model", "Color"];
    const specs = editingItem.item_specifics || {};
    const missing = requiredKeys.filter((k) => !specs[k] || specs[k].trim().length === 0);
    if (missing.length > 0) {
      setRequiredError(`必須項目が不足しています: ${missing.join(", ")}`);
      alert(`必須項目が不足しています: ${missing.join(", ")}`);
      return;
    }
    setRequiredError(null);

    setSaving(true);
    try {
      console.log("[handleSave] Saving SKU:", editingItem.id, editingItem.sku);
      // 価格・送料のUSD/JYP混在を整理して利益計算を統一（未入力はnullのまま保持）
      const priceUSD = profitCalc.sellingPriceUSD ?? editingItem.sale_price_usd ?? null;
      const exchangeRate = profitCalc.exchangeRate || editingItem.exchange_rate || DEFAULT_PROFIT_SETTINGS.exchangeRate;
      // priceJPY は profitCalc から優先的に計算（UI入力はここから来ている）
      const priceJPY = priceUSD ? Math.round(priceUSD * exchangeRate) : null;
      const shipUSD = profitCalc.shippingCostUSD ?? editingItem.shipping_cost_usd ?? null;
      const shipJPY = (typeof profitCalc.shippingCostJPY === "number" ? profitCalc.shippingCostJPY : undefined)
        ?? (typeof editingItem.shipping_cost_jpy === "number" ? editingItem.shipping_cost_jpy : undefined)
        ?? (shipUSD ? Math.round(shipUSD * exchangeRate) : null);
      const purchaseJPY = editingItem.purchase_cost_jpy ?? null;
      const domesticShipJPY = typeof editingItem.domestic_shipping === "number" ? editingItem.domestic_shipping : null;

      console.log("[handleSave] Parsed values:", { priceUSD, priceJPY, shipUSD, shipJPY, purchaseJPY, domesticShipJPY });

      const hasPricingInputs = (Number(priceUSD) || 0) > 0 || (Number(priceJPY) || 0) > 0;
      const hasCostInputs = (Number(purchaseJPY) || 0) > 0; // 参考用（保存条件を緩和）

      const profitInput = {
        sellingPriceUSD: priceUSD ?? (priceJPY ? Math.round(priceJPY / exchangeRate) : 0),
        shippingCostUSD: shipUSD ?? (shipJPY ? Math.round(shipJPY / exchangeRate) : 0),
        sellingPriceJPY: priceJPY ?? (priceUSD ? Math.round(priceUSD * exchangeRate) : undefined),
        shippingCostJPY: shipJPY ?? (shipUSD ? Math.round(shipUSD * exchangeRate) : undefined),
        exchangeRate,
        ebayFeePercent: profitCalc.ebayFeesPercent ?? editingItem.ebay_fee_percent ?? DEFAULT_PROFIT_SETTINGS.ebayFeePercent,
        promotedListingPercent: profitCalc.promotedListingPercent ?? editingItem.promoted_listing_percent ?? DEFAULT_PROFIT_SETTINGS.promotedListingPercent,
        internationalPaymentFeePercent: DEFAULT_PROFIT_SETTINGS.internationalPaymentFeePercent,
        payoneerFeePercent: profitCalc.payoneerFeePercent ?? editingItem.payoneer_fee_rate ?? DEFAULT_PROFIT_SETTINGS.payoneerFeePercent,
        payoneerFixedFeeUSD: profitCalc.payoneerFixedUSD ?? DEFAULT_PROFIT_SETTINGS.payoneerFixedFeeUSD,
        purchaseCostJPY: purchaseJPY ?? undefined,
        domesticShippingJPY: domesticShipJPY ?? undefined,
        packagingCostJPY: 0,
        staffCostMultiplier: DEFAULT_PROFIT_SETTINGS.staffCostMultiplier,
      };

      // 価格が入っていれば原価未入力でも暫定計算を保存（未入力は0扱い）
      const profitResult = hasPricingInputs ? calcProfitLib(profitInput) : null;

      // DBカラム名（snake_case）でbody生成（全フィールド明示的にマッピング）
      const fullBody = {
        id: editingItem.id,
        sku: editingItem.sku,
        title: editingItem.title ?? "",
        status: editingItem.status ?? "none",
        genre: editingItem.genre ?? "",
        brand: editingItem.brand ?? "",
        model: editingItem.model ?? "",
        color: editingItem.color ?? "",
        condition: editingItem.condition ?? "",
        ebay_category_id: typeof editingItem.ebay_category_id === "number" ? editingItem.ebay_category_id : null,
        ebay_category_path_snapshot: editingItem.ebay_category_path_snapshot ?? null,
        title_optimized: editingItem.title_optimized ?? "",
        description: editingItem.description ?? "",
        item_specifics: editingItem.item_specifics ?? {},
        notes: editingItem.notes ?? "",
        ai_extracted_at: new Date().toISOString(),
        thumbnail_path: editingItem.thumbnail_path ?? "",
        inventory_status: editingItem.inventory_status ?? "",
        inbound_date: editingItem.inbound_date ?? null,
        listed_date: editingItem.listed_date ?? null,
        shipped_date: editingItem.shipped_date ?? null,
        stale_days: editingItem.stale_days ?? null,
        shipping_carrier: editingItem.shipping_carrier ?? "",
        shipping_tracking: editingItem.shipping_tracking ?? "",
        purchase_cost_jpy: purchaseJPY,
        domestic_shipping: domesticShipJPY,
        shipping_cost_jpy: shipJPY ?? (shipUSD ? Math.round(shipUSD * exchangeRate) : null),
        ebay_fee_rate: editingItem.ebay_fee_rate ?? 0,
        payoneer_fee_rate: editingItem.payoneer_fee_rate ?? 0,
        sale_price_usd: priceUSD ?? (priceJPY ? Math.round(priceJPY / exchangeRate) : null),
        sale_price_jpy: priceJPY ?? (priceUSD ? Math.round(priceUSD * exchangeRate) : null),
        cost_jpy: editingItem.cost_jpy ?? 0,
        ebay_fee_jpy: editingItem.ebay_fee_jpy ?? 0,
        payoneer_fee_jpy: editingItem.payoneer_fee_jpy ?? 0,
        total_fee_jpy: editingItem.total_fee_jpy ?? 0,
        profit_jpy: profitResult ? Math.round(profitResult.netProfitJPY) : null,
        profit_rate: profitResult ? Number((profitResult.profitRate ?? 0).toFixed(2)) : null,
        is_profitable: profitResult ? profitResult.netProfitJPY > 0 && (profitResult.profitRate ?? 0) >= 15 : null,
        channel: editingItem.channel ?? "ebay",
        shipping_cost_usd: shipUSD,
        ebay_fee_percent: profitInput.ebayFeePercent,
        promoted_listing_percent: profitInput.promotedListingPercent,
        sale_fee_percent: profitCalc.saleFeePercent ?? editingItem.sale_fee_percent ?? 1.35,
        exchange_rate: exchangeRate,
        sku_condition: editingItem.sku_condition ?? "unset",
        deleted_at: editingItem.deleted_at ?? null,
      };
      console.log("[handleSave] fullBody price fields:", {
        sale_price_usd: fullBody.sale_price_usd,
        sale_price_jpy: fullBody.sale_price_jpy,
        purchase_cost_jpy: fullBody.purchase_cost_jpy,
        domestic_shipping: fullBody.domestic_shipping,
        shipping_cost_usd: fullBody.shipping_cost_usd,
        shipping_cost_jpy: fullBody.shipping_cost_jpy,
      });
      const res = await fetch("/api/sku-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fullBody),
      });

      console.log("[handleSave] Response status:", res.status);
      let responseData: any;
      try {
        responseData = await res.json();
      } catch (parseErr) {
        console.error("[handleSave] JSON parse error:", parseErr);
        const text = await res.text();
        console.error("[handleSave] Response text:", text);
        throw new Error(`JSON解析失敗: ${text}`);
      }
      console.log("[handleSave] Response data:", responseData);

      if (!res.ok) {
        console.error("[handleSave] Save failed:", responseData);
        throw new Error(responseData?.error || "保存失敗");
      }
      
      // 🔥 CRITICAL FIX: State 更新を「マージ」にする
      const serverData = responseData?.data ?? responseData;
      setEditingItem((prev) => {
        if (!prev) return prev;
        const merged = { ...prev, ...serverData };
        // title は特に保護：サーバが返さない or 空なら prev を維持
        merged.title = (serverData?.title ?? "").trim() ? serverData.title : prev.title;
        console.log("[handleSave] State merged:", { prevTitle: prev.title, serverTitle: serverData?.title, finalTitle: merged.title });
        return merged;
      });
      
      setSaveBanner({ type: "success", message: "保存しました" });
      // ローカル下書きをクリア
      const draftKey = `sku-edit-draft-${id}`;
      const profitDraftKey = `sku-edit-profit-${id}`;
      try { window.localStorage.removeItem(draftKey); } catch {}
      try { window.localStorage.removeItem(profitDraftKey); } catch {}
      setHasUnsaved(false);
      // 1.5秒後に自動で一覧へ戻る
      setTimeout(() => {
        const from = searchParams?.get("from");
        if (from === "customize") {
          router.push("/sku/customize");
        } else {
          router.push("/sku/sku-manager");
        }
      }, 1500);
    } catch (err) {
      console.error("[handleSave] Error:", err);
      setSaveBanner({ type: "error", message: String(err) || "保存に失敗しました" });
    } finally {
      setSaving(false);
    }
  };

  // 下書き保存（必須項目チェックなし）
  const handleSaveDraft = async () => {
    if (!editingItem) return;
    // Condition validation
    if (!editingItem.sku_condition || editingItem.sku_condition === 'none') {
      alert('⚠️ 商品コンディションを選択してください');
      return;
    }
    setRequiredError(null);
    setSaving(true);
    try {
      console.log("[handleSaveDraft] Saving draft SKU:", editingItem.id, editingItem.sku);
      console.log("[handleSaveDraft] Title value:", editingItem.title, typeof editingItem.title);
      
      // 🔥 防御的な payload 構築：title は空でも必ず送信
      const payload: any = { id: editingItem.id };
      
      const titleValue = (editingItem?.title ?? "").trim();
      if (titleValue) {
        payload.title = titleValue;  // 空でなければ送信
      }
      
      // その他フィールド
      payload.status = "editing";
      payload.genre = editingItem.genre ?? null;
      payload.brand = editingItem.brand ?? null;
      payload.model = editingItem.model ?? null;
      payload.color = editingItem.color ?? null;
      payload.condition = editingItem.condition ?? null;
      payload.sku_condition = editingItem.sku_condition ?? null;
      payload.ebay_category_id = typeof editingItem.ebay_category_id === "number" ? editingItem.ebay_category_id : null;
      payload.ebay_category_path_snapshot = editingItem.ebay_category_path_snapshot ?? null;
      payload.title_optimized = editingItem.title_optimized ?? null;
      payload.description = editingItem.description ?? null;
      payload.item_specifics = editingItem.item_specifics ?? null;
      payload.notes = editingItem.notes ?? null;
      
      // 価格・利益・送料情報
      payload.sale_price_usd = typeof editingItem.sale_price_usd === "number" ? editingItem.sale_price_usd : null;
      payload.sale_price_jpy = typeof editingItem.sale_price_jpy === "number" ? editingItem.sale_price_jpy : null;
      payload.purchase_cost_jpy = typeof editingItem.purchase_cost_jpy === "number" ? editingItem.purchase_cost_jpy : null;
      payload.shipping_cost_usd = typeof editingItem.shipping_cost_usd === "number" ? editingItem.shipping_cost_usd : null;
      payload.shipping_cost_jpy = typeof editingItem.shipping_cost_jpy === "number" ? editingItem.shipping_cost_jpy : null;
      payload.exchange_rate = typeof editingItem.exchange_rate === "number" ? editingItem.exchange_rate : null;
      payload.profit_jpy = typeof editingItem.profit_jpy === "number" ? editingItem.profit_jpy : null;
      payload.profit_rate = typeof editingItem.profit_rate === "number" ? editingItem.profit_rate : null;
      payload.domestic_shipping = typeof editingItem.domestic_shipping === "number" ? editingItem.domestic_shipping : null;
      
      // 🔥 DEBUG: Payload の内容を確認
      console.log("🔥SAVE_DEBUG", {
        title: editingItem?.title,
        keys: Object.keys(payload),
        payload,
      });
      
      const res = await fetch("/api/sku-edit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-SAVE-DEBUG": "1",
        },
        body: JSON.stringify(payload),
      });
      console.log("[handleSaveDraft] Response status:", res.status);
      const responseData = await res.json();
      console.log("[handleSaveDraft] Response data:", responseData);
      
      if (!res.ok) {
        console.error("[handleSaveDraft] Save failed:", responseData);
        setSaveBanner({ type: "error", message: `❌ 保存失敗: ${responseData.error || "不明なエラー"}` });
        throw new Error(responseData.error || "保存失敗");
      }
      
      // 保存成功時のみ以下を実行
      console.log("[handleSaveDraft] Save successful, clearing draft");
      
      // 🔥 CRITICAL FIX: State 更新を「マージ」にする
      // サーバが完全なデータを返さない可能性に備える
      const serverData = responseData?.data ?? responseData;
      setEditingItem((prev) => {
        if (!prev) return prev;
        const merged = { ...prev, ...serverData };
        // title は特に保護：サーバが返さない or 空なら prev を維持
        merged.title = (serverData?.title ?? "").trim() ? serverData.title : prev.title;
        console.log("[handleSaveDraft] State merged:", { prevTitle: prev.title, serverTitle: serverData?.title, finalTitle: merged.title });
        return merged;
      });
      
      // ローカル下書きをクリア
      const draftKey = `sku-edit-draft-${id}`;
      try { 
        window.localStorage.removeItem(draftKey); 
        console.log("[handleSaveDraft] Draft cleared from localStorage");
      } catch (e) {
        console.warn("[handleSaveDraft] Failed to clear localStorage:", e);
      }
      
      setHasUnsaved(false);
      setSaveBanner({ type: "success", message: "✅ 保存されました。一覧に戻ります..." });
      
      // 1.5秒後に確実に遷移（その間に保存が完全に完了する）
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log("[handleSaveDraft] Navigating to sku-manager");
      router.push("/sku/sku-manager");
    } catch (err) {
      console.error("[handleSaveDraft] Error:", err);
      if (!((err as any)?.message?.includes("保存失敗"))) {
        setSaveBanner({ type: "error", message: "❌ 保存処理中にエラーが発生しました" });
      }
    } finally {
      setSaving(false);
    }
  };

  // AI説明文生成（二重実行防止 + リトライ対応）
  const handleGenerateDescription = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      // タイトル取得（複数フィールドから優先度付きで取得）
      const titleForAi =
        (editingItem?.title ?? "").trim() ||
        (editingItem?.titleOptimized ?? "").trim() ||
        (editingItem?.title_optimized ?? "").trim() ||
        (typeof document !== "undefined" ? (document.querySelector<HTMLInputElement>('[name="title"]')?.value ?? "").trim() : "") ||
        "";

      // タイトル必須チェック
      if (!titleForAi) {
        alert("商品名（または最適化タイトル）が空です。入力してください。");
        setIsGenerating(false);
        return;
      }

      const payload = {
        sku_id: editingItem?.id,
        sku: editingItem?.sku,
        title: titleForAi,
        brand: (editingItem?.brand ?? "").trim() || null,
        model: (editingItem?.model ?? "").trim() || null,
        color: (editingItem?.color ?? "").trim() || null,
        notes: (editingItem?.notes ?? "").trim() || null,
      };

      const res = await fetch("/api/ai-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData?.error || `HTTP ${res.status}: 説明文生成失敗`;
        throw new Error(errMsg);
      }

      const data = await res.json();
      setEditingItem({ ...editingItem!, description: data.description });
      
      // 成功時のフィードバック
      setSaveBanner({ type: "success", message: "✅ AI説明文を生成しました" });
      setTimeout(() => setSaveBanner(null), 3000);
    } catch (e: any) {
      console.error("[handleGenerateDescription] エラー:", e);
      const errMsg = e?.message || "説明文生成に失敗しました";
      alert(`❌ ${errMsg}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // 利益自動計算（見える化＆判定付き）
  // 旧ローカル計算は保持しつつ、保存時はcalcProfitLibを使用
  const calculateProfit = () => {
    const { channel, sellingPriceUSD, shippingCostUSD, ebayFeesPercent, promotedListingPercent, saleFeePercent, payoneerFeePercent, payoneerFixedUSD, exchangeRate } = profitCalc;

    const priceUSD = Number(sellingPriceUSD) || 0;
    const priceJPY = typeof editingItem?.sale_price_jpy === "number" ? editingItem.sale_price_jpy : 0;
    const hasPrice = priceUSD > 0 || priceJPY > 0;
    
    if (!hasPrice) {
      return {
        ready: false,
        message: "販売価格が未入力です",
        listingPriceJPY: 0,
        shippingCostJPY: 0,
        totalFeeJPY: 0,
        profitJPY: 0,
        profitRate: 0,
        status: "info" as const,
        statusLabel: "未計算",
      };
    }

    // 売上（JPY）= 販売価格 × 為替レート（USD優先、なければJPY値を使用）
    const listingPriceJPY = priceUSD > 0
      ? Math.round(priceUSD * exchangeRate)
      : priceJPY > 0
        ? Math.round(priceJPY)
        : 0;
    
    // 国際送料（JPY）= 送料USD × 為替レート（USD優先、なければ既存のJPYを使用）
    const shippingCostJPY = (Number(shippingCostUSD) || 0) > 0
      ? Math.round((Number(shippingCostUSD) || 0) * exchangeRate)
      : (typeof profitCalc.shippingCostJPY === "number" && profitCalc.shippingCostJPY > 0)
        ? Math.round(profitCalc.shippingCostJPY)
        : Math.round(editingItem?.shipping_cost_jpy || 0);

    // 手数料計算（eBayの場合のみ）
    let totalFeeJPY = 0;
    if (channel === "ebay") {
      // eBay手数料（販売価格に対して%）
      const ebayFeeJPY = Math.round(listingPriceJPY * (ebayFeesPercent / 100));
      
      // Promoted Listing手数料（販売価格に対して%）
      const promotedFeeJPY = Math.round(listingPriceJPY * (promotedListingPercent / 100));
      
      // セール手数料（販売価格に対して%）
      const saleFeeJPY = Math.round(listingPriceJPY * (saleFeePercent / 100));
      
      // Payoneer手数料（入金額全体に対して%）
      // 入金額 = 売上 - eBay関連手数料
      const depositAmount = listingPriceJPY - ebayFeeJPY - promotedFeeJPY - saleFeeJPY;
      const payoneerPercentFeeJPY = Math.round(depositAmount * (payoneerFeePercent / 100));
      
      // Payoneer固定手数料
      const payoneerFixedFeeJPY = Math.round(payoneerFixedUSD * exchangeRate);
      
      // 手数料合計
      totalFeeJPY = ebayFeeJPY + promotedFeeJPY + saleFeeJPY + payoneerPercentFeeJPY + payoneerFixedFeeJPY;
    }

    // コスト合計 = 原価 + 送料（国内→倉庫） + 送料（国際）
    const costJPY = editingItem?.purchase_cost_jpy || 0; // 仕入れ価格
    const domesticShippingJPY = editingItem?.domestic_shipping || 0; // 国内送料
    const totalCostJPY = costJPY + domesticShippingJPY + shippingCostJPY;
    
    // 利益 = 売上 - 手数料 - コスト
    const profitJPY = listingPriceJPY - totalFeeJPY - totalCostJPY;
    console.log('[calculateProfit] inputs', { priceUSD, exchangeRate, listingPriceJPY, shippingCostUSD, shippingCostJPY, costJPY, domesticShippingJPY, totalFeeJPY, profitJPY });
    
    // 利益率 = 利益 ÷ 売上 × 100
    const profitRate = listingPriceJPY > 0 ? (profitJPY / listingPriceJPY) * 100 : 0;

    // Condition-based profit threshold
    const minProfitRate = editingItem?.sku_condition ? getMinProfitRate(editingItem.sku_condition as Sku_condition) : 10;
    const conditionLabel = editingItem?.sku_condition ? getConditionLabel(editingItem.sku_condition as Sku_condition) : "";

    let status: "ok" | "warn" | "bad" = "ok";
    let statusLabel = `🟢 出品OK（利益率 ${profitRate.toFixed(1)}% / コンディション：${conditionLabel}）`;
    let rejectReason = "";
    
    if (profitJPY < 0) {
      status = "bad";
      statusLabel = `🔴 出品NG（赤字 / コンディション：${conditionLabel}）`;
      rejectReason = "赤字: 利益 ¥" + Math.round(profitJPY).toLocaleString("ja-JP");
    } else if (profitRate < minProfitRate) {
      status = "bad";
      statusLabel = `🔴 出品NG（利益率 ${profitRate.toFixed(1)}% / コンディション：${conditionLabel}）`;
      rejectReason = `利益率が低すぎる: ${profitRate.toFixed(1)}%（${conditionLabel}基準: ${minProfitRate}%以上）`;
    } else if (profitRate < 15) {
      status = "warn";
      statusLabel = `🟡 要注意（利益率 ${profitRate.toFixed(1)}% / コンディション：${conditionLabel}）`;
      rejectReason = "利益率が基準未満: " + profitRate.toFixed(1) + "%（推奨: 15%以上）";
    }

    return {
      ready: true,
      listingPriceJPY,
      shippingCostJPY,
      totalFeeJPY,
      profitJPY,
      profitRate,
      status,
      statusLabel,
      rejectReason,
      message: "",
    };
  };

  // 作業ナビゲーション情報を取得
  const getWorkStatus = () => {
    console.log('[getWorkStatus] Called with:', { editingItem: !!editingItem, imageInfo });
    if (!editingItem) return { required: [], recommended: [], completed: [] };
    
    const required: any[] = [];
    const recommended: any[] = [];
    const completed: any[] = [];
    
    // 画像チェック（大文字キー）
    const rawCount = imageInfo?.RAW ?? 0;
    const originalCount = imageInfo?.ORIGINAL ?? 0;
    const listingCount = imageInfo?.LISTING ?? 0;
    console.log('[getWorkStatus] Image counts:', { rawCount, originalCount, listingCount });
    
    if (rawCount === 0 || originalCount === 0 || listingCount === 0) {
      required.push({
        icon: "📸",
        label: `画像`,
        detail: `RAW(${rawCount}/3) ORIGINAL(${originalCount}/7) LISTING(${listingCount}/7)`,
        missing: true,
      });
    } else {
      completed.push({ icon: "📸", label: "画像", detail: `RAW(${rawCount}) ORIGINAL(${originalCount}) LISTING(${listingCount})` });
    }
    
    // 価格系チェック
    const hasCost = typeof editingItem.purchase_cost_jpy === "number" && editingItem.purchase_cost_jpy > 0;
    const hasDomesticShip = typeof editingItem.domestic_shipping === "number" && editingItem.domestic_shipping > 0;
    const hasPrice = (profitCalc.sellingPriceUSD || 0) > 0;
    const hasShip = (profitCalc.shippingCostUSD || 0) > 0;
    
    if (!hasCost || !hasPrice) {
      required.push({
        icon: "💰",
        label: "価格",
        detail: `原価:${hasCost ? "✓" : "✗"} 販売価格:${hasPrice ? "✓" : "✗"}`,
        missing: true,
      });
    } else {
      completed.push({ icon: "💰", label: "価格", detail: "原価・販売価格 OK" });
    }
    
    if (!hasDomesticShip || !hasShip) {
      recommended.push({
        icon: "📦",
        label: "送料",
        detail: `国内:${hasDomesticShip ? "✓" : "✗"} 国際:${hasShip ? "✓" : "✗"}`,
      });
    } else {
      completed.push({ icon: "📦", label: "送料", detail: "国内・国際 OK" });
    }
    
    // eBayメタデータ
    if (!editingItem.ebay_category_id || editingItem.ebay_category_id <= 0) {
      recommended.push({ icon: "📂", label: "eBayカテゴリ", detail: "未設定" });
    } else {
      completed.push({ icon: "📂", label: "eBayカテゴリ", detail: String(editingItem.ebay_category_id) });
    }
    
    if (!editingItem.title_optimized) {
      recommended.push({ icon: "✨", label: "最適化タイトル", detail: "未生成" });
    } else {
      completed.push({ icon: "✨", label: "最適化タイトル", detail: "生成済み" });
    }
    
    // 説明文チェック
    if (!editingItem.description) {
      recommended.push({ icon: "📝", label: "説明文（英語）", detail: "未入力" });
    } else {
      completed.push({ icon: "📝", label: "説明文（英語）", detail: "入力済み" });
    }
    
    const result = { required, recommended, completed };
    console.log('[getWorkStatus] Result:', result);
    return result;
  };

  // テンプレート適用
  const handleApplyTemplate = (templateKey: string) => {
    setSelectedTemplate(templateKey);
    // DESCRIPTION_TEMPLATES disabled - using simple template
    setEditingItem({ ...editingItem!, description: "<p>商品説明（HTML）をここに記入</p>" });
  };

  // ジャンルから推奨テンプレートを自動設定（API優先、失敗時ローカル）
  const handleAutoSelectTemplate = async () => {
    if (!editingItem) return;
    try {
      const res = await fetch("/api/choose-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          genre: editingItem.genre || "",
          brand: editingItem.brand || "",
          model: editingItem.model || "",
          condition: editingItem.condition || "",
          item_specifics: editingItem.item_specifics || {},
          notes: editingItem.notes || "",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const key = String(data.templateKey || "basic");
        handleApplyTemplate(key);
        setTemplateToast(`テンプレート「${key}」を適用しました`);
        setTimeout(() => setTemplateToast(null), 2000);
        return;
      }
      handleApplyTemplate("basic");
      setTemplateToast("テンプレートを適用しました");
      setTimeout(() => setTemplateToast(null), 2000);
    } catch (e) {
      handleApplyTemplate("basic");
      setTemplateToast("テンプレートを適用しました");
      setTimeout(() => setTemplateToast(null), 2000);
    } finally {
      setTemplateSelecting(false);
    }
  };

  // AI自動生成
  const handleAiGenerate = async () => {
    if (!editingItem) return;
    setAiGenerating(true);
    try {
      // notes や既存フィールドを織り込んだプロンプトを生成
      const attributes: string[] = [
        editingItem.brand || "",
        editingItem.model || "",
        editingItem.color || "",
        editingItem.condition || "",
        editingItem.genre || "",
      ].filter((v) => v && v.trim().length > 0);
      const prompt = `
あなたはプロのeBay SEOライターです。以下の情報をもとに、検索に強く80文字以内の商品タイトルを英語で作成してください。
・SKU: ${editingItem.sku}
・重要属性/キーワード: ${attributes.join(", ")}
・ユーザー補足情報: ${editingItem.notes || "(なし)"}

要件:
・最重要語を左へ配置（メーカー/型番/モデル名）
・重複や不要語は削除し簡潔に
・カラーと状態は簡潔に（例: Black, Excellent）
・販促語（Free Shipping, Japan Importなど）は使用しない
・半角英数で自然な大文字/小文字を使用
      `.trim();

      const res = await fetch("/api/generate-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          current: editingItem.title || "",
          sku: editingItem.sku,
          brand: editingItem.brand || "",
          model: editingItem.model || "",
          color: editingItem.color || "",
          condition: editingItem.condition || "",
          genre: editingItem.genre || "",
          notes: editingItem.notes || "",
          keywords: Object.values(editingItem.item_specifics || {}).slice(0, 10),
        }),
      });
      if (!res.ok) throw new Error("AI生成失敗");
      const data = await res.json();
      console.log("[handleAiGenerate] Response:", data);
      // 空でない場合のみ更新
      if (data.title && data.title.trim().length > 0) {
        setEditingItem({ ...editingItem, title: data.title });
        alert("✅ 商品名を生成しました: " + data.title);
      } else {
        alert("⚠️ AIが商品名を生成できませんでした。既存の商品名を維持します。");
      }
    } catch (err) {
      console.error(err);
      alert("AI生成に失敗しました。既存の商品名を維持します。");
    } finally {
      setAiGenerating(false);
    }
  };

  // eBay用最適化タイトル（AI）
  const handleOptimizeTitle = async () => {
    if (!editingItem) return;
    setAiGenerating(true);
    try {
      const res = await fetch("/api/ai-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current: editingItem.title || "",
          sku: editingItem.sku,
          // Gemini抽出結果も一緒に渡して理解度とSEOを強化
          brand: editingItem.brand || "",
          model: editingItem.model || "",
          color: editingItem.color || "",
          condition: editingItem.condition || "",
          genre: editingItem.genre || "",
          keywords: Object.values(editingItem.item_specifics || {}).slice(0, 10),
        }),
      });
      if (!res.ok) throw new Error("タイトル最適化失敗");
      const data = await res.json();
      setEditingItem({ ...editingItem, title_optimized: data.title || "" });
    } catch (err) {
      console.error(err);
      alert("タイトル最適化に失敗しました");
    } finally {
      setAiGenerating(false);
    }
  };

  // AI商品情報抽出
  const handleExtractInfo = async () => {
    if (!editingItem) return;
    setAutoExtracting(true);
    setExtractionError(null);
    try {
      const listingUrls: string[] = (imageInfo?.listing || []).map((x: any) => x.url).filter(Boolean);
      const originalUrls: string[] = (imageInfo?.original || []).map((x: any) => x.url).filter(Boolean);
      const imageUrls = listingUrls.length > 0 ? listingUrls : originalUrls;

      const res = await fetch("/api/ai-product-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: editingItem.sku,
          imageUrls,
          notes: editingItem.notes || "",
          genre: editingItem.genre || "",
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "抽出失敗");
      }
      const data = await res.json();

      const nextItem = {
        ...editingItem,
        brand: data.brand ?? editingItem.brand,
        model: data.model ?? editingItem.model,
        color: data.color ?? editingItem.color,
        condition: data.condition ?? editingItem.condition,
        ebay_category_id: typeof data.ebay_category_id === "number" ? data.ebay_category_id : editingItem.ebay_category_id,
        ebay_category_path_snapshot: data.ebay_category_path_snapshot ?? editingItem.ebay_category_path_snapshot,
        title_optimized: data.titleSuggestion ?? editingItem.title_optimized,
        description: data.description ?? editingItem.description,
        item_specifics: data.item_specifics ?? editingItem.item_specifics,
      };
      setEditingItem(nextItem);
      setItem_specificsDraft(nextItem.item_specifics || {});
      // 自動保存（任意）：抽出結果を Supabase に反映
      try {
        await fetch("/api/sku-edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: nextItem.id,
            title: nextItem.title ?? null,  // 🔥 重要: title を保持（上書き防止）
            brand: nextItem.brand,
            model: nextItem.model,
            color: nextItem.color,
            condition: nextItem.condition,
            ebay_category_id: typeof nextItem.ebay_category_id === "number" ? nextItem.ebay_category_id : null,
            ebay_category_path_snapshot: nextItem.ebay_category_path_snapshot ?? null,
            title_optimized: nextItem.title_optimized,
            description: nextItem.description,
            item_specifics: nextItem.item_specifics,
          }),
        });
      } catch (e) {
        console.warn("自動保存に失敗しました", e);
      }
    } catch (err: any) {
      console.error(err);
      setExtractionError(err.message || "抽出に失敗しました");
    } finally {
      setAutoExtracting(false);
    }
  };

  // AI で説明文を自動生成（テンプレ + プレースホルダ埋め込み）
  const handleGenerateDescription = async () => {
    if (!editingItem) return;
    
    // タイトルは必須
    if (!editingItem.title || editingItem.title.trim().length === 0) {
      alert("タイトルを入力してください");
      return;
    }
    
    setAiGenerating(true);
    try {
      const res = await fetch("/api/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          genre: editingItem.genre && editingItem.genre.trim().length > 0 ? editingItem.genre : "basic",
          title: editingItem.title,
          brand: editingItem.brand || "",
          model: editingItem.model || "",
          color: editingItem.color || "",
          size: editingItem.item_specifics?.["Size"] || "",
          condition: editingItem.condition || "",
          included_items: editingItem.item_specifics?.["Included Items"] || "",
          notes: editingItem.notes || "",
          features: editingItem.item_specifics?.["Features"] || "",
          sku: editingItem.sku,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "説明文生成失敗");
      }
      const data = await res.json();
      setEditingItem({ ...editingItem, description: data.description });
      alert("説明文を生成しました！");
    } catch (err: any) {
      console.error(err);
      const errorMsg = err.message || "";
      if (errorMsg.includes("quota") || errorMsg.includes("429")) {
        alert("OpenAI API の quota が超過しています。\n\n👉 https://platform.openai.com/account/billing/overview\n\nで quota を確認し、billing を更新してください。\n\n代替案: テンプレを手動で選択して、説明文を直接編集することもできます。");
      } else {
        alert("説明文の生成に失敗しました: " + errorMsg);
      }
    } finally {
      setAiGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="text-xl">読み込み中...</div>
      </div>
    );
  }

  if (!editingItem) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="text-xl">データが見つかりません</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* ===== 未保存警告モーダル ===== */}
      {showUnsavedModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-6 max-w-sm border border-yellow-600">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <span className="text-yellow-400">⚠️</span> 未保存の変更があります
            </h2>
            <p className="text-sm text-slate-300 mb-4">
              編集内容を保存してから戻りますか？
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowUnsavedModal(false);
                  setHasUnsaved(false);
                  if (pendingNavigation) {
                    pendingNavigation();
                    setPendingNavigation(null);
                  }
                }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded font-medium"
              >
                保存せず戻る
              </button>
              <button
                onClick={() => {
                  setShowUnsavedModal(false);
                  handleSave();
                }}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded font-medium"
              >
                保存して戻る
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Sticky作業ナビゲーション（ページ上部固定） ===== */}
      {(() => {
        const { required, recommended, completed } = getWorkStatus();
        const anyRequired = required.length > 0;
        const anyRecommended = recommended.length > 0;
        console.log('[Sticky Nav] Rendering with:', { requiredCount: required.length, recommendedCount: recommended.length, completedCount: completed.length });
        
        return (
          <div className={`sticky top-0 z-40 backdrop-blur-sm border-b border-slate-700 transition-colors ${
            anyRequired ? "bg-red-900/30" : anyRecommended ? "bg-amber-900/30" : "bg-emerald-900/30"
          }`}>
            <div className="max-w-7xl mx-auto px-8 py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                {/* 必須項目 */}
                {required.length > 0 && (
                  <div>
                    <div className="font-bold text-red-300 mb-2 flex items-center gap-1">
                      🔴 必須未完了 ({required.length})
                    </div>
                    <div className="space-y-1">
                      {required.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            // アクションに応じてタブジャンプ
                            if (item.icon === "📸") setActiveTab("images");
                            else if (item.icon === "💰" || item.icon === "📦") setActiveTab("price");
                            else if (item.icon === "📂" || item.icon === "✨" || item.icon === "📝") setActiveTab("ebay");
                            else setActiveTab("info");
                          }}
                          className="text-xs text-red-200 hover:text-red-100 hover:underline cursor-pointer text-left w-full"
                        >
                          {item.icon} {item.label}: {item.detail}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* 推奨項目 */}
                {anyRecommended && (
                  <div>
                    <div className="font-bold text-amber-300 mb-2 flex items-center gap-1">
                      🟡 推奨 ({recommended.length})
                    </div>
                    <div className="space-y-1">
                      {recommended.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            // アクションに応じてタブジャンプ
                            if (item.icon === "📦") setActiveTab("price");
                            else if (item.icon === "📂" || item.icon === "✨" || item.icon === "📝") setActiveTab("ebay");
                            else setActiveTab("info");
                          }}
                          className="text-xs text-amber-200 hover:text-amber-100 hover:underline cursor-pointer text-left w-full"
                        >
                          {item.icon} {item.label}: {item.detail}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* 完了項目 */}
                {completed.length > 0 && (
                  <div>
                    <div className="font-bold text-emerald-300 mb-2 flex items-center gap-1">
                      ✅ 完了 ({completed.length})
                    </div>
                    <div className="space-y-1 max-h-16 overflow-y-auto">
                      {completed.map((item, idx) => (
                        <div key={idx} className="text-xs text-emerald-200 truncate">
                          {item.icon} {item.label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ===== タブナビゲーション + 編集対象サマリー ===== */}
      <div className="sticky top-16 z-30 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-8">
          {/* タブボタン */}
          <div className="flex gap-2 py-3">
            <button
              onClick={() => setActiveTab("images")}
              className={`px-4 py-2 rounded-t font-medium transition ${
                activeTab === "images"
                  ? "bg-slate-700 text-white border-b-2 border-blue-500"
                  : "bg-slate-800/50 text-slate-400 hover:text-slate-200"
              }`}
            >
              📸 画像
            </button>
            <button
              onClick={() => setActiveTab("price")}
              className={`px-4 py-2 rounded-t font-medium transition ${
                activeTab === "price"
                  ? "bg-slate-700 text-white border-b-2 border-blue-500"
                  : "bg-slate-800/50 text-slate-400 hover:text-slate-200"
              }`}
            >
              💰 価格・利益
            </button>
            <button
              onClick={() => setActiveTab("ebay")}
              className={`px-4 py-2 rounded-t font-medium transition ${
                activeTab === "ebay"
                  ? "bg-slate-700 text-white border-b-2 border-blue-500"
                  : "bg-slate-800/50 text-slate-400 hover:text-slate-200"
              }`}
            >
              🛒 eBay
            </button>
            <button
              onClick={() => setActiveTab("info")}
              className={`px-4 py-2 rounded-t font-medium transition ${
                activeTab === "info"
                  ? "bg-slate-700 text-white border-b-2 border-blue-500"
                  : "bg-slate-800/50 text-slate-400 hover:text-slate-200"
              }`}
            >
              📝 商品情報
            </button>
          </div>

          {/* 編集対象サマリー（タブ直下） */}
          <div className="mb-2 rounded-lg bg-slate-800/80 border border-slate-700 px-4 py-2 text-sm flex items-center gap-4">
            {editingItem ? (
              <>
                <span className="text-slate-400">編集対象:</span>
                <span className="px-2 py-1 rounded bg-slate-900 border border-slate-600 font-mono text-blue-300 text-base">{editingItem.sku}</span>
                <span className="text-slate-300">商品名: <span className="text-slate-400">{editingItem.title || "（未入力）"}</span></span>
                {(() => {
                  const requiredKeys = ["Brand", "Model", "Color"] as const;
                  const specs = editingItem.item_specifics || {};
                  const missing = requiredKeys.filter((k) => !specs[k] || specs[k].trim().length === 0);
                  if (missing.length > 0) {
                    return <span className="text-red-400 font-semibold">状態: 要対応 🔴</span>;
                  }
                  return <span className="text-emerald-300">状態: OK ✅</span>;
                })()}
              </>
            ) : (
              <span className="text-slate-500">読み込み中...</span>
            )}
          </div>
        </div>
      </div>

      {/* ===== メインコンテンツ ===== */}
      <div className="p-8">
        {/* ヘッダー */}
        <div className="max-w-7xl mx-auto mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (hasUnsaved) {
                    setShowUnsavedModal(true);
                    setPendingNavigation(() => () => {
                      const from = searchParams?.get("from");
                      if (from === "customize") {
                        router.push("/sku/customize");
                      } else {
                        router.push("/sku/sku-manager");
                      }
                    });
                  } else {
                    const from = searchParams?.get("from");
                    if (from === "customize") {
                      router.push("/sku/customize");
                    } else {
                      router.push("/sku/sku-manager");
                    }
                  }
                }}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded transition font-medium"
              >
                ← 戻る
              </button>
              <h1 className="text-3xl font-bold">SKU編集</h1>
        {/* 編集状態バッジ */}
        {(() => {
          const requiredKeys = ["Brand", "Model", "Color"] as const;
          const specs = editingItem.item_specifics || {};
          const missing = requiredKeys.filter((k) => !specs[k] || specs[k].trim().length === 0);
          const isDraft = missing.length > 0;
          return (
            <span
              className={`px-3 py-1 rounded text-sm font-medium border ${
                isDraft
                  ? "bg-yellow-900/40 border-yellow-600 text-yellow-200"
                  : "bg-emerald-900/40 border-emerald-600 text-emerald-200"
              }`}
              title={
                isDraft
                  ? `下書き中（未入力: ${missing.join(", ")}）`
                  : "編集中（必須項目は充足）"
              }
            >
              {isDraft ? "🗂 下書き中" : "✍️ 編集中"}
            </span>
          );
        })()}
        {hasUnsaved && <span className="ml-2 px-2 py-1 rounded bg-blue-900/40 border border-blue-600 text-blue-200 text-xs">💾 未保存</span>}
        </div>
        </div>

        {/* 快速ナビゲーション（他のページへ） */}
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/sku/sku-manager")}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded transition text-sm"
          >
            📋 SKU管理へ
          </button>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded transition text-sm"
          >
            🏠 ホーム
          </button>
        </div>
      </div>

      {/* 編集フォーム */}
      <div className="max-w-4xl mx-auto bg-slate-800/50 backdrop-blur-sm rounded-lg p-8 shadow-2xl border border-slate-700">
        {/* 保存バナー */}
        {saveBanner && (
          <div className={`mb-6 p-4 rounded border flex items-center justify-between ${
            saveBanner.type === "success" 
              ? "bg-emerald-900/40 border-emerald-600 text-emerald-200"
              : saveBanner.type === "warning"
              ? "bg-amber-900/40 border-amber-600 text-amber-200"
              : "bg-red-900/40 border-red-600 text-red-200"
          }`}>
            <span>{saveBanner.message}</span>
            <button onClick={() => setSaveBanner(null)} className="text-sm opacity-60 hover:opacity-100">✕</button>
          </div>
        )}

        {/* ===== タブ: 画像 ===== */}
        {activeTab === "images" && (
          <ImageClassifier sku={editingItem.sku} />
        )}

        {/* ===== タブ: 価格・利益・eBay・商品情報の本実装は以下のフォーム群に統合済み ===== */}
        <div className="mb-6">
          <label htmlFor="sku" className="block text-sm font-medium mb-2">SKU</label>
          <input
            id="sku"
            name="sku"
            type="text"
            value={editingItem.sku}
            disabled
            className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded text-white"
          />
        </div>

        {/* 商品名 */}
        <div className="mb-6">
          <label htmlFor="title" className="block text-sm font-medium mb-2">
            商品名 <span className="text-gray-400">{(editingItem.title || "").length} / 80</span>
          </label>
          <textarea
            id="title"
            name="title"
            value={editingItem.title || ""}
            onChange={(e) =>
              setEditingItem({ ...editingItem, title: e.target.value })
            }
            className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded text-white h-24 resize-none"
            maxLength={80}
          />
          {(editingItem.title || "").length > 80 && (
            <div className="mt-1 text-red-400 text-sm">80文字を超えています</div>
          )}
        </div>

        {/* AIボタン（分割） */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={handleAiGenerate}
            disabled={aiGenerating}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded disabled:opacity-50"
          >
            📝 商品名 AI生成
          </button>
          <button
            onClick={handleOptimizeTitle}
            disabled={aiGenerating}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded disabled:opacity-50"
          >
            ✨ eBay用タイトル最適化
          </button>
          <button
            onClick={handleExtractInfo}
            disabled={autoExtracting}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
          >
            🧩 eBay商品説明 AI生成（HTML）
          </button>
        </div>

        {/* ユーザー補足情報 */}
        <div className="mb-6 p-4 bg-slate-700/20 rounded border border-slate-600">
          <label htmlFor="notes" className="block text-sm font-medium mb-2">
            📝 ユーザー補足情報
            <span className="text-xs text-slate-400 ml-2">（AI生成の参考情報）</span>
          </label>
          <textarea
            id="notes"
            name="notes"
            value={editingItem.notes || ""}
            onChange={(e) =>
              setEditingItem({ ...editingItem, notes: e.target.value })
            }
            placeholder="例：商品の特徴、状態、出身地、希少性など、AI生成に参考となる情報を入力してください"
            className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded text-white h-20 resize-none text-sm"
          />
        </div>

        {/* 商品コンディション（必須） */}
        <div className="mb-6 p-4 bg-amber-900/20 rounded border border-amber-700/50">
          <label htmlFor="sku_condition" className="block text-sm font-medium mb-1 flex items-center gap-2">
            <span>商品コンディション（必須）</span>
            <span className="text-xs text-amber-300">※ 出品可否・利益判定に影響します</span>
          </label>
          <select
            id="sku_condition"
            name="sku_condition"
            value={editingItem.sku_condition || ''}
            onChange={(e) => setEditingItem({ ...editingItem, sku_condition: (e.target.value === '' ? null : e.target.value) as Sku_condition })}
            className={`w-full px-4 py-2 rounded text-white text-sm font-medium ${
              !editingItem.sku_condition || editingItem.sku_condition === 'none'
                ? 'bg-red-900/50 border-2 border-red-600'
                : 'bg-slate-700/50 border border-slate-600'
            }`}
          >
            <option value="" className="bg-slate-800">⚠️ 選択してください（保存不可）</option>
            {CONDITION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-slate-800">
                {opt.label}
              </option>
            ))}
          </select>
          {(!editingItem.sku_condition || editingItem.sku_condition === 'none') && (
            <div className="mt-2 text-xs text-red-300">
              ⚠️ コンディションを選択しないと保存できません
            </div>
          )}
        </div>

        {/* 利益自動計算モジュール */}
        <div className="mb-6 p-4 bg-green-900/30 rounded border border-green-700">
          <div className="font-semibold text-lg mb-2">💰 eBay想定利益（売却前）</div>
          <div className="text-xs text-slate-300 mb-4 p-2 bg-green-900/20 rounded">
            💡 <strong>想定利益</strong>：売る前の判断材料 | 保存ボタンで数値を凍結 → 後で実績と比較可能
          </div>

          {/* 販売チャネル選択 */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">販売チャネル</label>
            <div className="flex gap-2">
              {(["ebay", "domestic", "other"] as const).map((ch) => (
                <button
                  key={ch}
                  onClick={() => setProfitCalc({ ...profitCalc, channel: ch })}
                  className={`px-3 py-1 rounded text-sm font-medium transition ${
                    profitCalc.channel === ch
                      ? "bg-blue-600 text-white"
                      : "bg-slate-700/50 border border-slate-600 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {ch === "ebay" ? "eBay" : ch === "domestic" ? "国内" : "その他"}
                </button>
              ))}
            </div>
          </div>

          {/* ステータス表示 */}
          {(() => {
            const result = calculateProfit();
            const fmt = (v: number) => `¥${Math.round(v).toLocaleString("ja-JP")}`;
            // 保存済みスナップショット（DB）の値を優先して表示
            const savedProfitJPY = typeof editingItem?.profit_jpy === "number" ? editingItem!.profit_jpy : null;
            const savedProfitRate = typeof editingItem?.profit_rate === "number" ? editingItem!.profit_rate : null;
            const displayProfitJPY = savedProfitJPY ?? result.profitJPY;
            const displayProfitRate = savedProfitRate ?? result.profitRate;
            const displayReady = result.ready || (savedProfitJPY !== null && savedProfitRate !== null);

            // 計算が未準備でも保存済み値があれば色判定をそちらで実施
            let effectiveStatus = result.status;
            if (!result.ready && savedProfitRate !== null) {
              const minRate = editingItem?.sku_condition ? getMinProfitRate(editingItem.sku_condition as Sku_condition) : 10;
              if ((savedProfitJPY ?? 0) < 0) {
                effectiveStatus = "bad";
              } else if ((savedProfitRate ?? 0) < minRate) {
                effectiveStatus = "bad";
              } else if ((savedProfitRate ?? 0) < 15) {
                effectiveStatus = "warn";
              } else {
                effectiveStatus = "ok";
              }
            }

            return (
              <div className="flex flex-col gap-2 mb-4">
                <div
                  className={`inline-flex items-center justify-between px-3 py-2 rounded text-sm font-semibold w-full md:w-fit ${
                    effectiveStatus === "bad"
                      ? "bg-red-900/60 text-red-100 border border-red-600/70"
                      : effectiveStatus === "warn"
                      ? "bg-amber-900/50 text-amber-100 border border-amber-600/60"
                      : "bg-emerald-900/50 text-emerald-100 border border-emerald-600/60"
                  }`}
                >
                  <span>{result.statusLabel}</span>
                  {displayReady && (
                    <span className="ml-3 text-xs font-normal text-slate-200/80">
                      利益 {fmt(displayProfitJPY)} / 利益率 {Number(displayProfitRate).toFixed(1)}%
                    </span>
                  )}
                </div>
                {!displayReady && (
                  <div className="text-sm text-slate-200">{result.message}</div>
                )}
                {displayReady && effectiveStatus !== "ok" && result.rejectReason && (
                  <div className="text-xs text-amber-200">{result.rejectReason}</div>
                )}
              </div>
            );
          })()}

          {/* ■ 想定売価・送料 */}
          <div className="mb-4 p-3 bg-slate-700/20 rounded border border-slate-600">
            <div className="font-medium text-sm mb-3 text-slate-300">■ 想定売価・送料</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* 仕入れ価格（JPY） */}
              <div>
                <label className="block text-sm font-medium mb-1">仕入れ価格（JPY） *必須</label>
                <input
                  type="number"
                  step="1"
                  value={editingItem.purchase_cost_jpy || ""}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, purchase_cost_jpy: e.target.value ? parseFloat(e.target.value) : null })
                  }
                  placeholder="例: 21200"
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-white text-sm"
                />
              </div>

              {/* 国内送料（JPY） */}
              <div>
                <label className="block text-sm font-medium mb-1">国内送料（JPY）</label>
                <input
                  type="number"
                  step="1"
                  value={editingItem.domestic_shipping || ""}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, domestic_shipping: e.target.value ? parseFloat(e.target.value) : null })
                  }
                  placeholder="例: 5250"
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-white text-sm"
                />
              </div>

              {/* 想定販売価格（USD） */}
              <div>
                <label className="block text-sm font-medium mb-1">想定販売価格（USD） *必須</label>
                <input
                  type="number"
                  step="0.01"
                  value={profitCalc.sellingPriceUSD || ""}
                  onChange={(e) =>
                    setProfitCalc({ ...profitCalc, sellingPriceUSD: e.target.value ? parseFloat(e.target.value) : null })
                  }
                  placeholder="例: 99.99"
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-white text-sm"
                />
              </div>

              {/* 想定販売価格（JPY） - 自動計算 */}
              <div>
                <label className="block text-sm font-medium mb-1">想定販売価格（JPY） 自動計算</label>
                <div className="px-3 py-2 bg-slate-600/30 border border-slate-600 rounded text-white text-sm font-semibold">
                  {profitCalc.sellingPriceUSD ? `¥${Math.round(profitCalc.sellingPriceUSD * profitCalc.exchangeRate).toLocaleString("ja-JP")}` : "—"}
                </div>
              </div>

              {/* 想定送料（USD） */}
              <div>
                <label className="block text-sm font-medium mb-1">想定送料（USD） デフォルト35</label>
                <input
                  type="number"
                  step="0.1"
                  value={profitCalc.shippingCostUSD}
                  onChange={(e) =>
                    setProfitCalc({ ...profitCalc, shippingCostUSD: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-white text-sm"
                />
              </div>

              {/* 想定送料（JPY） - 自動計算 */}
              <div>
                <label className="block text-sm font-medium mb-1">想定送料（JPY） 自動計算</label>
                <div className="px-3 py-2 bg-slate-600/30 border border-slate-600 rounded text-white text-sm font-semibold">
                  ¥{Math.round(profitCalc.shippingCostUSD * profitCalc.exchangeRate).toLocaleString("ja-JP")}
                </div>
              </div>
            </div>
          </div>

          {/* ■ eBayコスト設定（eBayのみ表示） */}
          {profitCalc.channel === "ebay" && (
            <details className="mb-4 p-3 bg-slate-700/20 rounded border border-slate-600">
              <summary className="cursor-pointer font-medium text-sm text-slate-300 hover:text-slate-100 select-none">
                ■ eBayコスト設定（通常は触らない）
              </summary>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 為替レート */}
                <div>
                  <label className="block text-sm font-medium mb-1">為替レート（USD→JPY）</label>
                  <input
                    type="number"
                    step="0.1"
                    value={profitCalc.exchangeRate}
                    onChange={(e) =>
                      setProfitCalc({ ...profitCalc, exchangeRate: parseFloat(e.target.value) || 150 })
                    }
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-white text-sm"
                  />
                </div>

                {/* eBay手数料（%） */}
                <div>
                  <label className="block text-sm font-medium mb-1">eBay手数料（%） デフォルト12.9</label>
                  <input
                    type="number"
                    step="0.1"
                    value={profitCalc.ebayFeesPercent}
                    onChange={(e) =>
                      setProfitCalc({ ...profitCalc, ebayFeesPercent: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-white text-sm"
                  />
                </div>

                {/* Promoted Listing（%） */}
                <div>
                  <label className="block text-sm font-medium mb-1">Promoted Listing（%） デフォルト0</label>
                  <input
                    type="number"
                    step="0.1"
                    value={profitCalc.promotedListingPercent}
                    onChange={(e) =>
                      setProfitCalc({ ...profitCalc, promotedListingPercent: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-white text-sm"
                  />
                </div>

                {/* 海外決済手数料（%） */}
                <div>
                  <label className="block text-sm font-medium mb-1">海外決済手数料（%） デフォルト1.35</label>
                  <input
                    type="number"
                    step="0.01"
                    value={profitCalc.saleFeePercent}
                    onChange={(e) =>
                      setProfitCalc({ ...profitCalc, saleFeePercent: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-white text-sm"
                  />
                </div>

                {/* Payoneer手数料（%） */}
                <div>
                  <label className="block text-sm font-medium mb-1">Payoneer手数料（%） デフォルト2.0</label>
                  <input
                    type="number"
                    step="0.01"
                    value={profitCalc.payoneerFeePercent}
                    onChange={(e) =>
                      setProfitCalc({ ...profitCalc, payoneerFeePercent: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-white text-sm"
                  />
                </div>

                {/* Payoneer固定手数料（USD） */}
                <div>
                  <label className="block text-sm font-medium mb-1">Payoneer固定手数料（USD） デフォルト0.4</label>
                  <input
                    type="number"
                    step="0.01"
                    value={profitCalc.payoneerFixedUSD}
                    onChange={(e) =>
                      setProfitCalc({ ...profitCalc, payoneerFixedUSD: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-white text-sm"
                  />
                </div>
              </div>
            </details>
          )}

          {/* 利益計算結果の詳細表示 */}
          {(() => {
            const result = calculateProfit();
            const fmt = (v: number) => `¥${Math.round(v).toLocaleString("ja-JP")}`;
            // 保存済みがあればそれを優先して詳細表示
            const savedProfitJPY = typeof editingItem?.profit_jpy === "number" ? editingItem!.profit_jpy : null;
            const savedProfitRate = typeof editingItem?.profit_rate === "number" ? editingItem!.profit_rate : null;
            const displayReady = result.ready || (savedProfitJPY !== null && savedProfitRate !== null);
            const displayProfitJPY = savedProfitJPY ?? result.profitJPY;
            const displayProfitRate = savedProfitRate ?? result.profitRate;
            if (!displayReady) {
              return null;
            }
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-black/40 rounded border border-green-600 text-sm mb-4">
                <div className="space-y-1">
                  <div className="text-xs text-slate-400 font-medium mb-2">📝 収入</div>
                  <div className="flex items-center justify-between"><span className="text-slate-300">💱 想定販売価格（JPY）</span><span className="font-semibold">{fmt(result.listingPriceJPY)}</span></div>
                  <div className="text-xs text-slate-400 font-medium mb-2 mt-3">💸 支出</div>
                  <div className="flex items-center justify-between"><span className="text-slate-300">🏷️ 仕入れ価格</span><span className="font-semibold">{fmt(editingItem?.purchase_cost_jpy || 0)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-slate-300">📦 国内送料</span><span className="font-semibold">{fmt(editingItem?.domestic_shipping || 0)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-slate-300">🚚 国際送料</span><span className="font-semibold">{fmt(result.shippingCostJPY)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-slate-300">💳 手数料合計</span><span className="font-semibold text-orange-300">{fmt(result.totalFeeJPY)}</span></div>
                </div>
                <div className="space-y-1 border-t md:border-t-0 md:border-l border-slate-700 pt-3 md:pt-0 md:pl-3">
                  <div className="text-xs text-slate-400 font-medium mb-2">💰 利益</div>
                  <div className="flex items-center justify-between"><span className="text-slate-300">想定純利益</span><span className="font-bold text-emerald-300">{fmt(displayProfitJPY)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-slate-300">想定利益率</span><span className="font-semibold">{Number(displayProfitRate).toFixed(1)}%</span></div>
                </div>
              </div>
            );
          })()}

          {/* スナップショット保存ボタン */}
          {(() => {
            const result = calculateProfit();
            if (!result.ready) return null;
            return (
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    if (!editingItem) return;
                    const body = {
                      id: editingItem.id,
                      // snapshot fields (snake_case to match DB columns)
                      channel: profitCalc.channel,
                      sale_price_usd: profitCalc.sellingPriceUSD || 0,
                      sale_price_jpy: Math.round(profitCalc.sellingPriceUSD! * profitCalc.exchangeRate),
                      shipping_cost_usd: profitCalc.shippingCostUSD,
                      shipping_cost_jpy: Math.round(profitCalc.shippingCostUSD * profitCalc.exchangeRate),
                      ebay_fee_percent: profitCalc.ebayFeesPercent,
                      promoted_listing_percent: profitCalc.promotedListingPercent,
                      sale_fee_percent: profitCalc.saleFeePercent,
                      payoneer_fee_percent: profitCalc.payoneerFeePercent,
                      payoneer_fixed_usd: profitCalc.payoneerFixedUSD,
                      exchange_rate: profitCalc.exchangeRate,
                      total_fee_jpy: Math.round(result.totalFeeJPY),
                      profit_jpy: Math.round(result.profitJPY),
                      profit_rate: Number(result.profitRate.toFixed(2)),
                      is_profitable: result.profitJPY > 0 && result.profitRate >= 15,
                      // procurement info fields
                      supplier_name: editingItem.supplier_name || null,
                      procurement_date: editingItem.procurement_date || null,
                      procurement_method: editingItem.procurement_method || null,
                      procurement_cost_jpy: editingItem.procurement_cost_jpy || null,
                      receipt_exists: editingItem.receipt_exists || false,
                      procurement_notes: editingItem.procurement_notes || null,
                      purchase_cost_jpy: profitCalc.costPriceJPY ?? null,
                    };
                    try {
                      const res = await fetch('/api/sku-edit', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)});
                      const data = await res.json();
                      if (!res.ok) {
                        console.error('save snapshot error', data);
                        alert(data.error || '保存に失敗しました');
                        return;
                      }
                      alert('✅ 想定利益スナップショットを保存しました');
                      // 保存後にページをリロードしてDB反映を確認
                      setTimeout(() => {
                        window.location.reload();
                      }, 500);
                    } catch (e) {
                      console.error('save snapshot error', e);
                      alert('保存に失敗しました');
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium"
                >
                  💾 想定利益スナップショットを保存
                </button>
                <span className="text-xs text-slate-400">この時点での売価・送料・手数料・為替を固定</span>
              </div>
            );
          })()}
        </div>

        {/* ============ 仕入情報セクション（記録用・利益計算に影響しない） ============ */}
        <div className="mb-6 p-4 bg-slate-700/30 rounded border border-slate-600">
          <div className="font-bold text-base mb-4 flex items-center gap-2">
            📦 仕入情報
            <span className="text-xs font-normal text-slate-400">（購入経緯の記録用・利益計算には影響しません）</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 仕入先名 */}
            <div>
              <label className="block text-sm font-medium mb-1">仕入先名</label>
              <input
                type="text"
                value={editingItem.supplier_name || ""}
                onChange={(e) => setEditingItem({ ...editingItem, supplier_name: e.target.value })}
                placeholder="例：ゲオ渋谷店、メルカリ（user123）"
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-white text-sm"
              />
            </div>

            {/* 仕入日 */}
            <div>
              <label className="block text-sm font-medium mb-1">仕入日</label>
              <input
                type="date"
                value={editingItem.procurement_date || ""}
                onChange={(e) => setEditingItem({ ...editingItem, procurement_date: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-white text-sm"
              />
            </div>

            {/* 仕入方法 */}
            <div>
              <label className="block text-sm font-medium mb-1">仕入方法</label>
              <select
                value={editingItem.procurement_method || ""}
                onChange={(e) => setEditingItem({ ...editingItem, procurement_method: e.target.value || null })}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-white text-sm"
              >
                <option value="">選択してください</option>
                <option value="店舗">店舗</option>
                <option value="オークション">オークション（ヤフオク）</option>
                <option value="メルカリ">メルカリ</option>
                <option value="Amazon">Amazon</option>
                <option value="卸売り">卸売り</option>
                <option value="その他">その他</option>
              </select>
            </div>

            {/* 仕入価格（税込） */}
            <div>
              <label className="block text-sm font-medium mb-1">仕入価格（税込） ¥</label>
              <input
                type="number"
                value={editingItem.procurement_cost_jpy || ""}
                onChange={(e) => setEditingItem({ ...editingItem, procurement_cost_jpy: e.target.value ? parseFloat(e.target.value) : null })}
                placeholder="0"
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-white text-sm"
              />
            </div>

            {/* レシート有無 */}
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingItem.receipt_exists || false}
                  onChange={(e) => setEditingItem({ ...editingItem, receipt_exists: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm font-medium">📄 レシート有</span>
              </label>
            </div>

            {/* メモ */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">購入メモ</label>
              <textarea
                value={editingItem.procurement_notes || ""}
                onChange={(e) => setEditingItem({ ...editingItem, procurement_notes: e.target.value })}
                placeholder="例：中古品、傷あり、ノーブランド品"
                rows={2}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-white text-sm"
              />
            </div>
          </div>
        </div>

        {/* eBay最適化タイトル */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">eBay最適化タイトル（80）</label>
          <input
            type="text"
            value={editingItem.title_optimized || ""}
            onChange={(e) => setEditingItem({ ...editingItem, title_optimized: e.target.value })}
            maxLength={80}
            className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded text-white"
          />
          <div className="mt-2">
            <button
              onClick={() => {
                if (!editingItem?.title_optimized) return;
                setEditingItem({ ...editingItem, title: editingItem.title_optimized });
              }}
              disabled={!editingItem?.title_optimized || editingItem.title === editingItem.title_optimized}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 rounded text-sm disabled:opacity-50"
            >
              ↪ 商品名に反映
            </button>
          </div>
        </div>

        {/* 商品説明テンプレート選択 */}
        <div className="mb-6 p-4 bg-slate-700/30 rounded border border-slate-600">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-semibold">📋 商品説明テンプレート選択</div>
            <button
              onClick={handleAutoSelectTemplate}
              disabled={!editingItem?.genre || templateSelecting}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm disabled:opacity-50"
              title="ジャンルから最適なテンプレートを推奨"
            >
              {templateSelecting ? "⏳ 選定中..." : "🤖 自動推奨"}
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {["basic", "camera", "gadget", "hobby", "apparel", "shoes"].map((key) => (
              <button
                key={key}
                onClick={() => handleApplyTemplate(key)}
                className={`px-3 py-2 rounded border text-xs font-medium transition ${
                  selectedTemplate === key
                    ? "bg-blue-600 border-blue-400 text-white"
                    : "bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {key}
              </button>
            ))}
          </div>
          {templateToast && (
            <div className="mt-3 text-xs text-green-300">{templateToast}</div>
          )}
        </div>

        {/* 商品説明（eBay用HTML）＋プレビュー */}
        <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">商品説明（eBay用HTML）</label>
              <button
                onClick={handleGenerateDescription}
                disabled={aiGenerating}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm disabled:opacity-50"
                title="ジャンル・タイトル・情報からテンプレを自動選択して説明文を生成"
              >
                🤖 説明文を AI で自動生成
              </button>
              <span className="relative group inline-flex items-center justify-center w-6 h-6 ml-2 rounded-full bg-slate-600 text-white text-xs cursor-default" aria-label="説明">
                i
                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs px-3 py-2 rounded bg-black text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                  画像や既存フィールドを元にテンプレを選びつつ説明文を生成します。OpenAIに直接依存しており、失敗時はアラートと手動編集の誘導が中心
                </span>
              </span>
              <button
                onClick={handleGenerateDescription}
                disabled={isGenerating}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm disabled:opacity-50"
                title="AI（Gemini/OpenAI）で説明文を生成"
              >
                {isGenerating ? "⏳ 生成中..." : "🤖 AI説明文生成"}
              </button>
              <button
                onClick={async () => {
                  if (!editingItem) return;
                  setAiGenerating(true);
                  try {
                    const res = await fetch("/api/gpt-description", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        genre: editingItem.genre || "",
                        sku: editingItem.sku,
                        title: editingItem.title_optimized || editingItem.title || "",
                        brand: editingItem.brand || "",
                        model: editingItem.model || "",
                        color: editingItem.color || "",
                        size: (editingItem.item_specifics || {})["Size"] || "",
                        condition: editingItem.condition || "",
                        included_items: (editingItem.item_specifics || {})["Included Items"] || "",
                        features: (editingItem.item_specifics || {})["Features"] || "",
                        notes: editingItem.notes || "",
                        templateKey: undefined,
                      }),
                    });
                    if (!res.ok) throw new Error("説明文生成失敗");
                    const data = await res.json();
                    setEditingItem({ ...editingItem, description: data.description });
                  } catch (e) {
                    alert("説明文生成に失敗しました");
                  } finally {
                    setAiGenerating(false);
                  }
                }}
                disabled={aiGenerating}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 rounded text-sm disabled:opacity-50"
                title="GPTでテンプレに沿って説明文を生成（OpenAI不可時はフォールバック）"
              >
                ✨ GPTで説明文生成
              </button>
              <span className="relative group inline-flex items-center justify-center w-6 h-6 ml-2 rounded-full bg-slate-600 text-white text-xs cursor-default" aria-label="説明">
                i
                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs px-3 py-2 rounded bg-black text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                  まず「完成版テンプレ」にフィールドを埋めてから、可能ならGPTで英語表現や整形を軽く"磨く"二段構成。OpenAIが落ちてもテンプレ埋め込みのローカル生成に確実にフォールバックします。
                </span>
              </span>
            </div>
            <textarea
              value={editingItem.description || ""}
              onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
              placeholder="eBay用のHTML説明を入力/生成してください"
              className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded text-white h-[500px] resize-y text-sm"
            />
          </div>
          <div>
            <div className="text-sm font-medium mb-2">プレビュー</div>
            <div className="p-3 bg-white text-black rounded border h-[500px] overflow-auto">
              <div dangerouslySetInnerHTML={{ __html: editingItem.description || "" }} />
            </div>
          </div>
        </div>

        {/* Item Specifics（構造化データ） */}
        <div className="mb-6 p-4 bg-slate-700/30 rounded border border-slate-600">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold">Item Specifics（ブランド・モデル・色など）</div>
            <button
              onClick={handleExtractInfo}
              disabled={autoExtracting}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm disabled:opacity-50"
            >
              🔍 AIで抽出する
            </button>
          </div>

          {/* ジャンル入力 */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">ジャンル / カテゴリ</label>
            <input
              placeholder="例：カメラ, フィギュア, 古着など"
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-white text-sm"
              value={editingItem.genre || ""}
              onChange={(e) => setEditingItem({ ...editingItem, genre: e.target.value })}
            />
          </div>

          {/* 先行小フォーム */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <input
              placeholder="Brand"
              className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-white text-sm"
              value={editingItem.brand || ""}
              onChange={(e) => setEditingItem({ ...editingItem, brand: e.target.value })}
            />
            <input
              placeholder="Model"
              className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-white text-sm"
              value={editingItem.model || ""}
              onChange={(e) => setEditingItem({ ...editingItem, model: e.target.value })}
            />
            <input
              placeholder="Color / Size"
              className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-white text-sm"
              value={editingItem.color || ""}
              onChange={(e) => setEditingItem({ ...editingItem, color: e.target.value })}
            />
            <input
              placeholder="Category (eBay)"
              className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-white text-sm"
              value={editingItem.ebay_category_id ?? ""}
              onChange={(e) => setEditingItem({
                ...editingItem,
                ebay_category_id: e.target.value ? parseInt(e.target.value, 10) : null,
              })}
            />
          </div>
          {Object.entries(item_specificsDraft).length === 0 && (
            <div className="text-sm text-slate-300">未取得です。AI抽出ボタンを押してください。</div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(item_specificsDraft).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <label className="w-32 text-sm text-slate-300">{key}:</label>
                <input
                  className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-white text-sm"
                  value={value}
                  onChange={(e) => {
                    const next = { ...item_specificsDraft, [key]: e.target.value };
                    setItem_specificsDraft(next);
                    setEditingItem({ ...editingItem!, item_specifics: next });
                  }}
                />
              </div>
            ))}
          </div>
          {requiredError && (
            <div className="mt-3 text-red-400 text-sm">{requiredError}</div>
          )}
        </div>

        {/* ステータス */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">ステータス</label>
          <select
            value={editingItem.status || "none"}
            onChange={(e) =>
              setEditingItem({
                ...editingItem,
                status: e.target.value as SkuStatus,
              })
            }
            className="px-4 py-2 bg-slate-700/50 border border-slate-600 rounded text-white"
          >
            {Object.entries(STATUS_LABEL).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* 保存ボタン（全タブ共通） */}
        <div className="flex gap-4 flex-wrap mt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 min-w-max px-6 py-3 bg-green-600 hover:bg-green-700 rounded font-semibold disabled:opacity-50 transition"
          >
            {saving ? "保存中..." : "💾 保存して一覧へ"}
          </button>
          <button
            onClick={handleSaveDraft}
            disabled={saving}
            className="flex-1 min-w-max px-6 py-3 bg-slate-600 hover:bg-slate-700 rounded font-semibold disabled:opacity-50 transition"
            title="必須項目が未入力でも途中保存できます"
          >
            🗂 下書き保存
          </button>
          <button
            onClick={() => {
              if (hasUnsaved) {
                setShowUnsavedModal(true);
                setPendingNavigation(() => () => router.push("/sku/sku-manager"));
              } else {
                router.push("/sku/sku-manager");
              }
            }}
            className="flex-1 min-w-max px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded font-semibold transition"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  </div>
  );
}
