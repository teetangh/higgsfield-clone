import type { ModelDefinition, ModelKey } from "@/lib/types";
import {
  getSeedreamModel,
  isSeedreamModel,
  listSeedreamModels,
} from "./seedream";

export function getModel(key: string): ModelDefinition | undefined {
  return getSeedreamModel(key);
}

export function listModels(): ModelDefinition[] {
  return listSeedreamModels();
}

export function isValidModel(key: string): key is ModelKey {
  return isSeedreamModel(key);
}

export function getModelKeys(): ModelKey[] {
  return listSeedreamModels().map((m) => m.key);
}
