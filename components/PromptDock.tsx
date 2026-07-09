"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ModelSelector } from "@/components/ModelSelector";
import { ReferenceImageStrip } from "@/components/ReferenceImageStrip";
import {
  ALLOWED_BATCH_SIZES,
  formatCostEstimate,
} from "@/lib/services/cost-estimator";
import type { ReferenceFile, ModelKey } from "@/lib/types";

interface PromptDockProps {
  prompt: string;
  model: ModelKey;
  size: string;
  batchSize: number;
  references: ReferenceFile[];
  isLoading: boolean;
  elapsedSeconds: number;
  remainingBudgetUsd: number | null;
  onPromptChange: (prompt: string) => void;
  onModelChange: (model: ModelKey) => void;
  onSizeChange: (size: string) => void;
  onBatchSizeChange: (batchSize: number) => void;
  onReferencesChange: (refs: ReferenceFile[]) => void;
  onGenerate: (confirmBatch?: boolean) => void;
  onCancel?: () => void;
}

export function PromptDock({
  prompt,
  model,
  size,
  batchSize,
  references,
  isLoading,
  elapsedSeconds,
  remainingBudgetUsd,
  onPromptChange,
  onModelChange,
  onSizeChange,
  onBatchSizeChange,
  onReferencesChange,
  onGenerate,
  onCancel,
}: PromptDockProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const costLabel = formatCostEstimate(model, size, batchSize);

  const handleAddReferences = useCallback(
    (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      const remaining = 10 - references.length;
      const toAdd = files.slice(0, remaining).map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      onReferencesChange([...references, ...toAdd]);
    },
    [references, onReferencesChange]
  );

  const handleRemoveReference = useCallback(
    (index: number) => {
      const removed = references[index];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      onReferencesChange(references.filter((_, i) => i !== index));
    },
    [references, onReferencesChange]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !isLoading) {
        e.preventDefault();
        onGenerate();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isLoading, onGenerate]);

  const generateLabel = isLoading
    ? elapsedSeconds > 0
      ? `Generating… ${elapsedSeconds}s`
      : "Generating…"
    : "Generate";

  return (
    <div className="shrink-0 space-y-3 rounded-2xl border border-white/10 bg-neutral-950/80 p-4 backdrop-blur-sm">
      {isLoading && (
        <p className="text-xs text-yellow-400/70">
          Seedream can take 30–120s per request{batchSize > 1 ? ` (${batchSize} images)` : ""}.
          Larger sizes and batches take longer.
        </p>
      )}

      <ReferenceImageStrip
        references={references}
        onAdd={handleAddReferences}
        onRemove={handleRemoveReference}
        disabled={isLoading}
      />

      <div className="flex gap-3">
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="Describe your image..."
          disabled={isLoading}
          rows={3}
          className="flex-1 resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-yellow-400/40 disabled:opacity-50"
        />
        <div className="flex shrink-0 flex-col gap-2 self-end">
          <button
            type="button"
            onClick={() => onGenerate()}
            disabled={isLoading || !prompt.trim()}
            className="rounded-xl bg-yellow-400 px-6 py-3 text-sm font-semibold text-black transition-opacity hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {generateLabel}
          </button>
          {isLoading && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-white/10 px-6 py-2 text-xs text-white/60 hover:text-white"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <ModelSelector
            model={model}
            size={size}
            onModelChange={onModelChange}
            onSizeChange={onSizeChange}
            disabled={isLoading}
          />
          <select
            value={batchSize}
            onChange={(e) => onBatchSizeChange(parseInt(e.target.value, 10))}
            disabled={isLoading}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white outline-none focus:border-yellow-400/50 disabled:opacity-50"
            aria-label="Batch size"
          >
            {ALLOWED_BATCH_SIZES.map((n) => (
              <option key={n} value={n} className="bg-neutral-900">
                Batch {n}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col items-end gap-0.5 text-xs text-white/40">
          <span>Est. cost: {costLabel}</span>
          {remainingBudgetUsd != null && (
            <span>Budget: ${remainingBudgetUsd.toFixed(2)} remaining</span>
          )}
          <span className="text-white/25">⌘ + Enter to generate</span>
        </div>
      </div>
    </div>
  );
}
