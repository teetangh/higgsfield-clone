import { NextResponse } from "next/server";
import { captureRouteException, sentryRoute } from "@/lib/sentry";
import { getProfile, getUsageStats } from "@/lib/services/profile.service";

export const runtime = "nodejs";

async function getHandler() {
  try {
    const [profile, usage] = await Promise.all([getProfile(), getUsageStats()]);
    return NextResponse.json({ profile, usage });
  } catch (error) {
    captureRouteException(error, "GET /api/profile/usage", 500);
    const message = error instanceof Error ? error.message : "Failed to load profile usage.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const GET = sentryRoute(getHandler, {
  method: "GET",
  parameterizedRoute: "/api/profile/usage",
});
