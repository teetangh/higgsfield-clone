import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { serializeGeneration } from "@/lib/services/generation";
import type { RestorePayload } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
}
