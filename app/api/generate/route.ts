import { NextRequest, NextResponse } from "next/server";
import { isValidModel } from "@/lib/providers";
import {
  MAX_FILE_SIZE_BYTES,
  runGeneration,
} from "@/lib/services/generation";
import { MAX_REFERENCE_IMAGES } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const prompt = (formData.get("prompt") as string | null)?.trim();
    const model = formData.get("model") as string | null;
    const size = (formData.get("size") as string | null) ?? "2K";

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    if (!model || !isValidModel(model)) {
      return NextResponse.json({ error: "Invalid model selected." }, { status: 400 });
    }

    const refFiles = formData.getAll("references").filter(
      (item): item is File => item instanceof File && item.size > 0
    );

    if (refFiles.length > MAX_REFERENCE_IMAGES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_REFERENCE_IMAGES} reference images allowed.` },
        { status: 400 }
      );
    }

    for (const file of refFiles) {
      if (!file.type.startsWith("image/")) {
        return NextResponse.json(
          { error: "All reference files must be images." },
          { status: 400 }
        );
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: "Each reference image must be under 30MB." },
          { status: 400 }
        );
      }
    }

    const references = await Promise.all(
      refFiles.map(async (file) => ({
        buffer: Buffer.from(await file.arrayBuffer()),
        mimeType: file.type,
      }))
    );

    const result = await runGeneration({
      prompt,
      model,
      size,
      references,
    });

    return NextResponse.json({
      ...result,
      createdAt: result.createdAt.toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed.";
    const status = message.includes("Invalid") || message.includes("required") ? 400 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
