"use client";

import { useState } from "react";
import { saveRollbackLog, getRollbackLogs, clearRollbackLogs, RollbackLog } from "../lib/rollbackLog";
import Link from "next/link";

export default function RollbackPage() {
  const [logs, setLogs] = useState<RollbackLog[]>(getRollbackLogs());
  const [desc, setDesc] = useState("");
  const [type, setType] = useState<RollbackLog["type"]>("UI");
  const [affected, setAffected] = useState("");
  const [action, setAction] = useState("");

  function handleAdd() {
    if (!desc) return;
    saveRollbackLog({
      timestamp: new Date().toISOString(),
      type,
      description: desc,
      affected,
      action,
    });
    setLogs(getRollbackLogs());
    setDesc(""); setAffected(""); setAction("");
  }

  function handleClear() {
    clearRollbackLogs();
    setLogs([]);
  }

  return (
    <div className="p-6 max-w-2xl mx-auto text-sm">
      <div className="mb-4">
        <Link href="/" className="inline-flex items-center px-3 py-2 bg-slate-800 text-white rounded border border-slate-700 hover:bg-slate-700">
          ⬅️ ホームに戻る
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-4">障害・ロールバック記録</h1>
      <div className="mb-6 text-gray-500">
        障害発生時は「まず止める・直さない・戻す」。<br />
        状況・対応内容を必ず記録し、再発防止に活用してください。
      </div>
      <div className="mb-4">
        <label className="block mb-1 font-semibold">障害種別</label>
        <select value={type} onChange={e => setType(e.target.value as RollbackLog["type"])} className="border px-2 py-1 rounded">
          <option value="UI">UI</option>
          <option value="AI">AI</option>
          <option value="出品">出品</option>
          <option value="データ">データ</option>
          <option value="その他">その他</option>
        </select>
      </div>
      <div className="mb-4">
        <label className="block mb-1 font-semibold">障害内容</label>
        <input value={desc} onChange={e => setDesc(e.target.value)} className="w-full border rounded p-2" placeholder="例: 出品画面が真っ白になる" />
      </div>
      <div className="mb-4">
        <label className="block mb-1 font-semibold">影響範囲</label>
        <input value={affected} onChange={e => setAffected(e.target.value)} className="w-full border rounded p-2" placeholder="例: 全SKU/一部SKU/外注画面のみ など" />
      </div>
      <div className="mb-4">
        <label className="block mb-1 font-semibold">対応内容</label>
        <input value={action} onChange={e => setAction(e.target.value)} className="w-full border rounded p-2" placeholder="例: UIを前のバージョンに戻した" />
      </div>
      <button onClick={handleAdd} className="px-4 py-2 bg-blue-700 text-white rounded font-bold hover:bg-blue-800 mr-2">記録追加</button>
      <button onClick={handleClear} className="px-4 py-2 bg-gray-500 text-white rounded font-bold hover:bg-gray-700">全消去</button>
      <h2 className="mt-8 mb-2 text-lg font-bold">記録一覧</h2>
      <div className="space-y-2">
        {logs.length === 0 && <div className="text-gray-400">記録なし</div>}
        {logs.map((log, i) => (
          <div key={i} className="border rounded p-2 bg-slate-50">
            <div className="text-xs text-gray-500">{log.timestamp} [{log.type}]</div>
            <div>内容: {log.description}</div>
            <div>影響: {log.affected}</div>
            <div>対応: {log.action}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
