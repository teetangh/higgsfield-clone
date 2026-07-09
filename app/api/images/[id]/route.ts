import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { captureRouteException, sentryRoute } from "@/lib/sentry";
import { readImageFile } from "@/lib/storage";
import sharp from "sharp";

export const runtime = "nodejs";

async function getHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const width = searchParams.get("w");

  try {
    const image = await prisma.image.findUnique({ where: { id } });

    if (!image) {
      return NextResponse.json({ error: "Image not found." }, { status: 404 });
    }

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
      } catch (thumbError) {
        captureRouteException(thumbError, "GET /api/images/[id] thumbnail", 500, {
          imageId: id,
        });
      }
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": image.mimeType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    captureRouteException(error, "GET /api/images/[id]", 404, { imageId: id });
    return NextResponse.json({ error: "Image file not found on disk." }, { status: 404 });
  }
}

export const GET = sentryRoute(getHandler, {
  method: "GET",
  parameterizedRoute: "/api/images/[id]",
});
