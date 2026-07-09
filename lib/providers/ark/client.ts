import type { ProviderGenerateRequest, ProviderGenerateResponse } from "@/lib/providers/types";
import { getArkApiKey, getArkBaseUrl } from "./config";
import { buildArkRequestBody } from "./request-builder";

const API_TIMEOUT_MS = 120_000;

export async function generateWithArk(
  request: ProviderGenerateRequest
): Promise<ProviderGenerateResponse> {
  const apiKey = getArkApiKey();
  const baseUrl = getArkBaseUrl();

  const body = buildArkRequestBody(request.model, {
    prompt: request.prompt,
    size: request.size,
    referenceDataUrls: request.referenceDataUrls,
    batchSize: request.batchSize,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
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
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("API request timed out after 120 seconds.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
