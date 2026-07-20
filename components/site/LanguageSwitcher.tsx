"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/**
 * RU / HE / EN switcher. Uses router.replace with the current pathname so
 * the scroll position is preserved where the browser allows it.
 */
export default function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("Header");

  return (
    <nav aria-label={t("langSwitch")} className="flex items-center gap-1">
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => router.replace(pathname, { locale: l, scroll: false })}
          aria-current={l === locale ? "true" : undefined}
          className="rounded px-2 py-1 text-sm uppercase transition-opacity"
          style={{
            color: l === locale ? "var(--bp-accent)" : "inherit",
            opacity: l === locale ? 1 : 0.65,
          }}
        >
          {l}
        </button>
      ))}
    </nav>
  );
}
