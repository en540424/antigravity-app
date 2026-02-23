# eBay出品業務仕様書

**作成日**: 2026-01-07  
**対象**: SKU管理画面 > eBay一括出品ツール

---

## 概要

このドキュメントは「**業務を人に渡せる仕様**」を定義します。  
外注・家族・将来の自分でも同じ手順で出品できるよう、すべてのルールを明記しています。

---

## 1. 画像ファイル命名規則（確定仕様）

### フォーマット
```
{SKU}_{用途}_{連番}.jpg
```

### 具体例
```
NEX-20251224-A005_LISTING_01.jpg
NEX-20251224-A005_LISTING_02.jpg
NEX-20251224-A005_LISTING_03.jpg
```

### 用途コード（3種類）

| 用途 | コード | 説明 |
|------|--------|------|
| 未加工・保管 | RAW | アップロード直後の画像 |
| 加工済・元画像 | ORG | 色補正・リサイズ済み |
| **eBay使用** | **LISTING** | **CSV対象（出品用）** |

### 連番ルール（01〜25）

- **01** が必ずメイン画像
- UIで「メイン指定」操作 = `LISTING_01` に自動割当
- 最大 25 枚まで対応

### 禁止事項（仕様として明記）

| 項目 | 状態 | 理由 |
|------|------|------|
| 日本語ファイル名 | ❌ | eBayシステム対応外 |
| スペース含む | ❌ | CSVパース エラー |
| 手動リネーム | ❌ | CSV自動紐づけ崩れ |
| 01 以外をメイン | ❌ | UIロジック破綻 |

### ZIP出力構成（固定）

```
images.zip
└── NEX-20251224-A005/
    ├── NEX-20251224-A005_LISTING_01.jpg
    ├── NEX-20251224-A005_LISTING_02.jpg
    ├── NEX-20251224-A005_LISTING_03.jpg
    └── ...
```

**重要**: SKUごとにフォルダ分け（必須）

---

## 2. Condition（商品状態）変換ロジック

### UI表示（日本語）→ eBay ConditionID（数値）

| UI表示 | eBay ConditionID | eBay表示 | 説明 |
|--------|-----------------|---------|------|
| **新品** | **1000** | New | 新品未開封 |
| **新品（箱なし）** | **1500** | New Other | 新品だが箱・付属品なし |
| **中古：非常に良い** | **3000** | Used - Excellent | ほぼ使用感なし |
| **中古：良い** | **4000** | Used - Very Good | 軽微な傷あり |
| **中古：可** | **5000** | Used - Good | 通常使用程度の傷 |

### 実装詳細

- **UI保存**: `sku_condition` (キー形式: `new`, `new_other`, `excellent`, `very_good`, `good`)
- **CSV出力**: ConditionID のみ（例：`3000`）
- **変換**: `app/lib/ebayNamingConvention.ts` の `CONDITION_MAP` で管理

---

## 3. Category（eBayカテゴリ）仕様

### 内部保存

```typescript
category: {
  id: number;        // eBay CategoryID (例：31388)
  path: string;      // UI表示用 (例："Cameras > Digital Cameras")
}
```

### UI実装

- 階層選択UI（大 → 中 → 小）
- 最終的に **CategoryID（数値）** を 1 つだけ保持

### CSV出力

```
Category = 31388  // 名称は出さない、IDのみ
```

---

## 4. CSVプレビュー画面（出力前確認）

### 目的

- CSV出力ミスを「DL前に潰す」
- 外注でも安心できる確認UX
- CSVを開かせない

### 表示内容（1 SKU = 1 行）

| 項目 | 内容 | 例 |
|------|------|-----|
| SKU | SKU番号 | `NEX-20251224-A005` |
| タイトル | 商品名 | `Sony a6000 Body` |
| Condition | 日本語表示 | `中古：非常に良い` |
| ConditionID | eBayコード | `3000` |
| Category | UI表示用パス | `Cameras > Digital Cameras` |
| CategoryID | eBayコード | `31388` |
| Price | 販売価格USD | `31200` |
| ImageCount | LISTING画像枚数 | `7` |
| メイン画像 | 01 存在確認 | `✅` |
| 出品可 | 総合判定 | `✅` |

