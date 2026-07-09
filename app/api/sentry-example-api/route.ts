import * as Sentry from "@sentry/nextjs";
import { sentryRoute } from "@/lib/sentry";

export const dynamic = "force-dynamic";

class SentryExampleAPIError extends Error {
  constructor(message: string | undefined) {
    super(message);
    this.name = "SentryExampleAPIError";
  }
}

function getHandler() {
  Sentry.logger.info("Sentry example API called");
  throw new SentryExampleAPIError(
    "This error is raised on the backend called by the example page."
  );
}

export const GET = sentryRoute(getHandler, {
  method: "GET",
  parameterizedRoute: "/api/sentry-example-api",
});
