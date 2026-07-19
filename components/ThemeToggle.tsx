"use client";

import { useEffect, useState } from "react";

/** Minimal theme toggle for the animation demo (full theming comes later). */
export default function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <button
      type="button"
      onClick={() => setDark((d) => !d)}
      aria-label="Toggle theme"
      className="fixed top-4 end-4 z-50 rounded-full border px-4 py-2 text-sm backdrop-blur-md"
      style={{ backgroundColor: "var(--card)", borderColor: "var(--card-border)" }}
    >
      {dark ? "☀ Light" : "🌙 Dark"}
    </button>
  );
}
