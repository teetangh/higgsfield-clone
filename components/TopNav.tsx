"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStudioOptional } from "@/components/StudioProvider";
import {
  GRID_COLUMN_MAX,
  GRID_COLUMN_MIN,
  gridColumnsToSlider,
  sliderToGridColumns,
} from "@/lib/studio/grid";

export function TopNav() {
  const pathname = usePathname();
  const isProfile = pathname === "/profile";
  const isHome = pathname === "/";
  const studio = useStudioOptional();

  const sliderValue = studio ? gridColumnsToSlider(studio.gridColumns) : 4;

  return (
    <header className="flex shrink-0 items-center justify-between border-b border-white/5 px-6 py-4">
      <Link href="/" className="text-sm font-semibold tracking-wide text-white">
        Seedream Studio
      </Link>

      <div className="flex items-center gap-4">
        {isHome && studio && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">Small</span>
            <input
              id="grid-size"
              type="range"
              min={GRID_COLUMN_MIN}
              max={GRID_COLUMN_MAX}
              step={1}
              value={sliderValue}
              onChange={(e) =>
                studio.setGridColumns(sliderToGridColumns(parseInt(e.target.value, 10)))
              }
              className="h-1 w-24 cursor-pointer accent-yellow-400"
              aria-label="Grid image size"
            />
            <span className="text-xs text-white/40">Big</span>
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
