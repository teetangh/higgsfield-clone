"use client";

import { StudioProvider } from "@/components/StudioProvider";

export function StudioProviderWrapper({ children }: { children: React.ReactNode }) {
  return <StudioProvider>{children}</StudioProvider>;
}
