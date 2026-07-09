import { NextResponse } from "next/server";
import { getProfile, getUsageStats } from "@/lib/services/profile.service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const [profile, usage] = await Promise.all([getProfile(), getUsageStats()]);
    return NextResponse.json({ profile, usage });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load profile usage.";
    console.error("[GET /api/profile/usage]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
