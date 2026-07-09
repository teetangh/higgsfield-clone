import * as Sentry from "@sentry/nextjs";

export type SentryContext = Record<string, unknown>;

export function captureException(
  error: unknown,
  context?: SentryContext
): void {
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
  captureException(error, { source, runtime: "browser", ...extra });
}
