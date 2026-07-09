import { NextRequest, NextResponse } from "next/server";
import { getProfile, updateProfile } from "@/lib/services/profile.service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const profile = await getProfile();
    return NextResponse.json(profile);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load profile.";
    console.error("[GET /api/profile]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
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
    const message = error instanceof Error ? error.message : "Failed to update profile.";
    console.error("[PATCH /api/profile]", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
