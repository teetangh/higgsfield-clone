import { generateWithArk } from "@/lib/providers/ark/client";
import { getArkProvider } from "@/lib/providers/ark/config";
import { mapProviderError } from "@/lib/providers/ark/errors";
import { getModel } from "@/lib/providers/models";
import type { ModelKey } from "@/lib/types";
import type { ProviderGenerateResponse } from "./types";

export { getArkProvider, mapProviderError };
export { getModel, listModels, isValidModel } from "@/lib/providers/models";

export interface GenerateImageParams {
  modelKey: ModelKey;
  prompt: string;
  size: string;
  referenceImages?: Buffer[];
  referenceMimeTypes?: string[];
}

function bufferToDataUrl(buffer: Buffer, mimeType: string): string {
  const base64 = buffer.toString("base64");
  return `data:${mimeType.toLowerCase()};base64,${base64}`;
}

export async function generateImage(
  params: GenerateImageParams
): Promise<ProviderGenerateResponse> {
  const model = getModel(params.modelKey);
  if (!model) {
    throw new Error(`Unknown model: ${params.modelKey}`);
  }

  const referenceDataUrls =
    params.referenceImages && params.referenceImages.length > 0
      ? params.referenceImages.map((buf, i) =>
          bufferToDataUrl(buf, params.referenceMimeTypes?.[i] ?? "image/png")
        )
      : undefined;

  return generateWithArk({
    model,
    prompt: params.prompt,
    size: params.size,
    referenceDataUrls,
  });
}
