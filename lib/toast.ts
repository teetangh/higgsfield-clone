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

interface ConfirmToastOptions {
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

export function showConfirmToast(message: string, options: ConfirmToastOptions) {
  toast(message, {
    duration: 15000,
    action: {
      label: options.confirmLabel ?? "Confirm",
      onClick: () => {
        void options.onConfirm();
      },
    },
    cancel: {
      label: options.cancelLabel ?? "Cancel",
      onClick: () => {
        options.onCancel?.();
      },
    },
  });
}
