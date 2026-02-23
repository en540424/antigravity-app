"use client";

import React, { useEffect, useState, useRef } from "react";

import { WorkflowButtonComponent } from "@/components/WorkflowButton";
import { HistoryItem } from "@/components/HistoryItem";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { CompletionModal } from "@/components/CompletionModal";

import { WORKFLOW_BUTTONS } from "@/domain/media/workflow-ui";
import { LocalAsset, WorkflowKind } from "@/domain/media/types";

import {
  saveLocalAsset,
  listLocalAssets,
  deleteLocalAsset,
} from "@/lib/indexeddb/localAssets";

import { callRemoveBg, callMergePdf } from "@/lib/api/client";

export default function WorkflowsPage() {
  const [history, setHistory] = useState<LocalAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] =
    useState<WorkflowKind | null>(null);
  const [completedAsset, setCompletedAsset] =
    useState<LocalAsset | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  const pngInputRef = useRef<HTMLInputElement>(null);
  const jpgInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const assets = await listLocalAssets(10);
    setHistory(assets);
  };

  const generateLocalId = () =>
    `asset_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const handleRemoveBgPng = async (file: File) => {
    setLoading(true);
    setSelectedWorkflow("REMOVE_BG_TO_PNG");

    try {
      const res = await callRemoveBg("png", file);

      if (res.status === "completed") {
        const asset: LocalAsset = {
          local_id: generateLocalId(),
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          kind: "image",
          mime: "image/png",
          name: file.name.replace(/\.[^.]+$/, "") + "_transparent.png",
          size: file.size,
          blob: new Blob([]),
          workflow: "REMOVE_BG_TO_PNG",
        };

        await saveLocalAsset(asset);
        setCompletedAsset(asset);
        setShowCompletionModal(true);
        await loadHistory();
      }
    } finally {
      setLoading(false);
      setSelectedWorkflow(null);
    }
  };

  const handleRemoveBgJpg = async (file: File) => {
    setLoading(true);
    setSelectedWorkflow("REMOVE_BG_TO_WHITE_JPG");

    try {
      const res = await callRemoveBg("jpg", file);

      if (res.status === "completed") {
        const asset: LocalAsset = {
          local_id: generateLocalId(),
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          kind: "image",
          mime: "image/jpeg",
          name: file.name.replace(/\.[^.]+$/, "") + "_white.jpg",
          size: file.size,
          blob: new Blob([]),
          workflow: "REMOVE_BG_TO_WHITE_JPG",
        };

        await saveLocalAsset(asset);
        setCompletedAsset(asset);
        setShowCompletionModal(true);
        await loadHistory();
      }
    } finally {
      setLoading(false);
      setSelectedWorkflow(null);
    }
  };

  const handleMergePdf = async (files: File[]) => {
    if (!files.length) return;

    setLoading(true);
    setSelectedWorkflow("MERGE_TO_PDF");

    try {
      const res = await callMergePdf(files);

      if (res.status === "completed") {
        const asset: LocalAsset = {
          local_id: generateLocalId(),
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          kind: "pdf",
          mime: "application/pdf",
          name: `merged_${Date.now()}.pdf`,
          blob: new Blob([]),
          workflow: "MERGE_TO_PDF",
          source_local_ids: [],
        };

        await saveLocalAsset(asset);
        setCompletedAsset(asset);
        setShowCompletionModal(true);
        await loadHistory();
      }
    } finally {
      setLoading(false);
      setSelectedWorkflow(null);
    }
  };

  const handleWorkflowSelect = (kind: WorkflowKind) => {
    setSelectedWorkflow(kind);

    if (kind === "REMOVE_BG_TO_PNG") pngInputRef.current?.click();
    if (kind === "REMOVE_BG_TO_WHITE_JPG") jpgInputRef.current?.click();
    if (kind === "MERGE_TO_PDF") pdfInputRef.current?.click();
  };

  const handleDelete = async (asset: LocalAsset) => {
    await deleteLocalAsset(asset.local_id);
    await loadHistory();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0">
        <div className="max-w-lg mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold">役員ツール</h1>
          <p className="text-sm text-gray-500">写真・PDFを素早く加工</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {loading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner message="処理中…" />
          </div>
        ) : (
          <>
            <section className="space-y-3 mb-8">
              {WORKFLOW_BUTTONS.map((b) => (
                <WorkflowButtonComponent
                  key={b.kind}
                  button={b}
                  onSelect={() => handleWorkflowSelect(b.kind)}
                />
              ))}
            </section>

            {history.length > 0 && (
              <section>
                <h2 className="font-bold mb-4">最近の加工履歴</h2>
                <div className="space-y-3">
                  {history.map((a) => (
                    <HistoryItem
                      key={a.local_id}
                      asset={a}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* hidden inputs */}
      <input
        ref={pngInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.currentTarget.value = "";
          if (f) handleRemoveBgPng(f);
        }}
      />

      <input
        ref={jpgInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.currentTarget.value = "";
          if (f) handleRemoveBgJpg(f);
        }}
      />

      <input
        ref={pdfInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          e.currentTarget.value = "";
          handleMergePdf(files);
        }}
      />

      <CompletionModal
        isOpen={showCompletionModal}
        asset={completedAsset}
        onClose={() => {
          setShowCompletionModal(false);
          setCompletedAsset(null);
        }}
        onShare={() => {}}
      />
    </div>
  );
}