### エラー表示ルール

| 表示 | 色 | 意味 | CSV出力 |
|------|-----|------|---------|
| **✅ OK** | 🟢 緑 | すべて満たす | **可能** |
| **⚠️ 注意** | 🟡 黄 | 軽微な問題 | **可能**（注意） |
| **❌ NG** | 🔴 赤 | 出力不可 | **不可** |

### 不可エラー（❌ 赤）

以下のいずれか1件でもあれば「❌ NG」→ CSV出力ボタン無効

- [ ] タイトルが未入力
- [ ] 説明文が未入力
- [ ] コンディションが未設定
- [ ] カテゴリが未設定
- [ ] 価格が未設定
- [ ] LISTING画像が7枚未満
- [ ] メイン画像（01）が見つからない

### 軽微な警告（⚠️ 黄）

以下は出力を阻止しないが、注意表示

- [ ] （例予約）

### 出力ボタン制御

```
❌ が1件でもある  → 出力ボタン「無効」（グレーアウト）
すべて ✅ または ⚠️ → 出力ボタン「有効」（クリック可）
```

### CSV出力後の記録

エクスポート完了時：

```typescript
csv_exported_at: timestamp;  // Supabaseに記録
```

UI表示：

```
✅ CSV出力済（2026-01-07）
```

---

## 5. 全体フロー（手順書）

### ステップ 1: SKU作成 → 画像アップロード

1. SKU自動生成
2. 画像7枚以上を LISTING フォルダへアップロード
3. メイン画像を 01 として指定

### ステップ 2: 商品情報入力

1. タイトル入力（eBay用英語）
2. 説明文入力（英語）
3. コンディション選択（UI: 日本語 → 内部: 数値）
4. カテゴリ選択（階層選択 → ID固定）
5. 価格入力（USD）

### ステップ 3: CSV出力

1. 「① CSV出力」ボタン クリック
2. **プレビュー画面** で確認
3. エラー ❌ があれば修正して再確認
4. 「CSV出力」ボタンで DL

### ステップ 4: 画像ZIP出力

1. 「② 画像ZIP出力」ボタン クリック
2. ZIP DL（ファイル名: `ebay-images-YYYY-MM-DD.zip`）

### ステップ 5: eBay一括出品

1. eBay Seller Central にログイン
2. 「一括出品」ツール
3. CSV ファイルアップロード
4. 画像 ZIP をドラッグ&ドロップ

---

## 6. 将来の拡張予定

### 案A: 「eBay出品セット自動生成」

```
[ 🚀 eBay出品セットを生成 ]
  ↓
  CSV + 画像ZIP を同時出力
```

### 案B: バッチ処理

複数SKUを一括で条件チェック＆出力

---

## 7. トラブルシューティング

### Q: CSV出力ボタンが押せない

A: プレビュー画面で「❌ NG」項目を確認 → 修正 → 再度試行

### Q: ファイル名が違う

A: 命名規則 `{SKU}_{用途}_{連番}.jpg` に従っているか確認

### Q: eBayで画像が表示されない

A: ZIP フォルダ構成がSKU単位になっているか確認

---

## 付録

### ファイル一覧

| ファイル | 用途 |
|---------|------|
| `app/lib/ebayNamingConvention.ts` | 命名規則・変換ロジック定義 |
| `app/api/export-ebay-csv/route.ts` | CSV出力API |
| `app/api/export-ebay-images/route.ts` | ZIP出力API |
| `app/components/CsvPreviewModal.tsx` | プレビュー画面UI |
| `app/sku/sku-manager/page.tsx` | SKU管理画面（出力ボタン） |

### 参考リンク

- [eBay ConditionID 公式](https://developer.ebay.com/api-docs/sell/inventory/types/api:ConditionTypeEnum)
- [eBay CategoryID 検索](https://www.ebay.com/wiki/0/eBay_Categories)

---

**最終更新**: 2026-01-07  
**作成者**: AI Engineering  
**ステータス**: ✅ 確定仕様
