import { prisma } from "@/lib/db/client";
import {
  generateImage,
  getArkProvider,
  isValidModel,
  mapProviderError,
} from "@/lib/providers";
import { captureException } from "@/lib/sentry";
import { estimateTotalUsd } from "@/lib/services/cost-estimator";
import { checkBudgetAllowed, logUsage } from "@/lib/services/profile.service";
import {
  downloadImageToStorage,
  MAX_FILE_SIZE_BYTES,
  MAX_TOTAL_IMAGES,
  saveOutput,
  saveReference,
} from "@/lib/storage";
import type {
  GalleryItem,
  GenerateImageInput,
  GenerateImageOutput,
  GenerationResult,
  SettingsSnapshot,
} from "@/lib/types";
import type { ModelKey } from "@/lib/types";

function imageUrl(id: string, thumb = false): string {
  return thumb ? `/api/images/${id}?w=400` : `/api/images/${id}`;
}

export function serializeGeneration(
  gen: {
    id: string;
    prompt: string;
    model: string;
    size: string;
    batchSize: number;
    status: string;
    error: string | null;
    estimatedCostUsd: number | null;
    createdAt: Date;
    images: Array<{ id: string; type: string; batchIndex: number | null }>;
  }
): GenerationResult {
  const outputs = gen.images
    .filter((img) => img.type === "output")
    .sort((a, b) => (a.batchIndex ?? 0) - (b.batchIndex ?? 0));
  const references = gen.images.filter((img) => img.type === "reference");
  const primaryOutput = outputs[0] ?? null;

  return {
    id: gen.id,
    prompt: gen.prompt,
    model: gen.model,
    size: gen.size,
    batchSize: gen.batchSize,
    status: gen.status,
    error: gen.error,
    estimatedCostUsd: gen.estimatedCostUsd,
    createdAt: gen.createdAt.toISOString(),
    outputImage: primaryOutput
      ? { id: primaryOutput.id, url: imageUrl(primaryOutput.id), batchIndex: primaryOutput.batchIndex }
      : null,
    outputImages: outputs.map((img) => ({
      id: img.id,
      url: imageUrl(img.id),
      thumbUrl: imageUrl(img.id, true),
      batchIndex: img.batchIndex,
    })),
    referenceImages: references.map((img) => ({
      id: img.id,
      url: imageUrl(img.id),
      thumbUrl: imageUrl(img.id, true),
    })),
  };
}

export function toGalleryItem(
  gen: {
    id: string;
    prompt: string;
    model: string;
    size: string;
    batchSize: number;
    status: string;
    createdAt: Date;
    images: Array<{ id: string; type: string; batchIndex: number | null }>;
  }
): GalleryItem | null {
  const output = gen.images
    .filter((img) => img.type === "output")
    .sort((a, b) => (a.batchIndex ?? 0) - (b.batchIndex ?? 0))[0];

  if (!output) return null;

  return {
    id: output.id,
    generationId: gen.id,
    prompt: gen.prompt,
    model: gen.model,
    size: gen.size,
    batchSize: gen.batchSize,
    status: gen.status,
    imageUrl: imageUrl(output.id),
    thumbUrl: imageUrl(output.id, true),
    createdAt: gen.createdAt.toISOString(),
  };
}

