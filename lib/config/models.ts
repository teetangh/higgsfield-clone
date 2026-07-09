import { listModels } from "@/lib/providers/models";
import type { ModelKey, SizeOption } from "@/lib/types";

export const MODEL_OPTIONS = listModels().map((m) => ({
  key: m.key,
  label: m.label,
}));

export function getSizeOptionsForModel(modelKey: ModelKey): SizeOption[] {
  const model = listModels().find((m) => m.key === modelKey);
  if (!model) return [];
  return model.sizes.map((value) => ({ value, label: value }));
}

export function getDefaultSizeForModel(modelKey: ModelKey): string {
  const options = getSizeOptionsForModel(modelKey);
  return options[0]?.value ?? "2K";
}
