# Design / Engineering Rules（E-NEXUS）

> ⚠ 本ドキュメントは **E-NEXUS（eBayシステム）** の設計・実装ルールの正本（single source of truth）です。  
> ルール追加/例外は必ず `docs/decision-log.md` に記録してから実装します。

---

## 0. 前提（このプロジェクトの性質）
- Next.js App Router 前提（Server Components を基本）
- 外部API（eBay）・非同期処理・国際取引（税/配送/通貨）を扱うため、**安全性と再現性を最優先**
- 「一時的に動く」より「壊れない・追跡できる・復旧できる」を優先

---

## 1. グローバル原則（非交渉ルール）
- 予測可能性 > 賢い実装
- magic number 禁止：定数は必ず命名して集約する
- 業務ロジックは UI から分離（純関数化を優先）
- 外部API（eBay）アクセスは **Adapter 層に隔離**（UI/業務ロジックから直叩き禁止）
- docs/ は契約書。AI提案や一般論より docs が常に優先

---

## 2. UI（画面設計）
- Tailwind CSS を優先。クラスが肥大化/重複が増えた時のみコンポーネント分割
- 画面構成は「入力 → 計算/確認 → 保存/出力」の3ブロックを基本とする
- 主要アクションは 1 画面 1 つ（例：保存 / エクスポート）
- 危険操作（削除/上書き/公開など不可逆）は confirm 必須
- エラー表示は画面上部に集約
  - フィールドエラーは各入力の直下に表示

---

## 3. Data / State（データと状態管理）
- DB カラム名 `snake_case` を source of truth とする
- フロントの型・state も `snake_case` で統一（変換層を増やさない）
- state は必ず分離する：
  - raw入力（ユーザー入力）
  - derived（計算結果/導出値）
- derived が raw を mutate しない（再計算可能な関係を保つ）
- 保存は部分更新（PATCH思考）
  - `null` / `undefined` / `""` で既存を潰さない
  - 明示的にユーザーが “消した” 場合のみクリアを許可

---

## 4. Server / Client Boundary（App Router）
- 認証・権限・データ取得・validation は Server（Server Component or Route Handler）で行う
- Client Component は「UI操作・ローカル状態」に限定
- `"use client"` は必要最小限（安易に付けない）

---

## 5. API / Validation（境界で守る）
- Route Handler 入口で必ず input validation
- 入力不正は 4xx、内部失敗は 5xx
- レスポンス shape を固定：
  - Success: `{ ok: true, data: ... }`
  - Error: `{ ok: false, error: { code: string, message: string, details?: any } }`
- ログは最低限「誰が」「何を」「結果」
- 秘密情報・個人情報はログ出力しない

---

## 6. eBay / External API ルール（最重要）
- eBay API は **不安定な外部システム** として扱う（常に失敗を前提）
- 必ず考慮する：
  - ネットワークエラー
  - 部分失敗（片方だけ成功等）
  - レート制限
  - 仕様変更 / undocumented field
- eBay呼び出しは必ず Adapter 層に閉じ込める
  - 例：`app/lib/ebay/*` や `app/api/ebay/*` などに集約
- “APIが返さない” を正常系として扱う
  - 欠損値で上書きしない（特に title / description / category など）
- 冪等性（idempotency）を重視する
  - リトライ前提で壊れない設計にする

---

## 7. 運用・安全（コミット/変更管理）
- 変更は小さくコミット（レビュー可能な単位）
- UI変更とロジック変更は同一コミットに混ぜない
- 重要ロジック（利益計算/CSV出力/在庫反映等）は純関数化し、差分検証しやすくする

---

## 8. 例外
- 例外は実装前に `docs/decision-log.md` に記録する（口約束禁止）
---

# 🔧 AI Tooling Policy (E-NEXUS 固定ルール)

## 1. 使い分けルール

### 🟢 Skills（構造固定）
- SKU構造
- DB設計思想
- Shippingポリシー
- fallback優先順位
- EIS優先方針
- バイヤー関税負担方針

→ 「変更してはいけない前提」を固定する

### 🟡 通常AI（Claude / ChatGPT）
- UI改善
- 関数差し替え
- 軽微な修正
- 設計相談

### 🔵 Python
- 一括変換
- CSV整形
- 画像変換
- 一括検証
- データ監査

---

## 2. eBay 固定ポリシー

- EIS（eBay International Shipping）を最優先
- 関税はバイヤー負担
- DDP表記で売れやすくする
- SKUは絶対キー（主キー）
- SKUとDBが一致しない修正は禁止

---

## 3. AI安全ガード

- .env系ファイルは絶対コミット禁止
- APIキーはプロンプトに渡さない
- 大規模変更は分割コミット必須
- main/master直接コミット禁止

## 4. Python優先検算ルール

- 計算 / 整形 / 監査が絡む場合は Python を先に使って検算し、
  Implementation rule を残してから実装する