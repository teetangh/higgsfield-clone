import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { captureRouteException, sentryRoute } from "@/lib/sentry";
import { serializeGeneration } from "@/lib/services/generation";

export const runtime = "nodejs";

async function getHandler() {
  try {
    const generations = await prisma.generation.findMany({
      where: { status: { in: ["pending", "processing"] } },
      orderBy: { createdAt: "desc" },
      include: {
        images: { orderBy: [{ type: "asc" }, { batchIndex: "asc" }, { sortOrder: "asc" }] },
      },
    });

    return NextResponse.json({
      items: generations.map((gen) => serializeGeneration(gen)),
    });
  } catch (error) {
    captureRouteException(error, "GET /api/generations/active", 500);
    return NextResponse.json({ error: "Failed to load active generations." }, { status: 500 });
  }
}

export const GET = sentryRoute(getHandler, {
  method: "GET",
  parameterizedRoute: "/api/generations/active",
});
