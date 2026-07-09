"use client";

import Image from "next/image";
import type { ReferenceFile } from "@/lib/types";

interface ReferenceImageStripProps {
  references: ReferenceFile[];
  onAdd: (files: FileList | File[]) => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
  maxImages?: number;
}

export function ReferenceImageStrip({
  references,
  onAdd,
  onRemove,
  disabled,
  maxImages = 10,
}: ReferenceImageStripProps) {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    if (e.dataTransfer.files.length > 0) {
      onAdd(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAdd(e.target.files);
      e.target.value = "";
    }
  };

  return (
    <div
      className="flex items-center gap-2 overflow-x-auto pb-1"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {references.map((ref, index) => (
        <div
          key={ref.previewUrl}
          className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-white/10"
        >
          <Image
            src={ref.previewUrl}
            alt={`Reference ${index + 1}`}
            fill
            className="object-cover"
            unoptimized
          />
          {!disabled && (
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="Remove reference image"
            >
              <span className="text-lg text-white">×</span>
            </button>
          )}
        </div>
      ))}

      {references.length < maxImages && (
        <label
          className={`flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-dashed border-white/20 bg-white/5 text-xl text-white/50 transition-colors hover:border-yellow-400/40 hover:text-yellow-400/80 ${disabled ? "pointer-events-none opacity-50" : ""}`}
        >
          +
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileInput}
            disabled={disabled}
          />
        </label>
      )}

      {references.length === 0 && (
        <span className="text-xs text-white/30">
          Drop reference images here (up to {maxImages})
        </span>
      )}
    </div>
  );
}
