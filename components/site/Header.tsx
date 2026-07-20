"use client";

import { useTranslations } from "next-intl";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";

const SECTIONS = ["about", "founders", "careers", "contacts"] as const;

export default function Header() {
  const t = useTranslations("Header");

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
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
