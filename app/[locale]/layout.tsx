import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/site";
import { getContent } from "@/lib/content";
import "../globals.css";

// Rubik covers Latin, Cyrillic and Hebrew — one family for all locales
const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin", "cyrillic", "hebrew"],
});

// Set the theme before first paint: localStorage wins, otherwise system.
// data-theme is never rendered by React, so client-side re-renders
// (e.g. locale switching) can't reset the user's choice.
const themeInitScript = `try{var t=localStorage.getItem("theme");if(!t)t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t}catch(e){}`;

// Before the page is parsed: the browser is not to put the scroll back on a
// reload, nor to jump to a section named in the address — the page does both
// itself, by flying there (components/site/ScrollRestore.tsx). The section is
// kept aside for it and taken off the address, which is the only way to stop
// the jump: the browser scrolls to a fragment as soon as the element appears.
// Only on the page with the tour; elsewhere an address keeps its fragment.
const arrivalScript = `try{history.scrollRestoration="manual";if(/^\\/(ru|he|en)\\/?$/.test(location.pathname)&&location.hash.length>1){window.__arrivalHash=decodeURIComponent(location.hash.slice(1));history.replaceState(history.state,"",location.pathname+location.search)}}catch(e){}`;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  // The page checks its locale, but metadata is worked out first, and a path
  // with a dot in it never went through the i18n proxy to be corrected — so
  // whatever the first segment was arrived here as a "locale" (see
  // lib/messages.ts). It is checked before anything is read with it.
  if (!hasLocale(routing.locales, locale)) notFound();
  const c = await getContent(locale);
  const languages = Object.fromEntries(
    routing.locales.map((l) => [l, `/${l}`])
  );
  return {
    metadataBase: new URL(SITE_URL),
    title: c.meta.title,
    description: c.meta.description,
    alternates: {
      canonical: `/${locale}`,
      languages: { ...languages, "x-default": `/${routing.defaultLocale}` },
    },
    openGraph: {
      title: c.meta.title,
      description: c.meta.description,
      siteName: "SABMER",
      url: `/${locale}`,
      locale,
      type: "website",
      images: [{ url: "/og.png", width: 1200, height: 630 }],
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      dir={locale === "he" ? "rtl" : "ltr"}
      className={`${rubik.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: arrivalScript }} />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
