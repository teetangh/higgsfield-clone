"use client";

import Image from "next/image";
import { showConfirmToast } from "@/lib/toast";
import type { GenerationResult } from "@/lib/types";

interface GenerationDetailPanelProps {
  generation: GenerationResult | null;
  onClose: () => void;
  onReuse: (generation: GenerationResult) => void;
  onRegenerate: (generation: GenerationResult) => void;
  onDelete: (generation: GenerationResult) => void;
  onZoom: (url: string) => void;
  isDeleting?: boolean;
}

function OutputThumbnail({
  src,
  alt,
  onClick,
}: {
  src: string;
  alt: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative w-full overflow-hidden rounded-lg border border-white/10 bg-white/5"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="block h-auto w-full" loading="lazy" />
    </button>
  );
}

export function GenerationDetailPanel({
  generation,
  onClose,
  onReuse,
  onRegenerate,
  onDelete,
  onZoom,
  isDeleting = false,
}: GenerationDetailPanelProps) {
  if (!generation) return null;

  const handleDelete = () => {
    showConfirmToast(
      "Delete this generation permanently? This removes all output and reference images for this run.",
      {
        confirmLabel: "Delete",
        cancelLabel: "Keep",
        onConfirm: () => onDelete(generation),
      }
    );
  };

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
              <OutputThumbnail
                key={img.id}
                src={img.thumbUrl ?? img.url}
                alt={`Output ${(img.batchIndex ?? 0) + 1}`}
                onClick={() => onZoom(img.url)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3 border-t border-white/10 p-4">
        <div className="space-y-1 text-xs text-white/40">
          <p>
            <span className="text-white/60">Reuse settings</span> loads prompt, model, size,
            batch, and references into the dock without generating.
          </p>
          <p>
            <span className="text-white/60">Regenerate</span> does the same, then immediately
            runs a new generation with those settings.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onReuse(generation)}
            disabled={isDeleting}
            className="flex-1 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/70 hover:border-white/20 hover:text-white disabled:opacity-50"
          >
            Reuse settings
          </button>
          <button
            type="button"
            onClick={() => onRegenerate(generation)}
            disabled={isDeleting}
            className="flex-1 rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-black hover:bg-yellow-300 disabled:opacity-50"
          >
            Regenerate
          </button>
        </div>

        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="w-full rounded-xl border border-red-500/20 px-4 py-2.5 text-sm text-red-300 hover:border-red-500/40 hover:bg-red-500/10 disabled:opacity-50"
        >
          {isDeleting ? "Deleting..." : "Delete generation"}
        </button>
      </div>
    </div>
  );
}
