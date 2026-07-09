"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [pasteFlash, setPasteFlash] = useState<"in" | "out" | null>(null);

  const triggerPasteFlash = useCallback(() => {
    setPasteFlash("in");
    window.setTimeout(() => setPasteFlash("out"), 700);
    window.setTimeout(() => setPasteFlash(null), 1100);
  }, []);

  const handlePaste = useCallback(
    (event: ClipboardEvent) => {
      if (disabled || references.length >= maxImages) return;

      const items = event.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (!item.type.startsWith("image/")) continue;

        const file = item.getAsFile();
        if (!file) continue;

        event.preventDefault();
        const ext = file.type.split("/")[1] ?? "png";
        const namedFile = new File([file], `pasted-${Date.now()}.${ext}`, {
          type: file.type,
        });
        onAdd([namedFile]);
        triggerPasteFlash();
        break;
      }
    },
    [disabled, maxImages, onAdd, references.length, triggerPasteFlash]
  );

  useEffect(() => {
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

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
      ref={containerRef}
      tabIndex={0}
      className="relative flex items-center gap-2 overflow-x-auto rounded-xl pb-1 outline-none focus-visible:ring-1 focus-visible:ring-yellow-400/40"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {pasteFlash && (
        <div
          className={`pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl border border-yellow-400/30 bg-yellow-400/10 backdrop-blur-[2px] ${
            pasteFlash === "in" ? "animate-paste-flash-in" : "animate-paste-flash-out"
          }`}
        >
          <span className="rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-yellow-300">
            Image pasted
          </span>
        </div>
      )}

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
          Paste, drop, or add reference images (up to {maxImages})
        </span>
      )}
    </div>
  );
}
