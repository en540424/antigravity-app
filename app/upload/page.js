"use client";

import { useState } from "react";

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [sku, setSku] = useState("");
  const [message, setMessage] = useState("");

  const handleUpload = async () => {
    if (!file) {
      setMessage("ファイルを選択してください");
      return;
    }
    if (!sku) {
      setMessage("SKUを入力してください");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("sku", sku); // ⭐SKU追加

    setMessage("アップロード中…");

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      setMessage(`アップロード完了！ → ${data.path}`);
    } else {
      setMessage("アップロードに失敗しました");
    }
  };

  return (
    <div
      style={{
        maxWidth: "450px",
        margin: "50px auto",
        padding: "25px",
        background: "#ffffff",
        borderRadius: "12px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
      }}
    >
      <h2 style={{ textAlign: "center", marginBottom: "25px" }}>
        📸 写真アップロード
      </h2>

      {/* ⭐ SKU入力欄 */}
      <div style={{ marginBottom: "20px" }}>
        <label style={{ fontWeight: "bold" }}>SKU（商品コード）</label>
        <input
          type="text"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          placeholder="例：SKU12345"
          style={{
            width: "100%",
            marginTop: "6px",
            padding: "10px",
            border: "1px solid #ccc",
            borderRadius: "8px",
            fontSize: "15px",
          }}
        />
      </div>

      {/* ファイル入力 */}
      <div style={{ marginBottom: "20px" }}>
        <label style={{ fontWeight: "bold" }}>画像ファイルを選択</label>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
          style={{
            width: "100%",
            marginTop: "6px",
          }}
        />
      </div>

      {/* アップロードボタン */}
      <button
        onClick={handleUpload}
        style={{
          width: "100%",
          padding: "12px",
          backgroundColor: "#0070f3",
          border: "none",
          borderRadius: "8px",
          color: "white",
          fontSize: "16px",
          cursor: "pointer",
        }}
      >
        🚀 アップロード
      </button>

      {/* メッセージ */}
      {message && (
        <p
          style={{
            marginTop: "20px",
            textAlign: "center",
            whiteSpace: "pre-wrap",
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}
