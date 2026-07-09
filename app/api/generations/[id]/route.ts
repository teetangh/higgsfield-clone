import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { captureRouteException, sentryRoute } from "@/lib/sentry";
import { serializeGeneration } from "@/lib/services/generation";

export const runtime = "nodejs";

async function getHandler(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const generation = await prisma.generation.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: [{ type: "asc" }, { batchIndex: "asc" }, { sortOrder: "asc" }],
        },
      },
    });

    if (!generation) {
      return NextResponse.json({ error: "Generation not found." }, { status: 404 });
    }

    return NextResponse.json(serializeGeneration(generation));
  } catch (error) {
    captureRouteException(error, "GET /api/generations/[id]", 500);
    return NextResponse.json({ error: "Failed to load generation." }, { status: 500 });
  }
}

export const GET = sentryRoute(getHandler, {
  method: "GET",
  parameterizedRoute: "/api/generations/[id]",
});
