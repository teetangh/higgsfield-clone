"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GalleryItem } from "@/lib/types";

interface GalleryGridProps {
  items: GalleryItem[];
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  onSelect: (item: GalleryItem) => void;
  onZoom: (item: GalleryItem) => void;
}

export function GalleryGrid({
  items,
  hasMore,
  isLoading,
  onLoadMore,
  onSelect,
  onZoom,
}: GalleryGridProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isLoading) {
          onLoadMore();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isLoading, onLoadMore]);

  if (items.length === 0 && !isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-20 text-center">
        <p className="text-sm text-white/40">No generations yet</p>
        <p className="text-xs text-white/25">Enter a prompt below to create your first image</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-4">
      <div className="columns-2 gap-3 sm:columns-3 lg:columns-4 xl:columns-5">
        {items.map((item) => (
          <div
            key={item.id}
            className="mb-3 break-inside-avoid"
            style={{ contentVisibility: "auto", containIntrinsicSize: "0 200px" }}
          >
            <button
              type="button"
              onClick={() => onSelect(item)}
              onDoubleClick={() => onZoom(item)}
              className="group relative w-full overflow-hidden rounded-xl border border-white/5 bg-white/5 transition-colors hover:border-yellow-400/30"
            >
              <Image
                src={item.thumbUrl}
                alt={item.prompt}
                width={400}
                height={400}
                className="h-auto w-full object-cover"
                unoptimized
                loading="lazy"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                <p className="line-clamp-2 text-left text-[10px] text-white/80">{item.prompt}</p>
                {item.batchSize > 1 && (
                  <span className="text-[10px] text-yellow-400/80">{item.batchSize} images</span>
                )}
              </div>
            </button>
          </div>
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center py-6">
          <span className="text-xs text-white/30">Loading...</span>
        </div>
      )}

      {hasMore && <div ref={sentinelRef} className="h-4" />}
    </div>
  );
}
