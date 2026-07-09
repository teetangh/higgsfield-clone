export type ModelKey = "seedream-5-pro" | "seedream-4-5";

export type ArkProvider = "byteplus" | "volcengine";

export interface ModelCapabilities {
  sequentialGeneration: boolean;
  outputFormat: boolean;
  streaming: boolean;
  webSearch: boolean;
  maxReferenceImages: number;
}

export interface ModelDefinition {
  key: ModelKey;
  label: string;
  provider: "ark";
  providerModelIds: Record<ArkProvider, string>;
  sizes: string[];
  capabilities: ModelCapabilities;
}

export interface SizeOption {
  value: string;
  label: string;
}
