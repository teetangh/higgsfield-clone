"use client";

import Image from "next/image";

interface ImageCanvasProps {
  imageUrl: string | null;
  isLoading: boolean;
  error: string | null;
}

export function ImageCanvas({ imageUrl, isLoading, error }: ImageCanvasProps) {
  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-2xl border border-white/5 bg-black/40">
      {isLoading && (
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-yellow-400" />
          <p className="text-sm text-white/40">Generating image...</p>
        </div>
      )}

      {!isLoading && error && (
        <div className="max-w-md px-6 text-center">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {!isLoading && !error && imageUrl && (
        <div className="relative h-full w-full">
          <Image
            src={imageUrl}
            alt="Generated image"
            fill
            className="object-contain"
            unoptimized
            priority
          />
        </div>
      )}

      {!isLoading && !error && !imageUrl && (
        <p className="text-sm text-white/25">
          Your generated image will appear here
        </p>
      )}
    </div>
  );
}
