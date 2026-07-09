"use client";

import Image from "next/image";
import type { GenerationResult } from "@/lib/types";

interface GenerationDetailPanelProps {
  generation: GenerationResult | null;
  onClose: () => void;
  onReuse: (generation: GenerationResult) => void;
  onRegenerate: (generation: GenerationResult) => void;
  onZoom: (url: string) => void;
}

export function GenerationDetailPanel({
  generation,
  onClose,
  onReuse,
  onRegenerate,
  onZoom,
}: GenerationDetailPanelProps) {
  if (!generation) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-[60] flex w-full max-w-md flex-col border-l border-white/10 bg-neutral-950/95 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-semibold text-white">Generation details</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-white/50 hover:text-white"
          aria-label="Close panel"
        >
          ×
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div>
          <p className="mb-1 text-xs text-white/40">Prompt</p>
          <p className="text-sm text-white/80">{generation.prompt}</p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-white/50">
          <span className="rounded-md bg-white/5 px-2 py-1">{generation.model}</span>
          <span className="rounded-md bg-white/5 px-2 py-1">{generation.size}</span>
          <span className="rounded-md bg-white/5 px-2 py-1">Batch: {generation.batchSize}</span>
          {generation.estimatedCostUsd != null && (
            <span className="rounded-md bg-white/5 px-2 py-1">
              ~${generation.estimatedCostUsd.toFixed(2)}
            </span>
          )}
        </div>

        {generation.referenceImages.length > 0 && (
          <div>
            <p className="mb-2 text-xs text-white/40">References</p>
            <div className="flex flex-wrap gap-2">
              {generation.referenceImages.map((ref) => (
                <button
                  key={ref.id}
                  type="button"
                  onClick={() => onZoom(ref.url)}
                  className="relative h-16 w-16 overflow-hidden rounded-lg border border-white/10"
                >
                  <Image
                    src={ref.thumbUrl ?? ref.url}
                    alt="Reference"
                    fill
                    className="object-cover"
                    unoptimized
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="mb-2 text-xs text-white/40">
            Outputs ({generation.outputImages.length})
          </p>
          <div className="grid grid-cols-2 gap-2">
            {generation.outputImages.map((img) => (
              <button
                key={img.id}
                type="button"
                onClick={() => onZoom(img.url)}
                className="relative aspect-square overflow-hidden rounded-lg border border-white/10"
              >
                <Image
                  src={img.thumbUrl ?? img.url}
                  alt={`Output ${(img.batchIndex ?? 0) + 1}`}
                  fill
                  className="object-cover"
                  unoptimized
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-t border-white/10 p-4">
        <button
          type="button"
          onClick={() => onReuse(generation)}
          className="flex-1 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/70 hover:border-white/20 hover:text-white"
        >
          Reuse settings
        </button>
        <button
          type="button"
          onClick={() => onRegenerate(generation)}
          className="flex-1 rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-black hover:bg-yellow-300"
        >
          Regenerate
        </button>
      </div>
    </div>
  );
}
