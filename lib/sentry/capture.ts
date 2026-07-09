import * as Sentry from "@sentry/nextjs";

export type SentryContext = Record<string, unknown>;

export function isExpectedUserError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("Prompt is required") ||
    message.includes("Invalid model") ||
    message.includes("Batch size must be") ||
    message.includes("Budget") ||
    message.includes("exceed") ||
    message.includes("sensitive information") ||
    message.includes("confirmation_required") ||
    message.includes("Generation cancelled") ||
    message.includes("Maximum") ||
    message.includes("must be images")
  );
}

export function captureException(
  error: unknown,
  context?: SentryContext
): void {
  if (isExpectedUserError(error)) return;

  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext("details", context);
    }

    if (error instanceof Error) {
      Sentry.captureException(error);
      return;
    }

    Sentry.captureMessage(typeof error === "string" ? error : "Unknown error", "error");
  });
}

/** Capture server/API errors. Skips routine 4xx validation responses. */
export function captureRouteException(
  error: unknown,
  route: string,
  status?: number,
  extra?: SentryContext
): void {
  if (isExpectedUserError(error)) return;
  if (status != null && status >= 400 && status < 500) {
    return;
  }

  captureException(error, { route, status, ...extra });
}

/** Capture client-side errors from React components and fetch handlers. */
export function captureClientException(
  error: unknown,
  source: string,
  extra?: SentryContext
): void {
  if (isExpectedUserError(error)) return;
  captureException(error, { source, runtime: "browser", ...extra });
}
