import type { ModelKey } from "@/lib/types";

const COST_PER_IMAGE: Record<ModelKey, number> = {
  "seedream-4-5": 0.03,
  "seedream-5-pro": 0.07,
};

const SIZE_MULTIPLIER: Record<string, number> = {
  "2K": 1,
  "3K": 1.2,
  "4K": 1.4,
  "2048x2048": 1,
  "2560x1440": 1.1,
  "1664x2496": 1.1,
  "2848x1600": 1.2,
};

export const ALLOWED_BATCH_SIZES = [1, 2, 4, 8] as const;
export type BatchSize = (typeof ALLOWED_BATCH_SIZES)[number];

export function isValidBatchSize(value: number): value is BatchSize {
  return (ALLOWED_BATCH_SIZES as readonly number[]).includes(value);
}

export function estimatePerImageUsd(model: ModelKey, size: string): number {
  const base = COST_PER_IMAGE[model] ?? 0.05;
  const multiplier = SIZE_MULTIPLIER[size] ?? 1;
  return Math.round(base * multiplier * 100) / 100;
}

export function estimateTotalUsd(
  model: ModelKey,
  size: string,
  batchSize: number
): number {
  const perImage = estimatePerImageUsd(model, size);
  return Math.round(perImage * batchSize * 100) / 100;
}

export function formatCostEstimate(
  model: ModelKey,
  size: string,
  batchSize: number
): string {
  const perImage = estimatePerImageUsd(model, size);
  const total = estimateTotalUsd(model, size, batchSize);
  if (batchSize === 1) {
    return `~$${perImage.toFixed(2)} estimated`;
  }
  return `${batchSize} images × ~$${perImage.toFixed(2)} = ~$${total.toFixed(2)} estimated`;
}
