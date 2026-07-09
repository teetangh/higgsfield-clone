import type { GalleryItem } from "@/lib/types";

export function formatElapsedTime(createdAt: string): string {
  const elapsed = Math.max(
    0,
    Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000)
  );
  if (elapsed < 60) return `${elapsed}s`;
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

export function createPendingGalleryItems(data: {
  id: string;
  prompt: string;
  model: string;
  size: string;
  batchSize: number;
  status: string;
  createdAt: string;
}): GalleryItem[] {
  const count = Math.max(1, data.batchSize);
  return Array.from({ length: count }, (_, index) => ({
    id: `pending-${data.id}-${index}`,
    generationId: data.id,
    prompt: data.prompt,
    model: data.model,
    size: data.size,
    batchSize: data.batchSize,
    status: data.status,
    imageUrl: "",
    thumbUrl: "",
    isPending: true,
    pendingIndex: index,
    createdAt: data.createdAt,
  }));
}
