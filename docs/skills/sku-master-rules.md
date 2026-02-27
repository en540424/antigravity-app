# SKU Master Rules（絶対固定）

- SKUは主キー
- SKU変更は禁止（破壊的変更扱い）
- SKUはDBと1:1対応
- SKUで在庫・価格・説明文を連動
- SKUと画像名は一致させるのが理想

禁止：
- SKUの後付け変更
- SKU無し出品