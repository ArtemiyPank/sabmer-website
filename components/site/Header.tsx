"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { rideToId } from "@/lib/ride";
import FloorIndicator from "./FloorIndicator";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";

const SECTIONS = ["about", "founders", "careers", "contacts"] as const;

export default function Header() {
  const t = useTranslations("Header");

  // Every in-page anchor on the site rides instead of jumping, so the camera
  // tour always travels at the same pace it does under a normal scroll.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as HTMLElement | null)?.closest?.("a[href^='#']") as HTMLAnchorElement | null;
      const id = link?.getAttribute("href")?.slice(1);
      if (!id || !document.getElementById(id)) return;
      e.preventDefault();
      rideToId(id);
      history.replaceState(null, "", `#${id}`);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <header
      className="fixed inset-x-0 top-0 z-40 border-b backdrop-blur-md"
      style={{
        backgroundColor: "var(--card)",
        borderColor: "var(--card-border)",
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <a href="#top" className="text-lg font-bold tracking-wide">
          SABMER
        </a>
        <nav className="hidden items-center gap-1 md:flex">
          {SECTIONS.map((s) => (
            <a
              key={s}
              href={`#${s}`}
              className="rounded px-3 py-1.5 text-sm opacity-80 transition-opacity hover:opacity-100"
            >
              {t(s)}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <FloorIndicator />
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
