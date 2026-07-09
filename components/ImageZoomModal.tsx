"use client";

import Image from "next/image";
import { useEffect, useCallback } from "react";

interface ImageZoomModalProps {
  imageUrl: string;
  alt?: string;
  onClose: () => void;
}

export function ImageZoomModal({ imageUrl, alt = "Generated image", onClose }: ImageZoomModalProps) {
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Image zoom"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/70 hover:text-white"
      >
        Esc to close
      </button>
      <div
        className="relative max-h-[90vh] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={imageUrl}
          alt={alt}
          width={2048}
          height={2048}
          className="max-h-[90vh] w-auto object-contain"
          unoptimized
          loading="eager"
        />
      </div>
    </div>
  );
}
