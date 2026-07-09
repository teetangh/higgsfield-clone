"use client";

import {
  createContext,
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
const MAX_PERSISTED_GALLERY_ITEMS = 80;

const DEFAULT_SESSION = {
  prompt: "",
  model: "seedream-5-pro" as ModelKey,
  size: "2K",
  batchSize: 1,
  gridColumns: 4,
  selectedGenerationId: null as string | null,
  galleryItems: [] as GalleryItem[],
};

interface PersistedSession {
  prompt: string;
  model: ModelKey;
  size: string;
  batchSize: number;
  gridColumns: number;
  selectedGenerationId: string | null;
  galleryItems: GalleryItem[];
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
  hydrated: boolean;
}

const StudioContext = createContext<StudioContextValue | null>(null);

function readPersistedSession(): PersistedSession {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) throw new Error("empty");
    const parsed = JSON.parse(raw) as Partial<PersistedSession>;
    const model = (parsed.model as ModelKey) ?? DEFAULT_SESSION.model;
    return {
      prompt: parsed.prompt ?? DEFAULT_SESSION.prompt,
      model,
      size: parsed.size ?? getDefaultSizeForModel(model),
      batchSize: parsed.batchSize ?? DEFAULT_SESSION.batchSize,
      gridColumns: Math.min(6, Math.max(2, parsed.gridColumns ?? DEFAULT_SESSION.gridColumns)),
      selectedGenerationId: parsed.selectedGenerationId ?? null,
      galleryItems: Array.isArray(parsed.galleryItems)
        ? parsed.galleryItems.slice(0, MAX_PERSISTED_GALLERY_ITEMS)
        : [],
    };
  } catch {
    return { ...DEFAULT_SESSION };
  }
}

export function StudioProvider({ children }: { children: ReactNode }) {
  const [prompt, setPrompt] = useState(DEFAULT_SESSION.prompt);
  const [model, setModel] = useState<ModelKey>(DEFAULT_SESSION.model);
  const [size, setSize] = useState(DEFAULT_SESSION.size);
  const [batchSize, setBatchSize] = useState(DEFAULT_SESSION.batchSize);
  const [references, setReferences] = useState<ReferenceFile[]>([]);
  const [gridColumns, setGridColumns] = useState(DEFAULT_SESSION.gridColumns);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [selectedGeneration, setSelectedGeneration] = useState<GenerationResult | null>(null);
  const [selectedGenerationId, setSelectedGenerationId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const persisted = readPersistedSession();
    setPrompt(persisted.prompt);
    setModel(persisted.model);
    setSize(persisted.size);
    setBatchSize(persisted.batchSize);
    setGridColumns(persisted.gridColumns);
    setSelectedGenerationId(persisted.selectedGenerationId);
    setGalleryItems(persisted.galleryItems);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const payload: PersistedSession = {
      prompt,
      model,
      size,
      batchSize,
      gridColumns,
      selectedGenerationId,
      galleryItems: galleryItems.slice(0, MAX_PERSISTED_GALLERY_ITEMS),
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  }, [hydrated, prompt, model, size, batchSize, gridColumns, selectedGenerationId, galleryItems]);

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
      hydrated,
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
      hydrated,
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
