"use client";

import { useState } from "react";

export default function OutsourcingPage() {
  // --- タスクの初期データ ---
  const [tasks, setTasks] = useState([
    { sku: "SKU-001", title: "撮影（基本カット）", memo: "", status: "未処理" },
    { sku: "SKU-002", title: "採寸（再確認）", memo: "", status: "未処理" },
  ]);

  // --- ステータス切替 ---
  const toggleStatus = (index) => {
    const newTasks = [...tasks];
    const current = newTasks[index].status;

    if (current === "未処理") newTasks[index].status = "対応中";
    else if (current === "対応中") newTasks[index].status = "完了";
    else newTasks[index].status = "未処理";

    setTasks(newTasks);
  };

  const [workerMemo, setWorkerMemo] = useState("");

  const adminMemo =
    "※ 今日の注意点：商品番号が似ているSKUがあるため、撮影時にラベルを必ず確認してください。";

  return (
    <div
      style={{
        padding: "20px",
        maxWidth: "900px",
        margin: "0 auto",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div style={{ marginBottom: "16px" }}>
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
      <h1
        style={{
          fontSize: "28px",
          fontWeight: "800",
          marginBottom: "25px",
        }}
      >
        📌 外注スタッフ作業ページ
      </h1>

      {/* ---- 今日のタスク一覧 ---- */}
      <div
        style={{
          background: "#f3f4f6",
          padding: "18px",
          borderRadius: "10px",
          marginBottom: "30px",
        }}
      >
        <h2
          style={{
            fontSize: "22px",
            marginBottom: "15px",
            fontWeight: 700,
          }}
        >
          🔥 今日のタスク一覧
        </h2>

        {tasks.map((task, i) => (
          <div
            key={i}
            style={{
              display: "grid",

              /* スマホ → 2行  PC → 横4分割 */
              gridTemplateColumns:
                "repeat(auto-fit, minmax(120px, 1fr))",

              gap: "10px",
              padding: "15px 10px",
              background: "white",
              borderRadius: "8px",
              marginBottom: "12px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
              alignItems: "center",
            }}
          >
            {/* SKU */}
            <div style={{ fontWeight: "700" }}>{task.sku}</div>

            {/* タイトル */}
            <div>{task.title}</div>

            {/* メモ */}
            <div>
              <input
                type="text"
                placeholder="メモ"
                value={task.memo}
                onChange={(e) => {
                  const newTasks = [...tasks];
                  newTasks[i].memo = e.target.value;
                  setTasks(newTasks);
                }}
                style={{
                  width: "100%",
                  border: "1px solid #ccc",
                  padding: "6px",
                  borderRadius: "5px",
                }}
              />
            </div>

            {/* 状態ボタン */}
            <div style={{ textAlign: "right" }}>
              <button
                onClick={() => toggleStatus(i)}
                style={{
                  width: "100%",
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: "700",
                  color: "white",
                  background:
                    task.status === "未処理"
                      ? "#6b7280"
                      : task.status === "対応中"
                      ? "#2563eb"
                      : "#16a34a",
                }}
              >
                {task.status}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ---- 外注メモ ---- */}
      <div style={{ marginBottom: "30px" }}>
        <h2
          style={{
            fontSize: "22px",
            fontWeight: 700,
            marginBottom: "8px",
          }}
        >
          📝 外注メモ（あなたへのメッセージ）
        </h2>
        <textarea
          value={workerMemo}
          onChange={(e) => setWorkerMemo(e.target.value)}
          placeholder="ここにメモを入力してください。"
          style={{
            width: "100%",
            height: "100px",
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            fontSize: "16px",
          }}
        />
      </div>

      {/* ---- 管理者メモ ---- */}
      <div
        style={{
          background: "#e0f2fe",
          padding: "20px",
          borderRadius: "8px",
          marginBottom: "30px",
        }}
      >
        <h2
          style={{
            fontSize: "22px",
            fontWeight: 700,
            marginBottom: "8px",
          }}
        >
          📢 管理者メモ（指示）
        </h2>
        <p style={{ fontSize: "18px", lineHeight: 1.6 }}>{adminMemo}</p>
      </div>

      {/* ---- ショートカット ---- */}
      <div
        style={{
          display: "flex",
          gap: "15px",
          flexWrap: "wrap",
          marginBottom: "40px",
        }}
      >
        <a
          href="/upload"
          style={{
            padding: "14px 18px",
            background: "#15803d",
            color: "white",
            borderRadius: "8px",
            textDecoration: "none",
            fontWeight: "700",
            flex: "1 1 200px",
            textAlign: "center",
          }}
        >
          📷 写真アップロード
        </a>

        <a
          href="/sku"
          style={{
            padding: "14px 18px",
            background: "#6366f1",
            color: "white",
            borderRadius: "8px",
            textDecoration: "none",
            fontWeight: "700",
            flex: "1 1 200px",
            textAlign: "center",
          }}
        >
          🏷️ SKU入力ホーム
        </a>

        <a
          href="/manual"
          style={{
            padding: "14px 18px",
            background: "#6b7280",
            color: "white",
            borderRadius: "8px",
            textDecoration: "none",
            fontWeight: "700",
            flex: "1 1 200px",
            textAlign: "center",
          }}
        >
          📘 出品マニュアル
        </a>
      </div>
    </div>
  );
}
