"use client";

import { useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/**
 * RU / HE / EN switcher. Other locales are prefetched so the switch is
 * near-instant; while the transition is pending the pressed button pulses.
 * router.replace keeps the scroll position where the browser allows it.
 */
export default function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("Header");
  const [isPending, startTransition] = useTransition();
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    for (const l of routing.locales) {
      if (l === locale) continue;
      try {
        router.prefetch(pathname, { locale: l });
      } catch {}
    }
  }, [locale, pathname, router]);

  const switchTo = (l: (typeof routing.locales)[number]) => {
    if (l === locale || isPending) return;
    setTarget(l);
    startTransition(() => {
      router.replace(pathname, { locale: l, scroll: false });
    });
  };

  return (
    <nav aria-label={t("langSwitch")} className="flex items-center gap-1">
      {routing.locales.map((l) => {
        const active = l === locale;
        const pending = isPending && l === target;
        return (
          <button
            key={l}
            type="button"
            onClick={() => switchTo(l)}
            aria-current={active ? "true" : undefined}
            aria-busy={pending || undefined}
            className={`rounded px-2 py-1 text-sm uppercase transition-all duration-100 active:scale-90 ${
              pending ? "animate-pulse" : ""
            }`}
            style={{
              color: active || pending ? "var(--bp-accent)" : "inherit",
              opacity: active || pending ? 1 : 0.65,
            }}
          >
            {l}
          </button>
        );
      })}
    </nav>
  );
}
