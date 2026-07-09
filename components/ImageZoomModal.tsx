"use client";

import Image from "next/image";
import { useEffect, useCallback } from "react";

interface ImageZoomModalProps {
  imageUrl: string;
  alt?: string;
  prompt?: string;
  onClose: () => void;
  onDetails?: () => void;
}

export function ImageZoomModal({
  imageUrl,
  alt = "Generated image",
  prompt,
  onClose,
  onDetails,
}: ImageZoomModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
    >
      <div className="flex shrink-0 items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/70 hover:text-white"
        >
          Close (Esc)
        </button>
        {onDetails && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDetails();
            }}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/70 hover:text-white"
          >
            Details
          </button>
        )}
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={imageUrl}
          alt={alt}
          width={4096}
          height={4096}
          className="max-h-full max-w-full object-contain"
          unoptimized
          loading="eager"
          priority
        />
      </div>

      {prompt && (
        <div className="shrink-0 border-t border-white/10 bg-black/50 px-4 py-3">
          <p className="line-clamp-3 text-center text-sm text-white/70">{prompt}</p>
        </div>
      )}
    </div>
  );
}
