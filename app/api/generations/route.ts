import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { serializeGeneration } from "@/lib/services/generation";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;

  const [generations, total] = await Promise.all([
    prisma.generation.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        images: { orderBy: { sortOrder: "asc" } },
      },
    }),
    prisma.generation.count(),
  ]);

  const items = generations.map((gen) =>
    serializeGeneration(gen, (id) => `/api/images/${id}`)
  );

  return NextResponse.json({
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
