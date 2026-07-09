import { listModels } from "@/lib/providers/models";
import {
  getGroupedSizeOptionsForModel,
  getPixelArea,
} from "@/lib/studio/size";
import type { ModelKey, SizeOption, SizeOptionGroup } from "@/lib/types";

export const MODEL_OPTIONS = listModels().map((m) => ({
  key: m.key,
  label: m.label,
}));

export function getSizeOptionsForModel(modelKey: ModelKey): SizeOption[] {
  return getGroupedSizeOptionsForModel(modelKey).flatMap((group) => group.options);
}

export function getSizeOptionGroupsForModel(modelKey: ModelKey): SizeOptionGroup[] {
  return getGroupedSizeOptionsForModel(modelKey);
}

export function getDefaultSizeForModel(modelKey: ModelKey): string {
  const options = getSizeOptionsForModel(modelKey);
  const sorted = [...options].sort(
    (a, b) => getPixelArea(b.value) - getPixelArea(a.value)
  );
  return sorted[0]?.value ?? options[0]?.value ?? "2K";
}
