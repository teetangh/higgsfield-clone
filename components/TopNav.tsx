"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function TopNav() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Image" },
    { href: "/history", label: "History" },
  ];

  return (
    <header className="flex shrink-0 items-center justify-between border-b border-white/5 px-6 py-4">
      <div className="flex items-center gap-8">
        <span className="text-sm font-semibold tracking-wide text-white">
          Seedream Studio
        </span>
        <nav className="flex items-center gap-1">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  isActive
                    ? "bg-yellow-400/10 text-yellow-400"
                    : "text-white/50 hover:text-white/80"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
