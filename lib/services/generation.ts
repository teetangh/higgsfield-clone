import { prisma } from "@/lib/db/client";
import {
  generateImage,
  getArkProvider,
  isValidModel,
  mapProviderError,
} from "@/lib/providers";
import {
  downloadImageToStorage,
  MAX_FILE_SIZE_BYTES,
  saveUploadedFile,
} from "@/lib/storage";
import type { GenerateImageInput, GenerateImageOutput, GenerationResult } from "@/lib/types";
import type { ModelKey } from "@/lib/types";

export function serializeGeneration(
  gen: {
    id: string;
    prompt: string;
    model: string;
    size: string;
    status: string;
    error: string | null;
    createdAt: Date;
    images: Array<{ id: string; type: string }>;
  },
  imageUrl: (id: string) => string
): GenerationResult {
  const output = gen.images.find((img) => img.type === "output");
  const references = gen.images.filter((img) => img.type === "reference");

  return {
    id: gen.id,
    prompt: gen.prompt,
    model: gen.model,
    size: gen.size,
    status: gen.status,
    error: gen.error,
    createdAt: gen.createdAt.toISOString(),
    outputImage: output ? { id: output.id, url: imageUrl(output.id) } : null,
    referenceImages: references.map((img) => ({
      id: img.id,
      url: imageUrl(img.id),
    })),
  };
}

export async function runGeneration(
  input: GenerateImageInput
): Promise<GenerateImageOutput> {
  if (!isValidModel(input.model)) {
    throw new Error("Invalid model selected.");
  }

  const provider = getArkProvider();

  const generation = await prisma.generation.create({
    data: {
      prompt: input.prompt,
      model: input.model,
      provider,
      size: input.size,
      status: "pending",
    },
  });

  try {
    for (let i = 0; i < input.references.length; i++) {
      const ref = input.references[i];
      const { filename } = await saveUploadedFile(ref.buffer, ref.mimeType, "ref");

      await prisma.image.create({
        data: {
          generationId: generation.id,
          type: "reference",
          filename,
          mimeType: ref.mimeType,
          sortOrder: i,
        },
      });
    }

    const result = await generateImage({
      modelKey: input.model as ModelKey,
      prompt: input.prompt,
      size: input.size,
      referenceImages:
        input.references.length > 0
          ? input.references.map((r) => r.buffer)
          : undefined,
      referenceMimeTypes:
        input.references.length > 0
          ? input.references.map((r) => r.mimeType)
          : undefined,
    });

    const outputData = result.data?.[0];
    if (!outputData?.url && !outputData?.b64_json) {
      throw new Error("API returned no image data.");
    }

    let outputFilename: string;
    let outputMimeType: string;

    if (outputData.url) {
      const downloaded = await downloadImageToStorage(outputData.url);
      outputFilename = downloaded.filename;
      outputMimeType = downloaded.mimeType;
    } else {
      const buffer = Buffer.from(outputData.b64_json!, "base64");
      outputMimeType = "image/png";
      const saved = await saveUploadedFile(buffer, outputMimeType, "output");
      outputFilename = saved.filename;
    }

    const outputImage = await prisma.image.create({
      data: {
        generationId: generation.id,
        type: "output",
        filename: outputFilename,
        mimeType: outputMimeType,
        sortOrder: 0,
      },
    });

    await prisma.generation.update({
      where: { id: generation.id },
      data: { status: "completed" },
    });

    const referenceImages = await prisma.image.findMany({
      where: { generationId: generation.id, type: "reference" },
      orderBy: { sortOrder: "asc" },
    });

    return {
      id: generation.id,
      prompt: generation.prompt,
      model: generation.model,
      size: generation.size,
      status: "completed",
      outputImage: { id: outputImage.id, url: `/api/images/${outputImage.id}` },
      referenceImages: referenceImages.map((img) => ({
        id: img.id,
        url: `/api/images/${img.id}`,
      })),
      createdAt: generation.createdAt,
    };
  } catch (error) {
    const message = mapProviderError(error);
    await prisma.generation.update({
      where: { id: generation.id },
      data: { status: "failed", error: message },
    });
    throw new Error(message);
  }
}

export { MAX_FILE_SIZE_BYTES };
