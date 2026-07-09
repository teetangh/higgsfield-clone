"use client";

import {
  getSizeOptionGroupsForModel,
  MODEL_OPTIONS,
} from "@/lib/config/models";
import type { ModelKey } from "@/lib/types";

interface ModelSelectorProps {
  model: ModelKey;
  size: string;
  onModelChange: (model: ModelKey) => void;
  onSizeChange: (size: string) => void;
  disabled?: boolean;
}

export function ModelSelector({
  model,
  size,
  onModelChange,
  onSizeChange,
  disabled,
}: ModelSelectorProps) {
  const sizeGroups = getSizeOptionGroupsForModel(model);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={model}
        onChange={(e) => onModelChange(e.target.value as ModelKey)}
        disabled={disabled}
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white outline-none focus:border-yellow-400/50 disabled:opacity-50"
      >
        {MODEL_OPTIONS.map((opt) => (
          <option key={opt.key} value={opt.key} className="bg-neutral-900">
            {opt.label}
          </option>
        ))}
      </select>

      <select
        value={size}
        onChange={(e) => onSizeChange(e.target.value)}
        disabled={disabled}
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white outline-none focus:border-yellow-400/50 disabled:opacity-50"
      >
        {sizeGroups.map((group) => (
          <optgroup key={group.label} label={group.label} className="bg-neutral-900">
            {group.options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-neutral-900">
                {opt.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
