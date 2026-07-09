import type { ModelDefinition } from "@/lib/types";

export interface ProviderImageResult {
  url?: string;
  b64_json?: string;
}

export interface ProviderGenerateResponse {
  created: number;
  data: ProviderImageResult[];
}

export interface ProviderGenerateRequest {
  model: ModelDefinition;
  prompt: string;
  size: string;
  referenceDataUrls?: string[];
  batchSize?: number;
}
