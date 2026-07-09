import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { readImageFile } from "@/lib/storage";
import sharp from "sharp";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const width = searchParams.get("w");

  const image = await prisma.image.findUnique({ where: { id } });

  if (!image) {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }

  try {
    let buffer = await readImageFile(
      image.relativePath,
      image.type as "reference" | "output",
      image.generationId
    );

    if (width) {
      const maxWidth = Math.min(parseInt(width, 10) || 400, 1024);
      try {
        buffer = await sharp(buffer)
          .resize(maxWidth, maxWidth, { fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toBuffer();
        return new NextResponse(new Uint8Array(buffer), {
          headers: {
            "Content-Type": "image/jpeg",
            "Cache-Control": "public, max-age=86400",
          },
        });
      } catch {
        // fall through to full image
      }
    }

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
