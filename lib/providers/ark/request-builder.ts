import type { ModelDefinition } from "@/lib/types";
import { getArkProvider } from "./config";

/**
 * Builds request bodies per official BytePlus/Volcengine parameter matrix.
 * @see https://docs.byteplus.com/en/docs/ModelArk/1541523
 * @see https://docs.cloudsway.net/maasapi/api-reference/image/seedream/
 */
export interface ArkImageRequestBody {
  model: string;
  prompt: string;
  size?: string;
  image?: string | string[];
  response_format?: "url" | "b64_json";
  watermark?: boolean;
  sequential_image_generation?: "auto" | "disabled";
  sequential_image_generation_options?: { max_images: number };
  stream?: boolean;
  output_format?: "jpeg" | "png";
}

export function buildArkRequestBody(
  model: ModelDefinition,
  params: {
    prompt: string;
    size: string;
    referenceDataUrls?: string[];
  }
): ArkImageRequestBody {
  const provider = getArkProvider();
  const providerModelId = model.providerModelIds[provider];

  const body: ArkImageRequestBody = {
    model: providerModelId,
    prompt: params.prompt,
    size: params.size,
    response_format: "url",
    watermark: false,
  };

  if (params.referenceDataUrls && params.referenceDataUrls.length > 0) {
    body.image =
      params.referenceDataUrls.length === 1
        ? params.referenceDataUrls[0]
        : params.referenceDataUrls;
  }

  if (model.capabilities.sequentialGeneration) {
    body.sequential_image_generation = "disabled";
  }

  if (model.capabilities.streaming) {
    body.stream = false;
  }

  return body;
}
