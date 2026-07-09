import { listModels } from "@/lib/providers/models";
import type { ModelKey, SizeOption } from "@/lib/types";

const NAMED_SIZES: Record<string, { width: number; height: number }> = {
  "2K": { width: 2048, height: 2048 },
  "3K": { width: 3072, height: 3072 },
  "4K": { width: 4096, height: 4096 },
};

export interface SizeDimensions {
  width: number;
  height: number;
}

export interface SizeOptionGroup {
  label: string;
  options: SizeOption[];
}

export function parseSizeDimensions(size: string): SizeDimensions | null {
  const match = size.match(/^(\d+)x(\d+)$/i);
  if (match) {
    return { width: parseInt(match[1], 10), height: parseInt(match[2], 10) };
  }
  return NAMED_SIZES[size] ?? null;
}

export function getPixelArea(size: string): number {
  const dims = parseSizeDimensions(size);
  return dims ? dims.width * dims.height : 0;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const temp = y;
    y = x % y;
    x = temp;
  }
  return x;
}

function simplifyRatio(width: number, height: number): string {
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
}

export function getAspectRatioLabel(size: string): string {
  const dims = parseSizeDimensions(size);
  if (!dims) return "Other";

  const { width, height } = dims;
  const ratio = width / height;

  if (Math.abs(ratio - 1) < 0.02) return "1:1 Square";

  const simplified = simplifyRatio(width, height);

  if (Math.abs(ratio - 16 / 9) < 0.04 || simplified === "16:9") {
    return "16:9 Landscape";
  }
  if (Math.abs(ratio - 9 / 16) < 0.04 || simplified === "9:16") {
    return "9:16 Portrait";
  }
  if (Math.abs(ratio - 3 / 2) < 0.04 || simplified === "3:2") {
    return "3:2 Landscape";
  }
  if (Math.abs(ratio - 2 / 3) < 0.04 || simplified === "2:3") {
    return "2:3 Portrait";
  }
  if (Math.abs(ratio - 4 / 3) < 0.04 || simplified === "4:3") {
    return "4:3 Landscape";
  }
  if (Math.abs(ratio - 3 / 4) < 0.04 || simplified === "3:4") {
    return "3:4 Portrait";
  }
  if (ratio > 2) return "21:9 Ultrawide";

  return ratio >= 1 ? `${simplified} Landscape` : `${simplified} Portrait`;
}

const GROUP_ORDER = [
  "1:1 Square",
  "16:9 Landscape",
  "3:2 Landscape",
  "4:3 Landscape",
  "21:9 Ultrawide",
  "9:16 Portrait",
  "2:3 Portrait",
  "3:4 Portrait",
];

function groupSortIndex(label: string): number {
  const index = GROUP_ORDER.indexOf(label);
  return index === -1 ? GROUP_ORDER.length : index;
}

export function getGroupedSizeOptionsForModel(modelKey: ModelKey): SizeOptionGroup[] {
  const model = listModels().find((m) => m.key === modelKey);
  if (!model) return [];

  const groups = new Map<string, SizeOption[]>();

  for (const value of model.sizes) {
    const label = getAspectRatioLabel(value);
    const options = groups.get(label) ?? [];
    options.push({ value, label: value });
    groups.set(label, options);
  }

  return Array.from(groups.entries())
    .map(([label, options]) => ({
      label,
      options: options.sort((a, b) => getPixelArea(b.value) - getPixelArea(a.value)),
    }))
    .sort((a, b) => {
      const orderDiff = groupSortIndex(a.label) - groupSortIndex(b.label);
      if (orderDiff !== 0) return orderDiff;
      const maxA = Math.max(...a.options.map((o) => getPixelArea(o.value)));
      const maxB = Math.max(...b.options.map((o) => getPixelArea(o.value)));
      return maxB - maxA;
    });
}

export function getGalleryImageDimensions(size: string): SizeDimensions {
  return parseSizeDimensions(size) ?? { width: 1, height: 1 };
}
