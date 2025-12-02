"use client";

export default function SkuPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "60px 16px",
        background: "#e5e7eb",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        lineHeight: 1.7,
      }}
    >
      <h1 style={{ textAlign: "center", fontSize: "32px", fontWeight: "800" }}>
        SKU入力ホーム
      </h1>

      <div
        style={{
          maxWidth: "700px",
          margin: "0 auto",
          marginTop: "40px",
          background: "#ffffff",
          padding: "30px",
          borderRadius: "16px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        }}
      >
        <div style={{ marginBottom: "20px" }}>
          <label>タイトル</label>
          <input style={inputBase} />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label>SKU</label>
          <input style={inputBase} />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label>説明</label>
          <textarea style={textareaBase} rows="4"></textarea>
        </div>

        <button
          type="button"
          style={{
            width: "100%",
            padding: "14px",
            background: "#2563eb",
            color: "#ffffff",
            borderRadius: "10px",
            fontSize: "18px",
            border: "none",
          }}
          onClick={() => alert("仮送信 OK")}
        >
          送信する
        </button>
      </div>
    </div>
  );
}

const inputBase = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  fontSize: "16px",
};

const textareaBase = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  fontSize: "16px",
  resize: "vertical",
};
