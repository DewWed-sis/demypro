"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "./app-provider";
import type { Key } from "@/lib/i18n";

const items: { href: string; key: Key; icon: string }[] = [
  { href: "/", key: "today", icon: "M12 3v2m0 14v2M5 12H3m18 0h-2M6.3 6.3 4.9 4.9m14.2 14.2-1.4-1.4M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" },
  { href: "/learn", key: "learn", icon: "M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2V5Zm0 16a2 2 0 0 1 2-2h12v2H6" },
  { href: "/exam", key: "exam", icon: "M9 4h6m-7 4h8M5 2h14v20H5zM8 13l2.5 2.5L16 10" },
  { href: "/lid", key: "lid", icon: "M4 21V8l8-5 8 5v13M9 21v-6h6v6M3 21h18" },
  { href: "/profile", key: "profile", icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9a8 8 0 0 1 16 0" },
];

export function GlassNav() {
  const path = usePathname();
  const { t } = useApp();
  return (
    <nav className="glass fixed inset-x-3 bottom-3 z-20 mx-auto flex max-w-md justify-around rounded-3xl px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      {items.map((it) => {
        const active = it.href === "/" ? path === "/" : path.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-w-14 flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 text-[11px] transition ${
              active ? "bg-white/15 text-white" : "text-violet-200 hover:text-white"
            }`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d={it.icon} />
            </svg>
            {t(it.key)}
          </Link>
        );
      })}
    </nav>
  );
}
