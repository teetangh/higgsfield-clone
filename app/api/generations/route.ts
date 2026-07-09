import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { captureRouteException, sentryRoute } from "@/lib/sentry";
import { serializeGeneration, toGalleryItem } from "@/lib/services/generation";

export const runtime = "nodejs";

async function getHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const view = searchParams.get("view");

    const generations = await prisma.generation.findMany({
      where: cursor ? { createdAt: { lt: await getCursorDate(cursor) } } : undefined,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      include: {
        images: { orderBy: [{ type: "asc" }, { batchIndex: "asc" }, { sortOrder: "asc" }] },
      },
    });

    const hasMore = generations.length > limit;
    const page = hasMore ? generations.slice(0, limit) : generations;
    const nextCursor = hasMore ? page[page.length - 1]?.id ?? null : null;

    if (view === "gallery") {
      const items = page
        .map((gen) => toGalleryItem(gen))
        .filter((item): item is NonNullable<typeof item> => item !== null);

      return NextResponse.json({ items, nextCursor, hasMore });
    }

    const items = page.map((gen) => serializeGeneration(gen));

    return NextResponse.json({ items, nextCursor, hasMore });
  } catch (error) {
    captureRouteException(error, "GET /api/generations", 500);
    return NextResponse.json({ error: "Failed to load generations." }, { status: 500 });
  }
}

async function getCursorDate(cursorId: string): Promise<Date> {
  const gen = await prisma.generation.findUnique({
    where: { id: cursorId },
    select: { createdAt: true },
  });
  return gen?.createdAt ?? new Date();
}

export const GET = sentryRoute(getHandler, {
  method: "GET",
  parameterizedRoute: "/api/generations",
});
