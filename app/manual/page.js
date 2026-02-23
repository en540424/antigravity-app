
"use client";
import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
const ReactMarkdown = dynamic(() => import('react-markdown'), { ssr: false });

export default function ManualPage() {
  const [showSummary, setShowSummary] = useState(false);
  const [summaryContent, setSummaryContent] = useState("");

  useEffect(() => {
    if (showSummary) {
      fetch("/manual-summary.md")
        .then((res) => res.text())
        .then((text) => setSummaryContent(text));
    }
  }, [showSummary]);

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "60px 16px",
        background: "#e5e7eb",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        lineHeight: "1.7",
      }}
    >
      <div style={{ maxWidth: "960px", margin: "0 auto", marginBottom: "16px" }}>
        <a
          href="/"
          style={{
            display: "inline-block",
            padding: "8px 12px",
            background: "#0f172a",
            color: "white",
            borderRadius: "8px",
            textDecoration: "none",
          }}
        >
          ⬅️ ホームに戻る
        </a>
      </div>
      {/* トグルボタン */}
      <div style={{ maxWidth: "960px", margin: "0 auto 24px auto", textAlign: "center" }}>
        <button
          onClick={() => setShowSummary(false)}
          style={{
            marginRight: 12,
            padding: "10px 24px",
            borderRadius: 8,
            border: showSummary ? "1px solid #d1d5db" : "2px solid #0ea5e9",
            background: showSummary ? "#f3f4f6" : "#e0f2fe",
            color: showSummary ? "#374151" : "#0ea5e9",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          既存マニュアル
        </button>
        <button
          onClick={() => setShowSummary(true)}
          style={{
            padding: "10px 24px",
            borderRadius: 8,
            border: showSummary ? "2px solid #0ea5e9" : "1px solid #d1d5db",
            background: showSummary ? "#e0f2fe" : "#f3f4f6",
            color: showSummary ? "#0ea5e9" : "#374151",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          運用マニュアルまとめ
        </button>
      </div>
      {/* 中央の白カード */}
      <div
        style={{
          maxWidth: "960px",
          margin: "0 auto",
          background: "#ffffff",
          borderRadius: "18px",
          padding: "48px 32px",
          boxShadow: "0 12px 30px rgba(15, 23, 42, 0.15)",
        }}
      >
        {!showSummary ? (
          <>
            {/* タイトル */}
            <h1
              style={{
                textAlign: "center",
                fontSize: "36px",
                fontWeight: "800",
                marginBottom: "12px",
              }}
            >
              E-NEXUS 出品マニュアル
            </h1>

            <p
              style={{
                textAlign: "center",
                fontSize: "16px",
                color: "#6b7280",
                marginBottom: "40px",
              }}
            >
              外注スタッフ向け：写真撮影〜SKU管理まで。わかりやすく解説します。
            </p>

            {/* STEP 1：写真撮影 */}
            <section
              style={{
                marginBottom: "28px",
                padding: "28px 22px",
                borderRadius: "16px",
                background: "#e5f6ff", // 薄い水色
                boxShadow: "0 4px 18px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "10px",
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    padding: "4px 10px",
                    borderRadius: "999px",
                    background: "#38bdf8",
                    color: "#fff",
                    letterSpacing: "0.05em",
                    marginRight: "10px",
                  }}
                >
                  STEP 1
                </span>

                <h2
                  style={{
                    margin: 0,
                    fontSize: "22px",
                    fontWeight: "700",
                  }}
                >
                  写真撮影のポイント
                </h2>
              </div>

              <ul
                style={{
                  paddingLeft: "20px",
                  margin: 0,
                  fontSize: "15px",
                  color: "#111827",
                }}
              >
                <li>明るい場所で撮影し、商品の色味を自然光に近づけるようにします。</li>
                <li>背景は白や単色にして、商品が目立つようにします。</li>
                <li>正面・側面・背面・アップなど複数の角度から撮影してください。</li>
                <li>キズ・汚れの撮影も必須です。わかりやすい写真を撮るよう意識します。</li>
                <li>水平・垂直を意識して、歪みのない写真にします。</li>
              </ul>
            </section>

            {/* STEP 2：タイトル説明文 */}
            <section
              style={{
                marginBottom: "28px",
                padding: "28px 22px",
                borderRadius: "16px",
                background: "#fef9c3", // 薄い黄色
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "10px",
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    padding: "4px 10px",
                    borderRadius: "999px",
                    background: "#eab308",
                    color: "#fff",
                    letterSpacing: "0.08em",
                    marginRight: "10px",
                  }}
                >
                  STEP 2
                </span>

                <h2
                  style={{
                    margin: 0,
                    fontSize: "22px",
                    fontWeight: "700",
                  }}
                >
                  タイトル・説明文の作成
                </h2>
              </div>

              <h3
                style={{
                  fontSize: "18px",
                  fontWeight: "700",
                  margin: "8px 0 4px",
                }}
              >
                タイトル
              </h3>

              <ul
                style={{
                  paddingLeft: "20px",
                  margin: 0,
                  fontSize: "15px",
                  color: "#111827",
                  marginBottom: "8px",
                }}
              >
                <li>ブランド名・型番・カテゴリ名など、検索されやすい情報を入れる。</li>
                <li>不要な記号を避け、80文字以内でわかりやすくまとめる。</li>
                <li>「新品 / used」など状態が分かる単語も入れて説明的にする。</li>
              </ul>
            </section>

            {/* STEP 3：SKU管理 */}
            <section
              style={{
                marginBottom: "28px",
                padding: "28px 22px",
                borderRadius: "16px",
                background: "#dcfce7", // 薄いグリーン
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "10px",
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    padding: "4px 10px",
                    borderRadius: "999px",
                    background: "#16a34a",
                    color: "#fff",
                    letterSpacing: "0.05em",
                    marginRight: "10px",
                  }}
                >
                  STEP 3
                </span>

                <h2
                  style={{
                    margin: 0,
                    fontSize: "22px",
                    fontWeight: "700",
                  }}
                >
                  SKU管理ルール
                </h2>
              </div>

              <ul
                style={{
                  paddingLeft: "20px",
                  margin: 0,
                  fontSize: "15px",
                  color: "#111827",
                }}
              >
                <li>商品1つにつき必ず1つのSKU番号を割り当てます。</li>
                <li>写真は必ず SKU フォルダに分けて整理してください。</li>
                <li>SKU番号は飛ばさず連番で作成します（例：SKU-101 → 102）。</li>
                <li>同じ商品でも別個体なら別SKUとして管理します。</li>
                <li>メモ欄には「キズ有/付属品なし」など要点だけ記入。</li>
                <li>撮影後は「SKU入力ホーム」で必ず登録すること。</li>
              </ul>
            </section>
          </>
        ) : (
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <h2 style={{ textAlign: "center", fontWeight: 800, fontSize: 28, marginBottom: 24 }}>運用マニュアルまとめ</h2>
            <div style={{ background: "#f3f4f6", borderRadius: 12, padding: 24 }}>
              <ReactMarkdown
                components={{
                  h1: ({node, ...props}) => <h1 style={{color: '#0ea5e9', fontSize: 32, fontWeight: 900, margin: '32px 0 18px'}} {...props} />,
                  h2: ({node, ...props}) => <h2 style={{color: '#16a34a', fontSize: 26, fontWeight: 800, margin: '28px 0 14px'}} {...props} />,
                  h3: ({node, ...props}) => <h3 style={{color: '#eab308', fontSize: 20, fontWeight: 700, margin: '20px 0 10px'}} {...props} />,
                  ul: ({node, ...props}) => <ul style={{background: '#fff', borderRadius: 8, padding: '18px 24px', margin: '18px 0', fontSize: 16, color: '#111827', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'}} {...props} />,
                  li: ({node, ...props}) => <li style={{marginBottom: 8, lineHeight: 1.7}} {...props} />,
                  hr: () => <hr style={{border: 0, borderTop: '2px dashed #e5e7eb', margin: '32px 0'}} />,
                  p: ({node, ...props}) => <p style={{margin: '12px 0', fontSize: 16, color: '#374151'}} {...props} />,
                  strong: ({node, ...props}) => <strong style={{color: '#0ea5e9', fontWeight: 700}} {...props} />,
                  code: ({node, ...props}) => <code style={{background: '#e0e7ef', borderRadius: 4, padding: '2px 6px', fontSize: 15}} {...props} />,
                }}
              >
                {summaryContent}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
