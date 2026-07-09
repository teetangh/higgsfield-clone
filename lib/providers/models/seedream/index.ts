import type { ModelDefinition, ModelKey } from "@/lib/types";
import { seedream45 } from "./seedream-4-5";
import { seedream5Pro } from "./seedream-5-pro";

const SEEDREAM_MODELS: Record<string, ModelDefinition> = {
  "seedream-5-pro": seedream5Pro,
  "seedream-4-5": seedream45,
};

export function getSeedreamModel(key: string): ModelDefinition | undefined {
  return SEEDREAM_MODELS[key];
}

export function listSeedreamModels(): ModelDefinition[] {
  return Object.values(SEEDREAM_MODELS);
}

export function isSeedreamModel(key: string): key is ModelKey {
  return key in SEEDREAM_MODELS;
}

export { seedream45, seedream5Pro };
