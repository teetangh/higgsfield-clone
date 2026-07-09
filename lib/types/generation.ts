export interface ImageRef {
  id: string;
  url: string;
  thumbUrl?: string;
  batchIndex?: number | null;
}

export interface GenerationResult {
  id: string;
  prompt: string;
  model: string;
  size: string;
  batchSize: number;
  status: string;
  outputImage: ImageRef | null;
  outputImages: ImageRef[];
  referenceImages: ImageRef[];
  estimatedCostUsd?: number | null;
  createdAt: string;
  error?: string | null;
}

export interface GalleryItem {
  id: string;
  generationId: string;
  prompt: string;
  model: string;
  size: string;
  batchSize: number;
  status: string;
  imageUrl: string;
  thumbUrl: string;
  imageWidth?: number | null;
  imageHeight?: number | null;
  isPending?: boolean;
  createdAt: string;
}

export interface ReferenceFile {
  file: File;
  previewUrl: string;
}

export interface GenerateImageInput {
  prompt: string;
  model: string;
  size: string;
  batchSize: number;
  references: Array<{ buffer: Buffer; mimeType: string; originalName?: string }>;
}

export interface GenerateImageOutput {
  id: string;
  prompt: string;
  model: string;
  size: string;
  batchSize: number;
  status: string;
  outputImage: ImageRef | null;
  outputImages: ImageRef[];
  referenceImages: ImageRef[];
  estimatedCostUsd: number;
  createdAt: Date;
}

export interface RestorePayload {
  prompt: string;
  model: string;
  size: string;
  batchSize: number;
  referenceImages: ImageRef[];
  outputImages: ImageRef[];
}

export interface SettingsSnapshot {
  prompt: string;
  model: string;
  size: string;
  batchSize: number;
  referencePaths: string[];
  provider: string;
}
