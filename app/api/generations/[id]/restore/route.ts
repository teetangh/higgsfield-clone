import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { captureRouteException, sentryRoute } from "@/lib/sentry";
import type { RestorePayload } from "@/lib/types";

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

    const references = generation.images.filter((img) => img.type === "reference");
    const outputs = generation.images
      .filter((img) => img.type === "output")
      .sort((a, b) => (a.batchIndex ?? 0) - (b.batchIndex ?? 0));

    const payload: RestorePayload = {
      prompt: generation.prompt,
      model: generation.model,
      size: generation.size,
      batchSize: generation.batchSize,
      referenceImages: references.map((img) => ({
        id: img.id,
        url: `/api/images/${img.id}`,
        thumbUrl: `/api/images/${img.id}?w=400`,
      })),
      outputImages: outputs.map((img) => ({
        id: img.id,
        url: `/api/images/${img.id}`,
        thumbUrl: `/api/images/${img.id}?w=400`,
        batchIndex: img.batchIndex,
      })),
    };

    return NextResponse.json(payload);
  } catch (error) {
    captureRouteException(error, "GET /api/generations/[id]/restore", 500);
    return NextResponse.json({ error: "Failed to restore generation." }, { status: 500 });
  }
}

export const GET = sentryRoute(getHandler, {
  method: "GET",
  parameterizedRoute: "/api/generations/[id]/restore",
});
