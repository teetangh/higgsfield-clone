import type { ArkProvider } from "@/lib/types";

const DEFAULT_BASE_URLS: Record<ArkProvider, string> = {
  byteplus: "https://ark.ap-southeast.bytepluses.com/api/v3",
  volcengine: "https://ark.cn-beijing.volces.com/api/v3",
};

export function getArkProvider(): ArkProvider {
  const provider = process.env.ARK_PROVIDER?.toLowerCase();
  if (provider === "volcengine") return "volcengine";
  return "byteplus";
}

export function getArkApiKey(): string {
  const key = process.env.ARK_API_KEY;
  if (!key) {
    throw new Error("ARK_API_KEY is not configured. Add it to your .env file.");
  }
  return key;
}

export function getArkBaseUrl(): string {
  if (process.env.ARK_BASE_URL) {
    return process.env.ARK_BASE_URL.replace(/\/$/, "");
  }
  return DEFAULT_BASE_URLS[getArkProvider()];
}
