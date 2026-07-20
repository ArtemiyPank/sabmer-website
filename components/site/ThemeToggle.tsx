"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

type Theme = "dark" | "light";

// Tiny external store so every toggle instance (header + footer) stays in
// sync and the theme survives client-side locale-switch remounts.
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function readTheme(): Theme {
  try {
    const t = localStorage.getItem("theme");
    if (t === "dark" || t === "light") return t;
  } catch {}
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function writeTheme(theme: Theme) {
  try {
    localStorage.setItem("theme", theme);
  } catch {}
  document.documentElement.dataset.theme = theme;
  listeners.forEach((l) => l());
}

export default function ThemeToggle() {
  const t = useTranslations("Header");
  // server snapshot is null -> neutral icon until hydration
  const theme = useSyncExternalStore(subscribe, readTheme, () => null);

  // Apply on mount and on changes: client-side locale switches remount
  // <html>, and React never re-executes the inline init script.
  useEffect(() => {
    if (theme) document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <button
      type="button"
      onClick={() => writeTheme(theme === "dark" ? "light" : "dark")}
      aria-label={t("themeToggle")}
      className="rounded-full border px-3 py-1.5 text-sm transition-colors hover:opacity-80"
      style={{ borderColor: "var(--card-border)" }}
    >
      {theme === null ? "◐" : theme === "dark" ? "☀" : "🌙"}
    </button>
  );
}
