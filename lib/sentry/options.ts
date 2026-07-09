export const SENTRY_DSN =
  process.env.NEXT_PUBLIC_SENTRY_DSN ??
  process.env.SENTRY_DSN ??
  "https://6fff1a2609d72d0661a6e142172c1a2c@o4511663568846848.ingest.us.sentry.io/4511706965606400";

export function getSentryEnvironment(): string {
  return process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development";
}

export function getBaseSentryOptions() {
  return {
    dsn: SENTRY_DSN,
    environment: getSentryEnvironment(),
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1,
    enableLogs: true,
  };
}
