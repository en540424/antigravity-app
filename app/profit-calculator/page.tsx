"use client";
import { useState, useEffect } from "react";
import {
  calculateProfit,
  DEFAULT_PROFIT_SETTINGS,
  type ProfitCalculationInput,
  type ProfitCalculationResult,
} from "../lib/profitCalculator";

export default function ProfitCalculator() {
  const [platform, setPlatform] = useState<"ebay" | "domestic" | "other">("ebay");
  
  // 想定売値情報
  const [sellingPriceUSD, setSellingPriceUSD] = useState(200);
  const [shippingCostUSD, setShippingCostUSD] = useState(35);
  
  // eBayコスト設定
  const [exchangeRate, setExchangeRate] = useState(DEFAULT_PROFIT_SETTINGS.exchangeRate);
  const [ebayFeePercent, setEbayFeePercent] = useState(DEFAULT_PROFIT_SETTINGS.ebayFeePercent);
  const [promotedListingPercent, setPromotedListingPercent] = useState(DEFAULT_PROFIT_SETTINGS.promotedListingPercent);
  const [internationalPaymentFeePercent, setInternationalPaymentFeePercent] = useState(DEFAULT_PROFIT_SETTINGS.internationalPaymentFeePercent);
  const [payoneerFeePercent, setPayoneerFeePercent] = useState(DEFAULT_PROFIT_SETTINGS.payoneerFeePercent);
  const [payoneerFixedFeeUSD, setPayoneerFixedFeeUSD] = useState(DEFAULT_PROFIT_SETTINGS.payoneerFixedFeeUSD);
  
  // その他コスト
  const [purchaseCostJPY, setPurchaseCostJPY] = useState(0);
  const [domesticShippingJPY, setDomesticShippingJPY] = useState(0);
  const [packagingCostJPY, setPackagingCostJPY] = useState(0);
  const [staffCostMultiplier, setStaffCostMultiplier] = useState(1.0);
  
  const [result, setResult] = useState<ProfitCalculationResult | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    const input: ProfitCalculationInput = {
      sellingPriceUSD,
      shippingCostUSD,
      exchangeRate,
      ebayFeePercent,
      promotedListingPercent,
      internationalPaymentFeePercent,
      payoneerFeePercent,
      payoneerFixedFeeUSD,
      purchaseCostJPY,
      domesticShippingJPY,
      packagingCostJPY,
      staffCostMultiplier,
    };
    
    const calculated = calculateProfit(input);
    setResult(calculated);
  }, [
    sellingPriceUSD,
    shippingCostUSD,
    exchangeRate,
    ebayFeePercent,
    promotedListingPercent,
    internationalPaymentFeePercent,
    payoneerFeePercent,
    payoneerFixedFeeUSD,
    purchaseCostJPY,
    domesticShippingJPY,
    packagingCostJPY,
    staffCostMultiplier,
  ]);

  const getStatusColor = () => {
    if (!result) return "bg-gray-500";
    if (result.profitRate >= 15) return "bg-green-500";
    if (result.profitRate >= 10) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getStatusText = () => {
    if (!result) return "計算中";
    if (result.profitRate >= 15) return "出品OK";
    if (result.profitRate >= 10) return "要検討";
    return "利益率低";
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">利益計算ツール</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setPlatform("ebay")}
            className={`px-4 py-2 rounded ${platform === "ebay" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          >
            eBay
          </button>
          <button
            onClick={() => setPlatform("domestic")}
            className={`px-4 py-2 rounded ${platform === "domestic" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          >
            国内
          </button>
          <button
            onClick={() => setPlatform("other")}
            className={`px-4 py-2 rounded ${platform === "other" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          >
            その他
          </button>
        </div>
      </div>

      {/* 出品判定 */}
      {result && (
        <div className={`${getStatusColor()} text-white p-4 rounded-lg flex items-center justify-between`}>
          <div>
            <span className="text-xl font-bold">{getStatusText()}</span>
            <span className="ml-4">利益 ¥{result.netProfitJPY.toLocaleString()} / 利益率 {result.profitRate}%</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 想定売値情報・送料 */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-bold border-b pb-2">📊 想定売値情報・送料</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">想定販売価格（USD）</label>
              <input
                type="number"
                value={sellingPriceUSD}
                onChange={(e) => setSellingPriceUSD(Number(e.target.value))}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">想定販売価格（JPY）自動計算</label>
              <input
                type="text"
                value={result ? `¥${result.sellingPriceJPY.toLocaleString()}` : "¥0"}
                disabled
                className="w-full border rounded px-3 py-2 bg-gray-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">想定送料（USD）デフォルト35</label>
              <input
                type="number"
                value={shippingCostUSD}
                onChange={(e) => setShippingCostUSD(Number(e.target.value))}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">想定送料（JPY）自動計算</label>
              <input
                type="text"
                value={result ? `¥${result.shippingRevenueJPY.toLocaleString()}` : "¥0"}
                disabled
                className="w-full border rounded px-3 py-2 bg-gray-100"
              />
            </div>
          </div>
        </div>

        {/* eBayコスト設定 */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-bold border-b pb-2">▼ ■ eBayコスト設定（通常は触らない）</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">為替レート（USD→JPY）</label>
              <input
                type="number"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(Number(e.target.value))}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">eBay手数料（%）デフォルト12.9</label>
              <input
                type="number"
                step="0.1"
                value={ebayFeePercent}
                onChange={(e) => setEbayFeePercent(Number(e.target.value))}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Promoted Listing（%）デフォルト0</label>
              <input
                type="number"
                step="0.1"
                value={promotedListingPercent}
                onChange={(e) => setPromotedListingPercent(Number(e.target.value))}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">海外決済手数料（%）デフォルト1.35</label>
              <input
                type="number"
                step="0.01"
                value={internationalPaymentFeePercent}
                onChange={(e) => setInternationalPaymentFeePercent(Number(e.target.value))}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Payoneer手数料（%）デフォルト2.0</label>
              <input
                type="number"
                step="0.1"
                value={payoneerFeePercent}
                onChange={(e) => setPayoneerFeePercent(Number(e.target.value))}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Payoneer固定手数料（USD）デフォルト0.4</label>
              <input
                type="number"
                step="0.1"
                value={payoneerFixedFeeUSD}
                onChange={(e) => setPayoneerFixedFeeUSD(Number(e.target.value))}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 利益計算結果 */}
      {result && (
        <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-bold border-b pb-2">🧮 利益計算（概算値・再計算時に変動）</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded">
              <div className="text-sm text-gray-600">💎 想定販売価格（JPY）</div>
              <div className="text-2xl font-bold text-blue-600">¥{result.sellingPriceJPY.toLocaleString()}</div>
            </div>
            <div className="bg-white p-4 rounded">
              <div className="text-sm text-gray-600">📦 想定送料（JPY）</div>
              <div className="text-2xl font-bold text-blue-600">¥{result.shippingRevenueJPY.toLocaleString()}</div>
            </div>
          </div>

          {/* スタッフコスト（係数ボタンで変動） */}
          <div className="bg-white rounded p-4">
            <h3 className="font-bold mb-2">🎯 スタッフコスト（係数ボタンで変動）</h3>
            <div className="flex gap-2 mb-3">
              {[0.8, 0.9, 1.0, 1.1, 1.2].map((multiplier) => (
                <button
                  key={multiplier}
                  onClick={() => setStaffCostMultiplier(multiplier)}
                  className={`px-4 py-2 rounded ${
                    staffCostMultiplier === multiplier
                      ? "bg-purple-600 text-white"
                      : "bg-gray-200 hover:bg-gray-300"
                  }`}
                >
                  {multiplier}x
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600">🔥 想定利益</div>
                <div className={`text-2xl font-bold ${result.netProfitJPY >= 0 ? "text-green-600" : "text-red-600"}`}>
                  ¥{result.netProfitJPY.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">📈 想定利益率</div>
                <div className={`text-2xl font-bold ${result.profitRate >= 15 ? "text-green-600" : result.profitRate >= 10 ? "text-yellow-600" : "text-red-600"}`}>
                  {result.profitRate}%
                </div>
              </div>
            </div>
          </div>

          {/* 詳細表示切り替え */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full bg-gray-200 hover:bg-gray-300 py-2 rounded font-medium"
          >
            {showAdvanced ? "詳細を非表示 ▲" : "詳細を表示 ▼"}
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              <div className="bg-white p-4 rounded">
                <h3 className="font-bold mb-2 text-red-600">手数料内訳</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>eBay手数料:</span>
                    <span>¥{result.ebayFeeJPY.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Promoted Listing:</span>
                    <span>¥{result.promotedListingFeeJPY.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>海外決済手数料:</span>
                    <span>¥{result.internationalPaymentFeeJPY.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payoneer手数料:</span>
                    <span>¥{result.payoneerFeeJPY.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payoneer固定:</span>
                    <span>¥{result.payoneerFixedFeeJPY.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-1">
                    <span>合計:</span>
                    <span>¥{result.totalFeesJPY.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded">
                <h3 className="font-bold mb-2 text-orange-600">コスト内訳</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>配送コスト:</span>
                    <span>¥{result.shippingCostJPY.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>仕入れ原価:</span>
                    <span>¥{result.purchaseCostJPY.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>国内送料:</span>
                    <span>¥{result.domesticShippingJPY.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>梱包費:</span>
                    <span>¥{result.packagingCostJPY.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-1">
                    <span>合計:</span>
                    <span>¥{result.totalCostJPY.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded">
                <h3 className="font-bold mb-2 text-green-600">利益サマリー</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>総売上:</span>
                    <span>¥{result.totalRevenueJPY.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>総手数料:</span>
                    <span className="text-red-600">-¥{result.totalFeesJPY.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>総コスト:</span>
                    <span className="text-red-600">-¥{result.totalCostJPY.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>粗利:</span>
                    <span>¥{result.grossProfitJPY.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-1">
                    <span>純利益:</span>
                    <span className={result.netProfitJPY >= 0 ? "text-green-600" : "text-red-600"}>
                      ¥{result.netProfitJPY.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* その他コスト入力（オプション） */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-xl font-bold border-b pb-2">💰 その他コスト（任意）</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">仕入れ原価（JPY）</label>
            <input
              type="number"
              value={purchaseCostJPY}
              onChange={(e) => setPurchaseCostJPY(Number(e.target.value))}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">国内送料（JPY）</label>
            <input
              type="number"
              value={domesticShippingJPY}
              onChange={(e) => setDomesticShippingJPY(Number(e.target.value))}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">梱包費（JPY）</label>
            <input
              type="number"
              value={packagingCostJPY}
              onChange={(e) => setPackagingCostJPY(Number(e.target.value))}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>
      </div>

      {/* ホームに戻るボタン */}
      <div className="flex justify-center">
        <a
          href="/"
          className="bg-gray-600 hover:bg-gray-700 text-white px-8 py-3 rounded-lg font-medium"
        >
          ← ホームに戻る
        </a>
      </div>
    </div>
  );
}
