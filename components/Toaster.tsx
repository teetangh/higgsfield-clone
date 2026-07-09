"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      theme="dark"
      position="top-center"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "rounded-xl border border-white/10 bg-neutral-950/95 text-white shadow-xl backdrop-blur-md",
          title: "text-sm font-medium",
          description: "text-xs text-white/60",
          closeButton: "border-white/10 bg-white/5 text-white/60 hover:text-white",
        },
      }}
    />
  );
}
