import { NextAction } from "../../types/sku";

export function getNextAction(sku: {
  title: string | null;
  condition: string | null;
  image_count: number;
  required_image_count: number;
  cost_price: number | null;
  sell_price: number | null;
  profit: number | null;
  ai_title: string | null;
  ai_description: string | null;
  can_list: boolean | null;
}): NextAction {
  if (sku.image_count < sku.required_image_count) {
    return {
      type: "image",
      label: "画像をアップロード",
      description: "画像が不足しています",
    };
  }

  if (!sku.title || sku.title.trim() === "") {
    return {
      type: "title",
      label: "商品名を入力",
      description: "商品名が未入力です",
    };
  }

  if (!sku.condition) {
    return {
      type: "condition",
      label: "コンディションを設定",
      description: "状態が未設定です",
    };
  }

  if (!sku.cost_price || !sku.sell_price) {
    return {
      type: "price",
      label: "価格を入力",
      description: "原価または売価が未入力です",
    };
  }

  if (sku.profit === null) {
    return {
      type: "profit",
      label: "利益を確認",
      description: "利益計算ができません",
    };
  }

  if (!sku.ai_title) {
    return {
      type: "ai_title",
      label: "AIタイトルを生成",
      description: "AIタイトルが未生成です",
    };
  }

  if (!sku.ai_description) {
    return {
      type: "ai_description",
      label: "AI説明文を生成",
      description: "AI説明文が未生成です",
    };
  }

  if (sku.can_list !== true) {
    return {
      type: "listing",
      label: "出品可否を確定",
      description: "出品可否が未確定です",
    };
  }

  return {
    type: "done",
    label: "完了",
    description: "すべての作業が完了しています",
  };
}
