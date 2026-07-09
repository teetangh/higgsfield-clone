"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getDefaultSizeForModel } from "@/lib/config/models";
import type {
  GalleryItem,
  GenerationResult,
  ReferenceFile,
  ModelKey,
} from "@/lib/types";

const SESSION_KEY = "seedream-studio-session";

interface PersistedSession {
  prompt: string;
  model: ModelKey;
  size: string;
  batchSize: number;
  gridColumns: number;
  selectedGenerationId: string | null;
}

interface StudioContextValue {
  prompt: string;
  setPrompt: (value: string) => void;
  model: ModelKey;
  setModel: (value: ModelKey) => void;
  size: string;
  setSize: (value: string) => void;
  batchSize: number;
  setBatchSize: (value: number) => void;
  references: ReferenceFile[];
  setReferences: (value: ReferenceFile[] | ((prev: ReferenceFile[]) => ReferenceFile[])) => void;
  gridColumns: number;
  setGridColumns: (value: number) => void;
  galleryItems: GalleryItem[];
  setGalleryItems: (value: GalleryItem[] | ((prev: GalleryItem[]) => GalleryItem[])) => void;
  selectedGeneration: GenerationResult | null;
  setSelectedGeneration: (value: GenerationResult | null) => void;
  selectedGenerationId: string | null;
  setSelectedGenerationId: (value: string | null) => void;
}

const StudioContext = createContext<StudioContextValue | null>(null);

function loadPersistedSession(): PersistedSession {
  if (typeof window === "undefined") {
    return {
      prompt: "",
      model: "seedream-5-pro",
      size: "2K",
      batchSize: 1,
      gridColumns: 4,
      selectedGenerationId: null,
    };
  }

  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) throw new Error("empty");
    const parsed = JSON.parse(raw) as PersistedSession;
    return {
      prompt: parsed.prompt ?? "",
      model: (parsed.model as ModelKey) ?? "seedream-5-pro",
      size: parsed.size ?? getDefaultSizeForModel(parsed.model as ModelKey),
      batchSize: parsed.batchSize ?? 1,
      gridColumns: Math.min(6, Math.max(2, parsed.gridColumns ?? 4)),
      selectedGenerationId: parsed.selectedGenerationId ?? null,
    };
  } catch {
    return {
      prompt: "",
      model: "seedream-5-pro",
      size: "2K",
      batchSize: 1,
      gridColumns: 4,
      selectedGenerationId: null,
    };
  }
}

export function StudioProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(loadPersistedSession);

  const [prompt, setPrompt] = useState(initial.prompt);
  const [model, setModel] = useState<ModelKey>(initial.model);
  const [size, setSize] = useState(initial.size);
  const [batchSize, setBatchSize] = useState(initial.batchSize);
  const [references, setReferences] = useState<ReferenceFile[]>([]);
  const [gridColumns, setGridColumns] = useState(initial.gridColumns);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [selectedGeneration, setSelectedGeneration] = useState<GenerationResult | null>(null);
  const [selectedGenerationId, setSelectedGenerationId] = useState<string | null>(
    initial.selectedGenerationId
  );

  useEffect(() => {
    const payload: PersistedSession = {
      prompt,
      model,
      size,
      batchSize,
      gridColumns,
      selectedGenerationId,
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  }, [prompt, model, size, batchSize, gridColumns, selectedGenerationId]);

  const value = useMemo(
    () => ({
      prompt,
      setPrompt,
      model,
      setModel,
      size,
      setSize,
      batchSize,
      setBatchSize,
      references,
      setReferences,
      gridColumns,
      setGridColumns,
      galleryItems,
      setGalleryItems,
      selectedGeneration,
      setSelectedGeneration,
      selectedGenerationId,
      setSelectedGenerationId,
    }),
    [
      prompt,
      model,
      size,
      batchSize,
      references,
      gridColumns,
      galleryItems,
      selectedGeneration,
      selectedGenerationId,
    ]
  );

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

export function useStudio() {
  const context = useContext(StudioContext);
  if (!context) {
    throw new Error("useStudio must be used within StudioProvider");
  }
  return context;
}

export function useStudioOptional() {
  return useContext(StudioContext);
}
