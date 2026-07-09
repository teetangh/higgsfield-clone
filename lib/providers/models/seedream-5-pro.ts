import type { ModelDefinition } from "@/lib/types";

export const seedream5Pro: ModelDefinition = {
  key: "seedream-5-pro",
  label: "Seedream 5.0 Pro",
  provider: "ark",
  providerModelIds: {
    byteplus: "dola-seedream-5-0-pro-260628",
    volcengine: "doubao-seedream-5-0-pro-260628",
  },
  sizes: ["2K", "3K", "2048x2048", "2848x1600", "1664x2496"],
  capabilities: {
    sequentialGeneration: false,
    outputFormat: false,
    streaming: false,
    webSearch: false,
    maxReferenceImages: 10,
  },
};
