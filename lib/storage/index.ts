import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const UPLOADS_DIR = path.join(process.cwd(), "storage", "uploads");
const OUTPUTS_DIR = path.join(process.cwd(), "storage", "outputs");

export const MAX_REFERENCE_IMAGES = 10;
export const MAX_FILE_SIZE_BYTES = 30 * 1024 * 1024;

export async function ensureStorageDirs() {
  await mkdir(UPLOADS_DIR, { recursive: true });
  await mkdir(OUTPUTS_DIR, { recursive: true });
}

export async function saveUploadedFile(
  buffer: Buffer,
  mimeType: string,
  prefix: "ref" | "output" = "ref"
): Promise<{ filename: string; filepath: string }> {
  await ensureStorageDirs();
  const ext = mimeTypeToExt(mimeType);
  const filename = `${prefix}-${randomUUID()}${ext}`;
  const dir = prefix === "output" ? OUTPUTS_DIR : UPLOADS_DIR;
  const filepath = path.join(dir, filename);
  await writeFile(filepath, buffer);
  return { filename, filepath };
}

export async function readStoredFile(
  type: "reference" | "output",
  filename: string
): Promise<Buffer> {
  const dir = type === "output" ? OUTPUTS_DIR : UPLOADS_DIR;
  return readFile(path.join(dir, filename));
}

export async function downloadImageToStorage(
  url: string
): Promise<{ filename: string; mimeType: string; buffer: Buffer }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "image/png";
  const buffer = Buffer.from(await response.arrayBuffer());
  const { filename } = await saveUploadedFile(buffer, contentType, "output");

  return { filename, mimeType: contentType, buffer };
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
