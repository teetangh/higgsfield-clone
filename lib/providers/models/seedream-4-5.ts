import type { ModelDefinition } from "@/lib/types";

export const seedream45: ModelDefinition = {
  key: "seedream-4-5",
  label: "Seedream 4.5",
  provider: "ark",
  providerModelIds: {
    byteplus: "seedream-4-5-251128",
    volcengine: "doubao-seedream-4-5-251128",
  },
  sizes: ["2K", "4K", "2048x2048", "2560x1440", "1664x2496"],
  capabilities: {
    sequentialGeneration: true,
    outputFormat: false,
    streaming: true,
    webSearch: false,
    maxReferenceImages: 10,
  },
};
