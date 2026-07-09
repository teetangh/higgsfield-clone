import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { isValidModel } from "@/lib/providers";
import { captureRouteException, sentryRoute } from "@/lib/sentry";
import {
  isValidBatchSize,
  estimateTotalUsd,
} from "@/lib/services/cost-estimator";
import {
  MAX_FILE_SIZE_BYTES,
  processGenerationJob,
  startGeneration,
} from "@/lib/services/generation";
import { MAX_REFERENCE_IMAGES, MAX_TOTAL_IMAGES } from "@/lib/storage";
import type { ModelKey } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

async function postHandler(request: NextRequest) {
  try {
    const formData = await request.formData();
    const prompt = (formData.get("prompt") as string | null)?.trim();
    const model = formData.get("model") as string | null;
    const size = (formData.get("size") as string | null) ?? "2K";
    const batchSizeRaw = parseInt((formData.get("batchSize") as string | null) ?? "1", 10);
    const confirmBatch = formData.get("confirmBatch") === "true";

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    if (!model || !isValidModel(model)) {
      return NextResponse.json({ error: "Invalid model selected." }, { status: 400 });
    }

    if (!isValidBatchSize(batchSizeRaw)) {
      return NextResponse.json(
        { error: "Batch size must be 1, 2, 4, or 8." },
        { status: 400 }
      );
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

    if (refFiles.length + batchSizeRaw > MAX_TOTAL_IMAGES) {
      return NextResponse.json(
        {
          error: `References (${refFiles.length}) + batch (${batchSizeRaw}) cannot exceed ${MAX_TOTAL_IMAGES}.`,
        },
        { status: 400 }
      );
    }

    const estimatedCost = estimateTotalUsd(model as ModelKey, size, batchSizeRaw);
    if (batchSizeRaw >= 4 && !confirmBatch) {
      return NextResponse.json(
        {
          error: "confirmation_required",
          message: `This will cost ~$${estimatedCost.toFixed(2)}. Continue?`,
          estimatedCostUsd: estimatedCost,
        },
        { status: 409 }
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
        originalName: file.name,
      }))
    );

    const started = await startGeneration({
      prompt,
      model,
      size,
      batchSize: batchSizeRaw,
      references,
    });

    after(async () => {
      await processGenerationJob(started.id);
    });

    return NextResponse.json(
      {
        id: started.id,
        prompt,
        model,
        size,
        batchSize: batchSizeRaw,
        status: started.status,
        accepted: true,
        createdAt: started.createdAt.toISOString(),
      },
      { status: 202 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed.";
    const status =
      message.includes("Invalid") ||
      message.includes("required") ||
      message.includes("exceed") ||
      message.includes("Budget") ||
      message.includes("sensitive information")
        ? 400
        : 502;

    captureRouteException(error, "POST /api/generate", status);

    return NextResponse.json({ error: message }, { status });
  }
}

export const POST = sentryRoute(postHandler, {
  method: "POST",
  parameterizedRoute: "/api/generate",
});
