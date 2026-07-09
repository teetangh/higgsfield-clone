"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import type { GalleryItem } from "@/lib/types";

interface GalleryGridProps {
  items: GalleryItem[];
  hasMore: boolean;
  isLoading: boolean;
  gridColumns: number;
  onLoadMore: () => void;
  onPreview: (item: GalleryItem) => void;
  onDetails: (item: GalleryItem) => void;
}

const COLUMN_CLASSES: Record<number, string> = {
  2: "columns-2",
  3: "columns-3",
  4: "columns-4",
  5: "columns-5",
  6: "columns-6",
};

export function GalleryGrid({
  items,
  hasMore,
  isLoading,
  gridColumns,
  onLoadMore,
  onPreview,
  onDetails,
}: GalleryGridProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const columnClass = COLUMN_CLASSES[gridColumns] ?? "columns-4";

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
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4">
      <div className={`${columnClass} gap-3`}>
        {items.map((item) => (
          <div
            key={item.id}
            className="mb-3 break-inside-avoid"
            style={{ contentVisibility: "auto", containIntrinsicSize: "0 200px" }}
          >
            <div className="group relative w-full overflow-hidden rounded-xl border border-white/5 bg-white/5 transition-colors hover:border-yellow-400/30">
              <button
                type="button"
                onClick={() => onPreview(item)}
                className="block w-full"
                aria-label={`Preview: ${item.prompt}`}
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
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDetails(item);
                }}
                className="absolute right-2 top-2 rounded-md bg-black/60 px-2 py-1 text-[10px] text-white/80 opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
                aria-label="View generation details"
              >
                Details
              </button>

              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                <p className="line-clamp-2 text-left text-[10px] text-white/80">{item.prompt}</p>
                {item.batchSize > 1 && (
                  <span className="text-[10px] text-yellow-400/80">{item.batchSize} images</span>
                )}
              </div>
            </div>
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
