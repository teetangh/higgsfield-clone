"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStudioOptional } from "@/components/StudioProvider";

export function TopNav() {
  const pathname = usePathname();
  const isProfile = pathname === "/profile";
  const isHome = pathname === "/";
  const studio = useStudioOptional();

  return (
    <header className="flex shrink-0 items-center justify-between border-b border-white/5 px-6 py-4">
      <Link href="/" className="text-sm font-semibold tracking-wide text-white">
        Seedream Studio
      </Link>

      <div className="flex items-center gap-4">
        {isHome && studio && (
          <div className="flex items-center gap-2">
            <label htmlFor="grid-size" className="text-xs text-white/40">
              Grid
            </label>
            <input
              id="grid-size"
              type="range"
              min={2}
              max={6}
              step={1}
              value={studio.gridColumns}
              onChange={(e) => studio.setGridColumns(parseInt(e.target.value, 10))}
              className="h-1 w-24 cursor-pointer accent-yellow-400"
              aria-label="Grid image size"
            />
            <span className="w-4 text-xs tabular-nums text-white/50">{studio.gridColumns}</span>
          </div>
        )}

        <Link
          href="/profile"
          className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
            isProfile
              ? "bg-yellow-400/10 text-yellow-400"
              : "text-white/50 hover:text-white/80"
          }`}
        >
          Profile
        </Link>
      </div>
    </header>
  );
}
