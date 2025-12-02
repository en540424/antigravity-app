"use client";

export default function Home() {
  const menuItems = [
    ["外注はこちら", "/outsourcing", "#1e40af"],
    ["写真アップロード", "/upload", "#15803d"],
    ["出品マニュアル", "/manual", "#a855f7"],
    ["SKU入力ホーム", "/sku", "#9333ea"],
    ["会社紹介", "/company", "#6b7280"],
  ];

  return (
    <>
      <style>
        {`
          @media (max-width: 600px) {
            .mobile-center {
              text-align: center !important;
              display: block !important;
              width: 100% !important;
            }

            .logo-img {
              width: 150px !important;
              margin-left: auto !important;
              margin-right: auto !important;
              display: block !important;
            }

            .title-text {
              font-size: 48px !important;
              margin-top: -8px !important;
            }

            .subtitle-text {
              font-size: 28px !important;
            }

            .description-text {
              font-size: 22px !important;
              line-height: 1.6 !important;
            }

            p {
              text-align: center !important;
            }
          }
        `}
      </style>

      <div
        style={{
          minHeight: "100vh",
          padding: "50px 20px",
          background: "#ffffff",
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* ▼ ロゴ（余白を削って密着） */}
        <div style={{ marginBottom: "0px" }}>
          <img
            src="/e-nexus-logo.png"
            alt="E-NEXUS"
            className="logo-img"
            style={{
              width: "280px",
              height: "auto",
            }}
          />
        </div>

        {/* ▼ E-NEXUS（ロゴとの隙間を詰める） */}
        <h1
          className="mobile-center title-text"
          style={{
            fontSize: "80px",
            fontWeight: "800",
            background: "linear-gradient(to right, #2563eb, #1e3a8a)",
            WebkitBackgroundClip: "text",
            color: "transparent",
            marginTop: "-5px",
            marginBottom: "12px",
            lineHeight: 1.1,
          }}
        >
          E-NEXUS
        </h1>

        {/* From Japan to The World */}
        <p
          className="mobile-center subtitle-text"
          style={{
            fontSize: "50px",
            fontWeight: "600",
            color: "#1d4ed8",
            marginBottom: "25px",
            lineHeight: 1.2,
          }}
        >
          From Japan to The World
        </p>

        {/* 日本語キャッチコピー */}
        <p
          className="description-text"
          style={{
            fontSize: "30px",
            fontWeight: "500",
            color: "#374151",
            marginBottom: "30px",
            lineHeight: 1.6,
            maxWidth: "520px",
          }}
        >
          日本から世界へ —— あなたの作業が未来につながる。
        </p>

        {/* 説明文 */}
        <p
          className="description-text"
          style={{
            fontSize: "30px",
            fontWeight: "500",
            color: "#4b5563",
            lineHeight: 1.7,
            marginBottom: "40px",
            maxWidth: "520px",
          }}
        >
          こちらは <b>E-NEXUS 外注スタッフ専用ポータル</b> です。
          <br />
          必要な作業を選んで進めてください。
        </p>

        {/* ボタン */}
        <div
          style={{
            width: "100%",
            maxWidth: "450px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            alignItems: "center",
          }}
        >
          {menuItems.map(([text, link, color]) => (
            <a
              key={link}
              href={link}
              style={{
                display: "block",
                width: "100%",
                padding: "16px 20px",
                background: color,
                color: "white",
                borderRadius: "12px",
                fontSize: "19px",
                textDecoration: "none",
                fontWeight: "700",
                textAlign: "center",
                boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
              }}
            >
              {text}
            </a>
          ))}
        </div>
      </div>
    </>
  );
}
