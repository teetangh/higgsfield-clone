import { wrapRouteHandlerWithSentry } from "@sentry/nextjs";

type RouteHandlerContext = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
  parameterizedRoute: string;
};

export function sentryRoute<F extends (...args: any[]) => any>(
  handler: F,
  context: RouteHandlerContext
): F {
  return wrapRouteHandlerWithSentry(handler, context) as F;
}
