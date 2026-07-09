"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function TopNav() {
  const pathname = usePathname();
  const isProfile = pathname === "/profile";

  return (
    <header className="flex shrink-0 items-center justify-between border-b border-white/5 px-6 py-4">
      <Link href="/" className="text-sm font-semibold tracking-wide text-white">
        Seedream Studio
      </Link>
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
    </header>
  );
}
