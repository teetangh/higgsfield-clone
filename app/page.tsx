import { Suspense } from "react";
import { GeneratorPage } from "@/components/GeneratorPage";

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-white/40">
          Loading...
        </div>
      }
    >
      <GeneratorPage />
    </Suspense>
  );
}
