// 発送ステータスのEnum定義
export enum ShippingStatus {
  Unprocessed = "unprocessed", // 未処理
  Preparing = "preparing",     // 準備中
  Processing = "processing",   // 処理中
  Shipped = "shipped",         // 発送済
  Delivered = "delivered"      // 到着
}

export const SHIPPING_STATUS_LABEL: Record<ShippingStatus, string> = {
  [ShippingStatus.Unprocessed]: "未処理",
  [ShippingStatus.Preparing]: "準備中",
  [ShippingStatus.Processing]: "処理中",
  [ShippingStatus.Shipped]: "発送済",
  [ShippingStatus.Delivered]: "到着"
};

export const SHIPPING_STATUS_COLOR: Record<ShippingStatus, string> = {
  [ShippingStatus.Unprocessed]: "bg-gray-400",
  [ShippingStatus.Preparing]: "bg-yellow-400",
  [ShippingStatus.Processing]: "bg-orange-400",
  [ShippingStatus.Shipped]: "bg-blue-400",
  [ShippingStatus.Delivered]: "bg-green-400"
};
