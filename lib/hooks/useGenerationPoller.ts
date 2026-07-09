"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { captureClientException } from "@/lib/sentry";
import { createPendingGalleryItems } from "@/lib/studio/pending-gallery";
import { showUserError, showUserSuccess } from "@/lib/toast";
import type { GalleryItem, GenerationResult } from "@/lib/types";

const ACTIVE_KEY = "seedream-active-generations";
const POLL_INTERVAL_MS = 3000;

function readTrackedIds(): string[] {
  try {
    const raw = sessionStorage.getItem(ACTIVE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeTrackedIds(ids: string[]) {
  sessionStorage.setItem(ACTIVE_KEY, JSON.stringify(ids));
}

function galleryItemsFromGeneration(gen: GenerationResult): GalleryItem[] {
  if (gen.status === "pending" || gen.status === "processing") {
    return createPendingGalleryItems({
      id: gen.id,
      prompt: gen.prompt,
      model: gen.model,
      size: gen.size,
      batchSize: gen.batchSize,
      status: gen.status,
      createdAt: gen.createdAt,
    });
  }

  if (gen.status !== "completed" || gen.outputImages.length === 0) {
    return [];
  }

  return gen.outputImages.map((img) => ({
    id: img.id,
    generationId: gen.id,
    prompt: gen.prompt,
    model: gen.model,
    size: gen.size,
    batchSize: gen.batchSize,
    status: gen.status,
    imageUrl: img.url,
    thumbUrl: img.thumbUrl ?? `${img.url}?w=400`,
    createdAt: gen.createdAt,
  }));
}

interface UseGenerationPollerOptions {
  enabled: boolean;
  setGalleryItems: (
    value: GalleryItem[] | ((prev: GalleryItem[]) => GalleryItem[])
  ) => void;
  onBudgetRefresh?: () => void;
}

export function useGenerationPoller({
  enabled,
  setGalleryItems,
  onBudgetRefresh,
}: UseGenerationPollerOptions) {
  const trackedIdsRef = useRef<string[]>(readTrackedIds());
  const notifiedRef = useRef<Set<string>>(new Set());
  const [activeCount, setActiveCount] = useState(trackedIdsRef.current.length);

  const syncActiveCount = useCallback(() => {
    setActiveCount(trackedIdsRef.current.length);
  }, []);

  const trackGeneration = useCallback(
    (id: string) => {
      if (!trackedIdsRef.current.includes(id)) {
        trackedIdsRef.current = [...trackedIdsRef.current, id];
        writeTrackedIds(trackedIdsRef.current);
        syncActiveCount();
      }
    },
    [syncActiveCount]
  );

  const untrackGeneration = useCallback(
    (id: string) => {
      trackedIdsRef.current = trackedIdsRef.current.filter((item) => item !== id);
      writeTrackedIds(trackedIdsRef.current);
      syncActiveCount();
    },
    [syncActiveCount]
  );

  const mergeGenerationIntoGallery = useCallback(
    (gen: GenerationResult) => {
      const items = galleryItemsFromGeneration(gen);
      setGalleryItems((prev) => {
        const withoutGeneration = prev.filter((item) => item.generationId !== gen.id);
        if (items.length === 0) return withoutGeneration;
        const seen = new Set(items.map((item) => item.id));
        return [...items, ...withoutGeneration.filter((item) => !seen.has(item.id))];
      });
    },
    [setGalleryItems]
  );

  const fetchGeneration = useCallback(async (id: string): Promise<GenerationResult | null> => {
    try {
      const res = await fetch(`/api/generations/${id}`);
      const text = await res.text();
      if (!text || !res.ok) return null;
      return JSON.parse(text) as GenerationResult;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    trackedIdsRef.current = readTrackedIds();
    syncActiveCount();

    const poll = async () => {
      try {
        const res = await fetch("/api/generations/active");
        const text = await res.text();
        if (!text || !res.ok) return;

        const data = JSON.parse(text) as { items: GenerationResult[] };
        const activeIds = new Set(data.items.map((gen) => gen.id));

        for (const gen of data.items) {
          trackGeneration(gen.id);
          mergeGenerationIntoGallery(gen);
        }

        setActiveCount(data.items.length);

        const tracked = [...trackedIdsRef.current];
        for (const id of tracked) {
          if (activeIds.has(id)) continue;

          const gen = await fetchGeneration(id);
          if (!gen) {
            untrackGeneration(id);
            continue;
          }

          if (gen.status === "completed") {
            mergeGenerationIntoGallery(gen);
            untrackGeneration(id);
            if (!notifiedRef.current.has(id)) {
              notifiedRef.current.add(id);
              showUserSuccess("Generation complete.");
            }
            onBudgetRefresh?.();
          } else if (gen.status === "failed") {
            setGalleryItems((prev) => prev.filter((item) => item.generationId !== id));
            untrackGeneration(id);
            if (!notifiedRef.current.has(id)) {
              notifiedRef.current.add(id);
              showUserError(gen.error ?? "Generation failed.");
            }
          } else {
            mergeGenerationIntoGallery(gen);
          }
        }
      } catch (err) {
        captureClientException(err, "useGenerationPoller.poll");
      }
    };

    void poll();
    const interval = window.setInterval(() => void poll(), POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [
    enabled,
    fetchGeneration,
    mergeGenerationIntoGallery,
    onBudgetRefresh,
    setGalleryItems,
    syncActiveCount,
    trackGeneration,
    untrackGeneration,
  ]);

  return { trackGeneration, activeCount };
}
