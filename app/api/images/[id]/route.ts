import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { readStoredFile } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const image = await prisma.image.findUnique({ where: { id } });

  if (!image) {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }

  try {
    const buffer = await readStoredFile(
      image.type === "output" ? "output" : "reference",
      image.filename
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": image.mimeType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Image file not found on disk." }, { status: 404 });
  }
}