export async function runGeneration(
  input: GenerateImageInput
): Promise<GenerateImageOutput> {
  if (!isValidModel(input.model)) {
    throw new Error("Invalid model selected.");
  }

  if (input.references.length + input.batchSize > MAX_TOTAL_IMAGES) {
    throw new Error(
      `Reference images (${input.references.length}) + batch size (${input.batchSize}) cannot exceed ${MAX_TOTAL_IMAGES}.`
    );
  }

  const modelKey = input.model as ModelKey;
  const estimatedCostUsd = estimateTotalUsd(modelKey, input.size, input.batchSize);
  const budgetCheck = await checkBudgetAllowed(estimatedCostUsd);
  if (!budgetCheck.allowed) {
    throw new Error(budgetCheck.reason ?? "Budget limit exceeded.");
  }

  const provider = getArkProvider();
  const referencePaths: string[] = [];

  const settingsSnapshot: SettingsSnapshot = {
    prompt: input.prompt,
    model: input.model,
    size: input.size,
    batchSize: input.batchSize,
    referencePaths: [],
    provider,
  };

  const generation = await prisma.generation.create({
    data: {
      prompt: input.prompt,
      model: input.model,
      provider,
      size: input.size,
      batchSize: input.batchSize,
      status: "pending",
      estimatedCostUsd,
      settingsSnapshot: JSON.stringify(settingsSnapshot),
    },
  });

  try {
    for (let i = 0; i < input.references.length; i++) {
      const ref = input.references[i];
      const { relativePath } = await saveReference(
        generation.id,
        ref.buffer,
        ref.mimeType,
        i,
        ref.originalName
      );
      referencePaths.push(relativePath);

      await prisma.image.create({
        data: {
          generationId: generation.id,
          type: "reference",
          relativePath,
          mimeType: ref.mimeType,
          sortOrder: i,
        },
      });
    }

    settingsSnapshot.referencePaths = referencePaths;
    await prisma.generation.update({
      where: { id: generation.id },
      data: { settingsSnapshot: JSON.stringify(settingsSnapshot) },
    });

    const result = await generateImage({
      modelKey,
      prompt: input.prompt,
      size: input.size,
      batchSize: input.batchSize,
      referenceImages:
        input.references.length > 0
          ? input.references.map((r) => r.buffer)
          : undefined,
      referenceMimeTypes:
        input.references.length > 0
          ? input.references.map((r) => r.mimeType)
          : undefined,
    });

    if (!result.data?.length) {
      throw new Error("API returned no image data.");
    }

    const outputImages = [];
    for (let i = 0; i < result.data.length; i++) {
      const outputData = result.data[i];
      let relativePath: string;
      let outputMimeType: string;

      if (outputData.url) {
        const downloaded = await downloadImageToStorage(
          outputData.url,
          generation.id,
          i
        );
        relativePath = downloaded.relativePath;
        outputMimeType = downloaded.mimeType;
      } else if (outputData.b64_json) {
        const buffer = Buffer.from(outputData.b64_json, "base64");
        outputMimeType = "image/png";
        const saved = await saveOutput(generation.id, buffer, outputMimeType, i);
        relativePath = saved.relativePath;
      } else {
        continue;
      }

      const outputImage = await prisma.image.create({
        data: {
          generationId: generation.id,
          type: "output",
          relativePath,
          mimeType: outputMimeType,
          batchIndex: i,
          sortOrder: i,
        },
      });

      outputImages.push({
        id: outputImage.id,
        url: imageUrl(outputImage.id),
        thumbUrl: imageUrl(outputImage.id, true),
        batchIndex: i,
      });
    }

    if (outputImages.length === 0) {
      throw new Error("API returned no image data.");
    }

    await prisma.generation.update({
      where: { id: generation.id },
      data: { status: "completed", actualCostUsd: estimatedCostUsd },
    });

    await logUsage(generation.id, input.model, outputImages.length, estimatedCostUsd);

    const referenceImages = await prisma.image.findMany({
      where: { generationId: generation.id, type: "reference" },
      orderBy: { sortOrder: "asc" },
    });

    return {
      id: generation.id,
      prompt: generation.prompt,
      model: generation.model,
      size: generation.size,
      batchSize: generation.batchSize,
      status: "completed",
      outputImage: outputImages[0] ?? null,
      outputImages,
      referenceImages: referenceImages.map((img) => ({
        id: img.id,
        url: imageUrl(img.id),
        thumbUrl: imageUrl(img.id, true),
      })),
      estimatedCostUsd,
      createdAt: generation.createdAt,
    };
  } catch (error) {
    const message = mapProviderError(error);
    captureException(error, {
      service: "runGeneration",
      generationId: generation.id,
      model: input.model,
      batchSize: input.batchSize,
    });
    await prisma.generation.update({
      where: { id: generation.id },
      data: { status: "failed", error: message },
    });
    throw new Error(message);
  }
}

export { MAX_FILE_SIZE_BYTES };
