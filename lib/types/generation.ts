export interface ImageRef {
  id: string;
  url: string;
}

export interface GenerationResult {
  id: string;
  prompt: string;
  model: string;
  size: string;
  status: string;
  outputImage: ImageRef | null;
  referenceImages: ImageRef[];
  createdAt: string;
  error?: string | null;
}

export interface ReferenceFile {
  file: File;
  previewUrl: string;
}

export interface GenerateImageInput {
  prompt: string;
  model: string;
  size: string;
  references: Array<{ buffer: Buffer; mimeType: string }>;
}

export interface GenerateImageOutput {
  id: string;
  prompt: string;
  model: string;
  size: string;
  status: string;
  outputImage: ImageRef;
  referenceImages: ImageRef[];
  createdAt: Date;
}
