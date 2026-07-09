"use client";

import { useCallback, useEffect, useRef } from "react";
import { ModelSelector } from "@/components/ModelSelector";
import { ReferenceImageStrip } from "@/components/ReferenceImageStrip";
import type { ReferenceFile, ModelKey } from "@/lib/types";

interface PromptDockProps {
  prompt: string;
  model: ModelKey;
  size: string;
  references: ReferenceFile[];
  isLoading: boolean;
  onPromptChange: (prompt: string) => void;
  onModelChange: (model: ModelKey) => void;
  onSizeChange: (size: string) => void;
  onReferencesChange: (refs: ReferenceFile[]) => void;
  onGenerate: () => void;
}

export function PromptDock({
  prompt,
  model,
  size,
  references,
  isLoading,
  onPromptChange,
  onModelChange,
  onSizeChange,
  onReferencesChange,
  onGenerate,
}: PromptDockProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  return (
    <div className="shrink-0 space-y-3 rounded-2xl border border-white/10 bg-neutral-950/80 p-4 backdrop-blur-sm">
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
        <button
          type="button"
          onClick={onGenerate}
          disabled={isLoading || !prompt.trim()}
          className="shrink-0 self-end rounded-xl bg-yellow-400 px-6 py-3 text-sm font-semibold text-black transition-opacity hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isLoading ? "Generating..." : "Generate"}
        </button>
      </div>

      <div className="flex items-center justify-between">
        <ModelSelector
          model={model}
          size={size}
          onModelChange={onModelChange}
          onSizeChange={onSizeChange}
          disabled={isLoading}
        />
        <span className="text-xs text-white/25">⌘ + Enter to generate</span>
      </div>
    </div>
  );
}
