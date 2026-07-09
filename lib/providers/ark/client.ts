import type { ProviderGenerateRequest, ProviderGenerateResponse } from "@/lib/providers/types";
import { getArkApiKey, getArkBaseUrl } from "./config";
import { buildArkRequestBody } from "./request-builder";

export async function generateWithArk(
  request: ProviderGenerateRequest
): Promise<ProviderGenerateResponse> {
  const apiKey = getArkApiKey();
  const baseUrl = getArkBaseUrl();

  const body = buildArkRequestBody(request.model, {
    prompt: request.prompt,
    size: request.size,
    referenceDataUrls: request.referenceDataUrls,
  });

  const response = await fetch(`${baseUrl}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const responseText = await response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    throw new Error(`Invalid API response: ${responseText.slice(0, 200)}`);
  }

  if (!response.ok) {
    const errorBody = parsed as { error?: { message?: string }; message?: string };
    const message =
      errorBody.error?.message ??
      errorBody.message ??
      `API request failed (${response.status})`;
    throw new Error(`[${response.status}] ${message}`);
  }

  return parsed as ProviderGenerateResponse;
}
