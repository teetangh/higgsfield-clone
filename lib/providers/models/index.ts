import type { ModelDefinition, ModelKey } from "@/lib/types";
import { seedream45 } from "./seedream-4-5";
import { seedream5Pro } from "./seedream-5-pro";

const MODEL_REGISTRY: Record<ModelKey, ModelDefinition> = {
  "seedream-5-pro": seedream5Pro,
  "seedream-4-5": seedream45,
};

export function getModel(key: string): ModelDefinition | undefined {
  return MODEL_REGISTRY[key as ModelKey];
}

export function listModels(): ModelDefinition[] {
  return Object.values(MODEL_REGISTRY);
}

export function isValidModel(key: string): key is ModelKey {
  return key in MODEL_REGISTRY;
}

export function getModelKeys(): ModelKey[] {
  return Object.keys(MODEL_REGISTRY) as ModelKey[];
}
