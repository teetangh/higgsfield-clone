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
  getImageDimensions,
  MAX_FILE_SIZE_BYTES,
  MAX_TOTAL_IMAGES,
  readImageFile,
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

export function toGalleryPlaceholder(
  gen: {
    id: string;
    prompt: string;
    model: string;
    size: string;
    batchSize: number;
    status: string;
    createdAt: Date;
  }
): GalleryItem | null {
  if (gen.status !== "pending" && gen.status !== "processing") return null;

  return {
    id: `pending-${gen.id}`,
    generationId: gen.id,
    prompt: gen.prompt,
    model: gen.model,
    size: gen.size,
    batchSize: gen.batchSize,
    status: gen.status,
    imageUrl: "",
    thumbUrl: "",
    isPending: true,
    createdAt: gen.createdAt.toISOString(),
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
    images: Array<{
      id: string;
      type: string;
      batchIndex: number | null;
      width?: number | null;
      height?: number | null;
    }>;
  }
): GalleryItem | null {
  const output = gen.images
    .filter((img) => img.type === "output")
    .sort((a, b) => (a.batchIndex ?? 0) - (b.batchIndex ?? 0))[0];

  if (!output) return toGalleryPlaceholder(gen);

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
    imageWidth: output.width,
    imageHeight: output.height,
    createdAt: gen.createdAt.toISOString(),
  };
}

export function toGalleryItemsFromGeneration(gen: {
  id: string;
  prompt: string;
  model: string;
  size: string;
  batchSize: number;
  status: string;
  createdAt: Date | string;
  images: Array<{
    id: string;
    type: string;
    batchIndex: number | null;
    width?: number | null;
    height?: number | null;
  }>;
}): GalleryItem[] {
  const createdAt =
    gen.createdAt instanceof Date ? gen.createdAt.toISOString() : gen.createdAt;

  const outputs = gen.images
    .filter((img) => img.type === "output")
    .sort((a, b) => (a.batchIndex ?? 0) - (b.batchIndex ?? 0));

  if (outputs.length === 0) {
    const placeholder = toGalleryPlaceholder({ ...gen, createdAt: new Date(createdAt) });
    return placeholder ? [placeholder] : [];
  }

  return outputs.map((output) => ({
    id: output.id,
    generationId: gen.id,
    prompt: gen.prompt,
    model: gen.model,
    size: gen.size,
    batchSize: gen.batchSize,
    status: gen.status,
    imageUrl: imageUrl(output.id),
    thumbUrl: imageUrl(output.id, true),
    imageWidth: output.width,
    imageHeight: output.height,
    createdAt,
  }));
}

/** Create a pending generation record and persist references. Returns immediately. */
export async function startGeneration(
  input: GenerateImageInput
): Promise<{ id: string; status: string; createdAt: Date }> {
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

  return {
    id: generation.id,
    status: "pending",
    createdAt: generation.createdAt,
  };
}

/** Run the provider call and persist outputs. Safe to run in the background via after(). */
export async function processGenerationJob(generationId: string): Promise<void> {
  const generation = await prisma.generation.findUnique({
    where: { id: generationId },
    include: {
      images: { orderBy: [{ type: "asc" }, { sortOrder: "asc" }] },
    },
  });

  if (!generation || generation.status !== "pending") return;

  await prisma.generation.update({
    where: { id: generationId },
    data: { status: "processing" },
  });

  const modelKey = generation.model as ModelKey;
  const estimatedCostUsd =
    generation.estimatedCostUsd ??
    estimateTotalUsd(modelKey, generation.size, generation.batchSize);

  try {
    const referenceImages = generation.images.filter((img) => img.type === "reference");
    const referenceBuffers = await Promise.all(
      referenceImages.map((img) =>
        readImageFile(img.relativePath, "reference", generation.id)
      )
    );

    const result = await generateImage({
      modelKey,
      prompt: generation.prompt,
      size: generation.size,
      batchSize: generation.batchSize,
      referenceImages: referenceBuffers.length > 0 ? referenceBuffers : undefined,
      referenceMimeTypes:
        referenceImages.length > 0 ? referenceImages.map((img) => img.mimeType) : undefined,
    });

    if (!result.data?.length) {
      throw new Error("API returned no image data.");
    }

    const outputImages = [];
    for (let i = 0; i < result.data.length; i++) {
      const outputData = result.data[i];
      let relativePath: string;
      let outputMimeType: string;
      let outputBuffer: Buffer | null = null;

      if (outputData.url) {
        const downloaded = await downloadImageToStorage(outputData.url, generation.id, i);
        relativePath = downloaded.relativePath;
        outputMimeType = downloaded.mimeType;
        outputBuffer = await readImageFile(relativePath, "output", generation.id);
      } else if (outputData.b64_json) {
        outputBuffer = Buffer.from(outputData.b64_json, "base64");
        outputMimeType = "image/png";
        const saved = await saveOutput(generation.id, outputBuffer, outputMimeType, i);
        relativePath = saved.relativePath;
      } else {
        continue;
      }

      const dimensions = outputBuffer ? await getImageDimensions(outputBuffer) : null;

      const outputImage = await prisma.image.create({
        data: {
          generationId: generation.id,
          type: "output",
          relativePath,
          mimeType: outputMimeType,
          width: dimensions?.width,
          height: dimensions?.height,
          batchIndex: i,
          sortOrder: i,
        },
      });

      outputImages.push(outputImage);
    }

    if (outputImages.length === 0) {
      throw new Error("API returned no image data.");
    }

    await prisma.generation.update({
      where: { id: generation.id },
      data: { status: "completed", actualCostUsd: estimatedCostUsd },
    });

    await logUsage(generation.id, generation.model, outputImages.length, estimatedCostUsd);
  } catch (error) {
    const message = mapProviderError(error);
    captureException(error, {
      service: "processGenerationJob",
      generationId: generation.id,
      model: generation.model,
      batchSize: generation.batchSize,
    });
    await prisma.generation.update({
      where: { id: generation.id },
      data: { status: "failed", error: message },
    });
  }
}

/** Legacy synchronous path — kept for tests; API uses start + process. */
export async function runGeneration(
  input: GenerateImageInput
): Promise<GenerateImageOutput> {
  const started = await startGeneration(input);
  await processGenerationJob(started.id);

  const generation = await prisma.generation.findUnique({
    where: { id: started.id },
    include: {
      images: { orderBy: [{ type: "asc" }, { batchIndex: "asc" }, { sortOrder: "asc" }] },
    },
  });

  if (!generation) {
    throw new Error("Generation not found after processing.");
  }

  if (generation.status === "failed") {
    throw new Error(generation.error ?? "Generation failed.");
  }

  const serialized = serializeGeneration(generation);
  return {
    ...serialized,
    estimatedCostUsd: generation.estimatedCostUsd ?? 0,
    createdAt: generation.createdAt,
  };
}

export { MAX_FILE_SIZE_BYTES };
