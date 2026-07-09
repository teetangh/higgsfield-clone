import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

const STORAGE_ROOT = path.join(process.cwd(), "storage");
const GENERATIONS_DIR = path.join(STORAGE_ROOT, "generations");
const LEGACY_UPLOADS_DIR = path.join(STORAGE_ROOT, "uploads");
const LEGACY_OUTPUTS_DIR = path.join(STORAGE_ROOT, "outputs");

export const MAX_REFERENCE_IMAGES = 10;
export const MAX_FILE_SIZE_BYTES = 30 * 1024 * 1024;
export const MAX_BATCH_SIZE = 8;
export const MAX_TOTAL_IMAGES = 15;

const THUMB_MAX_SIZE = 512;

export function getGenerationDir(generationId: string): string {
  return path.join(GENERATIONS_DIR, generationId);
}

export async function ensureGenerationDir(generationId: string): Promise<void> {
  await mkdir(path.join(getGenerationDir(generationId), "references"), {
    recursive: true,
  });
  await mkdir(path.join(getGenerationDir(generationId), "outputs"), {
    recursive: true,
  });
}

export async function saveReference(
  generationId: string,
  buffer: Buffer,
  mimeType: string,
  sortOrder: number,
  originalName = "reference"
): Promise<{ relativePath: string; thumbPath: string | null }> {
  await ensureGenerationDir(generationId);
  const ext = mimeTypeToExt(mimeType);
  const sanitized = sanitizeFilename(originalName);
  const filename = `${String(sortOrder + 1).padStart(2, "0")}-${sanitized}${ext}`;
  const relativePath = `references/${filename}`;
  const fullPath = path.join(getGenerationDir(generationId), relativePath);
  await writeFile(fullPath, buffer);

  const thumbPath = await saveThumbnail(generationId, buffer, `references/${String(sortOrder + 1).padStart(2, "0")}-thumb`);
  return { relativePath, thumbPath };
}

export async function saveOutput(
  generationId: string,
  buffer: Buffer,
  mimeType: string,
  batchIndex: number
): Promise<{ relativePath: string; thumbPath: string | null }> {
  await ensureGenerationDir(generationId);
  const ext = mimeTypeToExt(mimeType);
  const filename = `${String(batchIndex + 1).padStart(2, "0")}${ext}`;
  const relativePath = `outputs/${filename}`;
  const fullPath = path.join(getGenerationDir(generationId), relativePath);
  await writeFile(fullPath, buffer);

  const thumbPath = await saveThumbnail(
    generationId,
    buffer,
    `outputs/${String(batchIndex + 1).padStart(2, "0")}-thumb`
  );
  return { relativePath, thumbPath };
}

export async function saveThumbnail(
  generationId: string,
  buffer: Buffer,
  baseName: string
): Promise<string | null> {
  try {
    const thumbBuffer = await sharp(buffer)
      .resize(THUMB_MAX_SIZE, THUMB_MAX_SIZE, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
    const thumbRelative = `${baseName}.jpg`;
    const thumbFull = path.join(getGenerationDir(generationId), thumbRelative);
    await writeFile(thumbFull, thumbBuffer);
    return thumbRelative;
  } catch {
    return null;
  }
}

export async function readImageFile(
  relativePath: string,
  type: "reference" | "output",
  generationId?: string
): Promise<Buffer> {
  if (relativePath.includes("/") && generationId) {
    return readFile(path.join(getGenerationDir(generationId), relativePath));
  }

  const legacyDir = type === "output" ? LEGACY_OUTPUTS_DIR : LEGACY_UPLOADS_DIR;
  return readFile(path.join(legacyDir, relativePath));
}

export async function downloadImageToStorage(
  url: string,
  generationId: string,
  batchIndex: number
): Promise<{ relativePath: string; mimeType: string; thumbPath: string | null }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }

    const contentType = response.headers.get("content-type") ?? "image/png";
    const buffer = Buffer.from(await response.arrayBuffer());
    const { relativePath, thumbPath } = await saveOutput(
      generationId,
      buffer,
      contentType,
      batchIndex
    );

    return { relativePath, mimeType: contentType, thumbPath };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Image download timed out after 60 seconds.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function sanitizeFilename(name: string): string {
  const base = path.basename(name, path.extname(name));
  return base.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 40) || "reference";
}

function mimeTypeToExt(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/bmp": ".bmp",
    "image/tiff": ".tiff",
    "image/heic": ".heic",
    "image/heif": ".heif",
  };
  return map[mimeType.toLowerCase()] ?? ".png";
}
