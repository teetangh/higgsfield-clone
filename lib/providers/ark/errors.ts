export function mapProviderError(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.includes("401") || msg.toLowerCase().includes("unauthorized")) {
      return "Invalid API key. Check your ARK_API_KEY in .env.";
    }
    if (msg.toLowerCase().includes("not activated")) {
      return "Model not activated. Enable models in your BytePlus/Volcengine console.";
    }
    if (msg.toLowerCase().includes("not found")) {
      return `${msg} — Activate the model in your BytePlus ModelArk console.`;
    }
    if (msg.toLowerCase().includes("not valid") || msg.toLowerCase().includes("not supported")) {
      return msg;
    }
    if (msg.toLowerCase().includes("rate limit")) {
      return "Rate limit exceeded. Please wait and try again.";
    }
    return msg;
  }
  return "An unexpected error occurred.";
}
