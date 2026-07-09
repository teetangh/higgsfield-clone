import { toast } from "sonner";

/** Strip API status prefixes like `[400]` for cleaner toast copy. */
export function formatUserErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/^\[\d+\]\s*/, "").trim() || "Something went wrong.";
}

export function showUserError(error: unknown) {
  toast.error(formatUserErrorMessage(error));
}

export function showUserInfo(message: string) {
  toast.info(message);
}

export function showUserSuccess(message: string) {
  toast.success(message);
}
