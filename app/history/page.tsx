"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { TopNav } from "@/components/TopNav";
import { MODEL_OPTIONS } from "@/lib/config/models";
import type { GenerationResult } from "@/lib/types";

export default function HistoryPage() {
  const [items, setItems] = useState<GenerationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<GenerationResult | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/generations?limit=50");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load history.");
        if (!cancelled) setItems(data.items);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load history.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const fetchHistory = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const modelLabel = (key: string) =>
    MODEL_OPTIONS.find((m) => m.key === key)?.label ?? key;

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a] text-white">
      <TopNav />

      <main className="flex flex-1 gap-6 p-6">
        <div className="flex w-full flex-col gap-4 lg:w-2/3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-medium text-white/90">Generation History</h1>
            <button
              type="button"
              onClick={fetchHistory}
              className="text-xs text-white/40 hover:text-white/70"
            >
              Refresh
            </button>
          </div>

          {loading && (
            <p className="text-sm text-white/40">Loading history...</p>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          {!loading && !error && items.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <p className="text-sm text-white/40">No generations yet.</p>
              <Link
                href="/"
                className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-medium text-black hover:bg-yellow-300"
              >
                Create your first image
              </Link>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelected(item)}
                className={`group overflow-hidden rounded-xl border text-left transition-colors ${
                  selected?.id === item.id
                    ? "border-yellow-400/50"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                <div className="relative aspect-square bg-black/40">
                  {item.outputImage ? (
                    <Image
                      src={item.outputImage.url}
                      alt={item.prompt}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center p-2">
                      <span className="text-xs text-red-400/80">
                        {item.status === "failed" ? "Failed" : "No output"}
                      </span>
                    </div>
                  )}
                  {item.status === "failed" && item.outputImage && (
                    <div className="absolute inset-0 bg-red-900/20" />
                  )}
                </div>
                <div className="space-y-1 p-2">
                  <p className="line-clamp-2 text-xs text-white/60">{item.prompt}</p>
                  <p className="text-[10px] text-white/30">
                    {modelLabel(item.model)} · {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {selected && (
          <aside className="hidden w-1/3 shrink-0 flex-col gap-4 rounded-2xl border border-white/10 bg-neutral-950/60 p-4 lg:flex">
            <h2 className="text-sm font-medium text-white/80">Details</h2>

            {selected.outputImage && (
              <div className="relative aspect-square overflow-hidden rounded-xl border border-white/10">
                <Image
                  src={selected.outputImage.url}
                  alt={selected.prompt}
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            )}

            <div className="space-y-2 text-sm">
              <p className="text-white/70">{selected.prompt}</p>
              <p className="text-xs text-white/40">
                {modelLabel(selected.model)} · {selected.size} · {selected.status}
              </p>
              {selected.error && (
                <p className="text-xs text-red-400">{selected.error}</p>
              )}
            </div>

            {selected.referenceImages.length > 0 && (
              <div>
                <p className="mb-2 text-xs text-white/40">
                  Reference images ({selected.referenceImages.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {selected.referenceImages.map((ref) => (
                    <div
                      key={ref.id}
                      className="relative h-12 w-12 overflow-hidden rounded-lg border border-white/10"
                    >
                      <Image
                        src={ref.url}
                        alt="Reference"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Link
                href={`/?restore=${selected.id}`}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:text-white"
              >
                Open in editor
              </Link>
              {selected.outputImage && (
                <a
                  href={selected.outputImage.url}
                  download
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:text-white"
                >
                  Download
                </a>
              )}
            </div>
          </aside>
        )}
      </main>
    </div>
  );
}
