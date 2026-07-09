"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ImageCanvas } from "@/components/ImageCanvas";
import { PromptDock } from "@/components/PromptDock";
import { TopNav } from "@/components/TopNav";
import type { GenerationResult, ReferenceFile, ModelKey } from "@/lib/types";

export function GeneratorPage() {
  const searchParams = useSearchParams();
  const restoreId = searchParams.get("restore");

  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<ModelKey>("seedream-5-pro");
  const [size, setSize] = useState("2K");
  const [references, setReferences] = useState<ReferenceFile[]>([]);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<GenerationResult | null>(null);

  useEffect(() => {
    if (!restoreId) return;

    async function restoreGeneration() {
      try {
        const res = await fetch(`/api/generations/${restoreId}`);
        const data = await res.json();
        if (!res.ok) return;

        setPrompt(data.prompt);
        setModel(data.model as ModelKey);
        setSize(data.size);
        setOutputUrl(data.outputImage?.url ?? null);
        setLastResult(data);
        setReferences([]);
      } catch {
        // ignore restore errors
      }
    }

    restoreGeneration();
  }, [restoreId]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("prompt", prompt.trim());
      formData.append("model", model);
      formData.append("size", size);
      for (const ref of references) {
        formData.append("references", ref.file);
      }

      const response = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Generation failed.");
      }

      setOutputUrl(data.outputImage?.url ?? null);
      setLastResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
      setOutputUrl(null);
    } finally {
      setIsLoading(false);
    }
  }, [prompt, model, size, references, isLoading]);

  const handleDownload = useCallback(() => {
    if (!outputUrl) return;
    const link = document.createElement("a");
    link.href = outputUrl;
    link.download = `seedream-${lastResult?.id ?? "output"}.png`;
    link.click();
  }, [outputUrl, lastResult]);

  const handleCopyPrompt = useCallback(async () => {
    if (!prompt) return;
    await navigator.clipboard.writeText(prompt);
  }, [prompt]);

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a] text-white">
      <TopNav />

      <main className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex flex-1 flex-col gap-3">
          <ImageCanvas imageUrl={outputUrl} isLoading={isLoading} error={error} />

          {outputUrl && !isLoading && (
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={handleDownload}
                className="rounded-lg border border-white/10 px-4 py-2 text-xs text-white/70 transition-colors hover:border-white/20 hover:text-white"
              >
                Download
              </button>
              <button
                type="button"
                onClick={handleCopyPrompt}
                className="rounded-lg border border-white/10 px-4 py-2 text-xs text-white/70 transition-colors hover:border-white/20 hover:text-white"
              >
                Copy prompt
              </button>
            </div>
          )}
        </div>

        <PromptDock
          prompt={prompt}
          model={model}
          size={size}
          references={references}
          isLoading={isLoading}
          onPromptChange={setPrompt}
          onModelChange={setModel}
          onSizeChange={setSize}
          onReferencesChange={setReferences}
          onGenerate={handleGenerate}
        />
      </main>
    </div>
  );
}
