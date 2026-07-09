"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GalleryGrid } from "@/components/GalleryGrid";
import { GenerationDetailPanel } from "@/components/GenerationDetailPanel";
import { ImageZoomModal } from "@/components/ImageZoomModal";
import { PromptDock } from "@/components/PromptDock";
import { TopNav } from "@/components/TopNav";
import { useStudio } from "@/components/StudioProvider";
import { useGenerationPoller } from "@/lib/hooks/useGenerationPoller";
import { getDefaultSizeForModel } from "@/lib/config/models";
import { createPendingGalleryItems } from "@/lib/studio/pending-gallery";
import { captureClientException } from "@/lib/sentry";
import { showConfirmToast, showUserError, showUserInfo, showUserSuccess } from "@/lib/toast";
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
  const studio = useStudio();
  const {
    prompt,
    setPrompt,
    model,
    setModel,
    size,
    setSize,
    batchSize,
    setBatchSize,
    references,
    setReferences,
    gridColumns,
    galleryItems,
    setGalleryItems,
    selectedGeneration,
    setSelectedGeneration,
    selectedGenerationId,
    setSelectedGenerationId,
    hydrated,
  } = studio;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [remainingBudgetUsd, setRemainingBudgetUsd] = useState<number | null>(null);

  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingGallery, setIsLoadingGallery] = useState(false);

  const [previewItem, setPreviewItem] = useState<GalleryItem | null>(null);
  const [isDeletingGeneration, setIsDeletingGeneration] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const galleryInitializedRef = useRef(false);

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

  const { trackGeneration, activeCount } = useGenerationPoller({
    enabled: hydrated,
    setGalleryItems,
    onBudgetRefresh: loadBudget,
  });

  const loadGallery = useCallback(
    async (cursor?: string | null, append = false) => {
      setIsLoadingGallery(true);
      try {
        const params = new URLSearchParams({ limit: "20", view: "gallery" });
        if (cursor) params.set("cursor", cursor);

        const res = await fetch(`/api/generations?${params}`);
        const text = await res.text();
        if (!text || !res.ok) return;

        const data = JSON.parse(text);
        setGalleryItems((prev) => {
          if (append) return [...prev, ...data.items];
          if (prev.length === 0) return data.items;
          const seen = new Set(data.items.map((item: GalleryItem) => item.id));
          const extras = prev.filter((item) => !seen.has(item.id));
          return [...data.items, ...extras];
        });
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
      } catch (err) {
        captureClientException(err, "StudioPage.loadGallery");
      } finally {
        setIsLoadingGallery(false);
      }
    },
    [setGalleryItems]
  );

  const loadGenerationById = useCallback(
    async (id: string): Promise<GenerationResult | null> => {
      try {
        const res = await fetch(`/api/generations/${id}`);
        const text = await res.text();
        if (!text || !res.ok) return null;
        return JSON.parse(text) as GenerationResult;
      } catch {
        return null;
      }
    },
    []
  );

  useEffect(() => {
    if (!hydrated) return;
    void loadBudget();
    if (galleryInitializedRef.current) return;
    galleryInitializedRef.current = true;
    if (galleryItems.length === 0) {
      void loadGallery();
    }
  }, [hydrated, loadGallery, loadBudget, galleryItems.length]);

  useEffect(() => {
    if (!selectedGenerationId || selectedGeneration) return;
    void loadGenerationById(selectedGenerationId).then((gen) => {
      if (gen) setSelectedGeneration(gen);
    });
  }, [selectedGenerationId, selectedGeneration, loadGenerationById, setSelectedGeneration]);

  const handleModelChange = useCallback(
    (newModel: ModelKey) => {
      setModel(newModel);
      setSize(getDefaultSizeForModel(newModel));
    },
    [setModel, setSize]
  );

  const applyRestore = useCallback(
    async (payload: RestorePayload) => {
      setPrompt(payload.prompt);
      setModel(payload.model as ModelKey);
      setSize(payload.size);
      setBatchSize(payload.batchSize);

      references.forEach((r) => URL.revokeObjectURL(r.previewUrl));

      const restoredRefs = await Promise.all(
        payload.referenceImages.map((img, i) => urlToReferenceFile(img.url, i))
      );
      setReferences(restoredRefs);
    },
    [references, setPrompt, setModel, setSize, setBatchSize, setReferences]
  );

  const handleImageClick = useCallback(
    async (item: GalleryItem) => {
      setPreviewItem(item);
      const gen = await loadGenerationById(item.generationId);
      if (gen) {
        setSelectedGeneration(gen);
        setSelectedGenerationId(item.generationId);
      }
    },
    [loadGenerationById, setSelectedGeneration, setSelectedGenerationId]
  );

  const handleClosePreview = useCallback(() => {
    setPreviewItem(null);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setSelectedGeneration(null);
    setSelectedGenerationId(null);
  }, [setSelectedGeneration, setSelectedGenerationId]);

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

      if (!activePrompt.trim() || isSubmitting) return;

      setIsSubmitting(true);
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

        const text = await response.text();
        const data = text ? JSON.parse(text) : {};

        if (response.status === 409 && data.error === "confirmation_required") {
          showConfirmToast(data.message, {
            confirmLabel: "Continue",
            cancelLabel: "Cancel",
            onConfirm: () => {
              void handleGenerate(true, overrides);
            },
          });
          return;
        }

        if (!response.ok) {
          throw new Error(data.error ?? "Generation failed.");
        }

        const placeholders = createPendingGalleryItems(data);
        setGalleryItems((prev) => [
          ...placeholders,
          ...prev.filter((item) => item.generationId !== data.id),
        ]);
        trackGeneration(data.id);
        showUserInfo("Generation started in the background.");

        if (overrides) {
          await applyRestore(overrides);
        }

        handleCloseDetails();
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        captureClientException(err, "StudioPage.handleGenerate");
        showUserError(err);
      } finally {
        setIsSubmitting(false);
        if (overrides) {
          activeReferences.forEach((r) => URL.revokeObjectURL(r.previewUrl));
        }
      }
    },
    [
      prompt,
      model,
      size,
      batchSize,
      references,
      isSubmitting,
      applyRestore,
      setGalleryItems,
      handleCloseDetails,
      trackGeneration,
    ]
  );

  const handleReuse = useCallback(
    async (generation: GenerationResult) => {
      try {
        const res = await fetch(`/api/generations/${generation.id}/restore`);
        const text = await res.text();
        if (!text || !res.ok) return;
        const data: RestorePayload = JSON.parse(text);
        await applyRestore(data);
        handleCloseDetails();
        setPreviewItem(null);
      } catch (err) {
        captureClientException(err, "StudioPage.handleReuse");
        showUserError("Failed to restore settings.");
      }
    },
    [applyRestore, handleCloseDetails]
  );

  const handleRegenerate = useCallback(
    async (generation: GenerationResult) => {
      try {
        const res = await fetch(`/api/generations/${generation.id}/restore`);
        const text = await res.text();
        if (!text || !res.ok) return;
        const data: RestorePayload = JSON.parse(text);
        handleCloseDetails();
        setPreviewItem(null);
        await handleGenerate(false, data);
      } catch (err) {
        captureClientException(err, "StudioPage.handleRegenerate");
        showUserError("Failed to regenerate.");
      }
    },
    [handleGenerate, handleCloseDetails]
  );

  const handleDelete = useCallback(
    async (generation: GenerationResult) => {
      setIsDeletingGeneration(true);
      try {
        const res = await fetch(`/api/generations/${generation.id}`, { method: "DELETE" });
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        if (!res.ok) {
          throw new Error(data.error ?? "Failed to delete generation.");
        }

        setGalleryItems((prev) =>
          prev.filter((item) => item.generationId !== generation.id)
        );
        handleCloseDetails();
        setPreviewItem((current) =>
          current?.generationId === generation.id ? null : current
        );
        showUserSuccess("Generation deleted.");
      } catch (err) {
        captureClientException(err, "StudioPage.handleDelete");
        showUserError(err);
      } finally {
        setIsDeletingGeneration(false);
      }
    },
    [setGalleryItems, handleCloseDetails]
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#0a0a0a] text-white">
      <TopNav />

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ErrorBoundary>
          <GalleryGrid
            items={galleryItems}
            hasMore={hasMore}
            isLoading={isLoadingGallery}
            gridColumns={gridColumns}
            onLoadMore={() => {
              if (nextCursor && !isLoadingGallery) loadGallery(nextCursor, true);
            }}
            onImageClick={handleImageClick}
          />
        </ErrorBoundary>
      </main>

      <div className="shrink-0 border-t border-white/10 bg-[#0a0a0a]/95 p-4 backdrop-blur-sm">
        <PromptDock
          prompt={prompt}
          model={model}
          size={size}
          batchSize={batchSize}
          references={references}
          isSubmitting={isSubmitting}
          activeJobCount={activeCount}
          remainingBudgetUsd={remainingBudgetUsd}
          onPromptChange={setPrompt}
          onModelChange={handleModelChange}
          onSizeChange={setSize}
          onBatchSizeChange={setBatchSize}
          onReferencesChange={setReferences}
          onGenerate={handleGenerate}
        />
      </div>

      {selectedGeneration && (
        <GenerationDetailPanel
          generation={selectedGeneration}
          onClose={handleCloseDetails}
          onReuse={handleReuse}
          onRegenerate={handleRegenerate}
          onDelete={handleDelete}
          isDeleting={isDeletingGeneration}
          onZoom={(url) => {
            const item = galleryItems.find((g) => g.imageUrl === url || g.thumbUrl === url);
            if (item) setPreviewItem(item);
          }}
        />
      )}

      {previewItem && (
        <ImageZoomModal
          imageUrl={previewItem.imageUrl}
          alt={previewItem.prompt}
          prompt={previewItem.prompt}
          detailsPanelOpen={!!selectedGeneration}
          onClose={handleClosePreview}
          onDetails={() => {
            void handleImageClick(previewItem);
          }}
        />
      )}
    </div>
  );
}
