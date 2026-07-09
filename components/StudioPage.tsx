"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GalleryGrid } from "@/components/GalleryGrid";
import { GenerationDetailPanel } from "@/components/GenerationDetailPanel";
import { ImageZoomModal } from "@/components/ImageZoomModal";
import { PromptDock } from "@/components/PromptDock";
import { TopNav } from "@/components/TopNav";
import { getDefaultSizeForModel } from "@/lib/config/models";
import type {
  GalleryItem,
  GenerationResult,
  ReferenceFile,
  RestorePayload,
  ModelKey,
} from "@/lib/types";

async function urlToReferenceFile(url: string, index: number): Promise<ReferenceFile> {
  const res = await fetch(url);
  const blob = await res.blob();
  const ext = blob.type.split("/")[1] ?? "png";
  const file = new File([blob], `reference-${index + 1}.${ext}`, { type: blob.type });
  return { file, previewUrl: URL.createObjectURL(file) };
}

export function StudioPage() {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<ModelKey>("seedream-5-pro");
  const [size, setSize] = useState("2K");
  const [batchSize, setBatchSize] = useState(1);
  const [references, setReferences] = useState<ReferenceFile[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingBudgetUsd, setRemainingBudgetUsd] = useState<number | null>(null);

  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingGallery, setIsLoadingGallery] = useState(false);

  const [selectedGeneration, setSelectedGeneration] = useState<GenerationResult | null>(null);
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const loadGallery = useCallback(async (cursor?: string | null, append = false) => {
    setIsLoadingGallery(true);
    try {
      const params = new URLSearchParams({ limit: "20", view: "gallery" });
      if (cursor) params.set("cursor", cursor);

      const res = await fetch(`/api/generations?${params}`);
      const data = await res.json();
      if (!res.ok) return;

      setGalleryItems((prev) => (append ? [...prev, ...data.items] : data.items));
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } finally {
      setIsLoadingGallery(false);
    }
  }, []);

  const loadBudget = useCallback(async () => {
    try {
      const res = await fetch("/api/profile/usage");
      const text = await res.text();
      if (!text) return;
      const data = JSON.parse(text);
      if (res.ok) {
        setRemainingBudgetUsd(data.usage.remainingBudgetUsd);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadGallery();
    loadBudget();
  }, [loadGallery, loadBudget]);

  useEffect(() => {
    return () => {
      references.forEach((r) => URL.revokeObjectURL(r.previewUrl));
      abortRef.current?.abort();
    };
  }, [references]);

  const handleModelChange = useCallback((newModel: ModelKey) => {
    setModel(newModel);
    setSize(getDefaultSizeForModel(newModel));
  }, []);

  const applyRestore = useCallback(async (payload: RestorePayload) => {
    setPrompt(payload.prompt);
    setModel(payload.model as ModelKey);
    setSize(payload.size);
    setBatchSize(payload.batchSize);

    references.forEach((r) => URL.revokeObjectURL(r.previewUrl));

    const restoredRefs = await Promise.all(
      payload.referenceImages.map((img, i) => urlToReferenceFile(img.url, i))
    );
    setReferences(restoredRefs);
  }, [references]);

  const handleSelectItem = useCallback(async (item: GalleryItem) => {
    try {
      const res = await fetch(`/api/generations/${item.generationId}`);
      const data = await res.json();
      if (res.ok) setSelectedGeneration(data);
    } catch {
      // ignore
    }
  }, []);

  const handleGenerate = useCallback(
    async (confirmBatch = false, overrides?: RestorePayload) => {
      const activePrompt = overrides?.prompt ?? prompt;
      const activeModel = (overrides?.model ?? model) as ModelKey;
      const activeSize = overrides?.size ?? size;
      const activeBatchSize = overrides?.batchSize ?? batchSize;
      const activeReferences = overrides
        ? await Promise.all(
            overrides.referenceImages.map((img, i) => urlToReferenceFile(img.url, i))
          )
        : references;

      if (!activePrompt.trim() || isGenerating) return;

      setIsGenerating(true);
      setError(null);
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      try {
        const formData = new FormData();
        formData.append("prompt", activePrompt.trim());
        formData.append("model", activeModel);
        formData.append("size", activeSize);
        formData.append("batchSize", String(activeBatchSize));
        if (confirmBatch) formData.append("confirmBatch", "true");
        for (const ref of activeReferences) {
          formData.append("references", ref.file);
        }

        const response = await fetch("/api/generate", {
          method: "POST",
          body: formData,
          signal: abortRef.current.signal,
        });

        const data = await response.json();

        if (response.status === 409 && data.error === "confirmation_required") {
          const ok = window.confirm(data.message);
          if (ok) {
            await handleGenerate(true, overrides);
          }
          return;
        }

        if (!response.ok) {
          throw new Error(data.error ?? "Generation failed.");
        }

        if (overrides) {
          await applyRestore(overrides);
        }

        await loadGallery();
        await loadBudget();
        setSelectedGeneration(null);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Generation failed.");
      } finally {
        setIsGenerating(false);
        if (overrides) {
          activeReferences.forEach((r) => URL.revokeObjectURL(r.previewUrl));
        }
      }
    },
    [prompt, model, size, batchSize, references, isGenerating, loadGallery, loadBudget, applyRestore]
  );

  const handleReuse = useCallback(
    async (generation: GenerationResult) => {
      try {
        const res = await fetch(`/api/generations/${generation.id}/restore`);
        const data: RestorePayload = await res.json();
        if (res.ok) {
          await applyRestore(data);
          setSelectedGeneration(null);
        }
      } catch {
        setError("Failed to restore settings.");
      }
    },
    [applyRestore]
  );

  const handleRegenerate = useCallback(
    async (generation: GenerationResult) => {
      try {
        const res = await fetch(`/api/generations/${generation.id}/restore`);
        const data: RestorePayload = await res.json();
        if (res.ok) {
          setSelectedGeneration(null);
          await handleGenerate(false, data);
        }
      } catch {
        setError("Failed to regenerate.");
      }
    },
    [handleGenerate]
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a] text-white">
      <TopNav />

      <main className="flex flex-1 flex-col overflow-hidden">
        {error && (
          <div className="mx-4 mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <ErrorBoundary>
          <GalleryGrid
            items={galleryItems}
            hasMore={hasMore}
            isLoading={isLoadingGallery}
            onLoadMore={() => {
              if (nextCursor && !isLoadingGallery) loadGallery(nextCursor, true);
            }}
            onSelect={handleSelectItem}
            onZoom={(item) => setZoomUrl(item.imageUrl)}
          />
        </ErrorBoundary>

        <div className="shrink-0 p-4 pt-0">
          <PromptDock
            prompt={prompt}
            model={model}
            size={size}
            batchSize={batchSize}
            references={references}
            isLoading={isGenerating}
            remainingBudgetUsd={remainingBudgetUsd}
            onPromptChange={setPrompt}
            onModelChange={handleModelChange}
            onSizeChange={setSize}
            onBatchSizeChange={setBatchSize}
            onReferencesChange={setReferences}
            onGenerate={handleGenerate}
          />
        </div>
      </main>

      {selectedGeneration && (
        <GenerationDetailPanel
          generation={selectedGeneration}
          onClose={() => setSelectedGeneration(null)}
          onReuse={handleReuse}
          onRegenerate={handleRegenerate}
          onZoom={setZoomUrl}
        />
      )}

      {zoomUrl && (
        <ImageZoomModal imageUrl={zoomUrl} onClose={() => setZoomUrl(null)} />
      )}
    </div>
  );
}
