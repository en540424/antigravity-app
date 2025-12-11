"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

type SkuStatus = "shooting" | "editing" | "listing" | "done" | "none";

type SkuItem = {
  id: string;
  sku: string;
  title: string;
  status: SkuStatus;
  created_at: string;
};

type StorageImage = {
  name: string;
  url: string;
};

const FOLDERS = ["raw", "original", "edited", "listing", "thumb"] as const;
type FolderType = (typeof FOLDERS)[number];

export default function MobileDetail() {
  const params = useParams();
  const router = useRouter();

  const skuId =
    typeof params.id === "string" && params.id.trim() !== ""
      ? params.id
      : null;

  const [item, setItem] = useState<SkuItem | null>(null);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<"title" | "status" | "upload" | "images">(
    "title"
  );

  const [title, setTitle] = useState("");
  const [uploadFolder, setUploadFolder] = useState<FolderType>("raw");
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);

  const [images, setImages] = useState<Record<FolderType, StorageImage[]>>({
    raw: [],
    original: [],
    edited: [],
    listing: [],
    thumb: [],
  });

  // 詳細取得
  useEffect(() => {
    if (!skuId) return;

    const fetchDetail = async () => {
      try {
        const res = await fetch(`/api/sku/${skuId}`);
        if (!res.ok) throw new Error("not found");
        const json = await res.json();
        setItem(json);
        setTitle(json.title ?? "");
      } catch (e) {
        console.error("SKU fetch error", e);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [skuId]);

  // 画像読み込み
  useEffect(() => {
    if (!item?.sku) return;

    const fetchImages = async () => {
      const resObj: any = {};

      for (const f of FOLDERS) {
        const res = await fetch(`/api/images?sku=${item.sku}&folder=${f}`);
        if (!res.ok) {
          resObj[f] = [];
          continue;
        }
        resObj[f] = (await res.json()) ?? [];
      }

      setImages(resObj);
    };

    fetchImages();
  }, [item]);

  if (loading) return <div className="p-4 text-white">読み込み中…</div>;
  if (!item) return <div className="p-4 text-white">SKU が見つかりません。</div>;

  const saveTitle = async () => {
    if (title.length > 80) {
      alert("80文字を超えています");
      return;
    }

    await fetch(`/api/sku/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, status: item.status }),
    });

    alert("保存しました");
  };

  const updateStatus = async (status: SkuStatus) => {
    await fetch(`/api/sku/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, status }),
    });
    alert("ステータス変更しました");
  };

  const handleUpload = async () => {
    if (!files?.length) {
      alert("画像を選択してください");
      return;
    }

    setUploading(true);

    const form = new FormData();
    form.append("sku", item.sku);
    form.append("folder", uploadFolder);
    Array.from(files).forEach((f) => form.append("files", f));

    const res = await fetch("/api/upload-image", {
      method: "POST",
      body: form,
    });

    setUploading(false);

    if (!res.ok) {
      alert("アップロード失敗");
      return;
    }

    alert("アップロード成功");

    const imgRes = await fetch(
      `/api/images?sku=${item.sku}&folder=${uploadFolder}`
    );
    if (imgRes.ok) {
      const list = await imgRes.json();
      setImages((prev) => ({ ...prev, [uploadFolder]: list }));
    }
  };

  const deleteImage = async (folder: FolderType, name: string) => {
    if (!confirm("画像を削除しますか？")) return;

    await fetch("/api/delete-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku: item.sku, folder, name }),
    });

    const res = await fetch(`/api/images?sku=${item.sku}&folder=${folder}`);
    if (res.ok) {
      const list = await res.json();
      setImages((prev) => ({ ...prev, [folder]: list }));
    }
  };

  return (
    <div className="text-white pb-28 p-4 max-w-lg mx-auto">
      <button
        onClick={() => router.push("/sku/mobile-list")}
        className="mb-4 px-4 py-2 bg-blue-600 rounded-lg"
      >
        ← SKU一覧に戻る
      </button>

      <h1 className="text-2xl font-bold mb-4">{item.sku}</h1>

      {/* タブメニュー */}
      <div className="flex justify-around fixed bottom-0 left-0 right-0 bg-slate-900 p-3 border-t border-slate-700 z-50">
        <button onClick={() => setTab("title")}>📝 商品名</button>
        <button onClick={() => setTab("status")}>📘 ステータス</button>
        <button onClick={() => setTab("upload")}>⬆️ アップロード</button>
        <button onClick={() => setTab("images")}>🖼 画像一覧</button>
      </div>

      {/* 商品名 */}
      {tab === "title" && (
        <div>
          <h2 className="font-bold mb-2">商品名（80文字まで）</h2>
          <textarea
            rows={4}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-3 bg-slate-800 border border-slate-700 rounded"
          />
          <div className="text-right text-gray-400">{title.length}/80</div>

          <button
            onClick={saveTitle}
            className="mt-3 px-4 py-2 bg-blue-600 rounded-lg"
          >
            保存
          </button>
        </div>
      )}

      {/* ステータス */}
      {tab === "status" && (
        <div>
          <h2 className="font-bold mb-2">ステータス変更</h2>

          <select
            value={item.status ?? "none"}
            onChange={(e) => updateStatus(e.target.value as SkuStatus)}
            className="w-full p-3 rounded bg-slate-800 border border-slate-700"
          >
            <option value="shooting">📷 撮影待ち</option>
            <option value="editing">✂️ 編集待ち</option>
            <option value="listing">🛒 出品待ち</option>
            <option value="done">🏁 完了</option>
            <option value="none">未設定</option>
          </select>
        </div>
      )}

      {/* アップロード */}
      {tab === "upload" && (
        <div>
          <h2 className="font-bold mb-3">画像アップロード</h2>

          <select
            value={uploadFolder}
            onChange={(e) => setUploadFolder(e.target.value as FolderType)}
            className="px-3 py-2 rounded bg-slate-800 border border-slate-700 mb-3"
          >
            {FOLDERS.map((f) => (
              <option key={f} value={f}>
                {f.toUpperCase()}
              </option>
            ))}
          </select>

          <input
            type="file"
            multiple
            onChange={(e) => setFiles(e.target.files)}
            className="mb-3"
          />

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="px-4 py-2 bg-green-600 rounded-lg"
          >
            {uploading ? "アップロード中…" : "アップロード"}
          </button>
        </div>
      )}

      {/* 画像一覧 */}
      {tab === "images" && (
        <div>
          <h2 className="font-bold mb-3">画像一覧</h2>

          {FOLDERS.map((folder) => (
            <div key={folder} className="mb-6">
              <h3 className="text-lg mb-2">{folder.toUpperCase()}</h3>

              <div className="grid grid-cols-3 gap-2">
                {images[folder]?.length === 0 && (
                  <p className="text-gray-500 col-span-3">画像なし</p>
                )}

                {images[folder]?.map((img) => (
                  <div key={img.name} className="relative">
                    <img
                      src={img.url}
                      className="w-full h-24 object-cover rounded"
                    />
                    <button
                      onClick={() => deleteImage(folder, img.name)}
                      className="absolute top-1 right-1 bg-red-600 text-xs px-2 py-1 rounded"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
