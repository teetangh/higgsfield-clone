import { NextRequest, NextResponse } from "next/server";
import { captureRouteException, sentryRoute } from "@/lib/sentry";
import { getProfile, updateProfile } from "@/lib/services/profile.service";

export const runtime = "nodejs";

async function getHandler() {
  try {
    const profile = await getProfile();
    return NextResponse.json(profile);
  } catch (error) {
    captureRouteException(error, "GET /api/profile", 500);
    const message = error instanceof Error ? error.message : "Failed to load profile.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function patchHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const profile = await updateProfile({
      displayName: body.displayName,
      billingMode: body.billingMode,
      manualBalanceUsd: body.manualBalanceUsd,
      budgetLimitUsd: body.budgetLimitUsd,
      budgetAlertPercent: body.budgetAlertPercent,
    });
    return NextResponse.json(profile);
  } catch (error) {
    captureRouteException(error, "PATCH /api/profile", 400);
    const message = error instanceof Error ? error.message : "Failed to update profile.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export const GET = sentryRoute(getHandler, {
  method: "GET",
  parameterizedRoute: "/api/profile",
});

export const PATCH = sentryRoute(patchHandler, {
  method: "PATCH",
  parameterizedRoute: "/api/profile",
});
