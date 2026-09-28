import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import FallingCar from "@/components/site/FallingCar";
import ThemeToggle from "@/components/site/ThemeToggle";

/**
 * The page for an address that is not in the drawing.
 *
 * It renders inside the locale layout, so it inherits the fonts, the theme
 * chosen before first paint, and the translations. What it deliberately does
 * not inherit is the site's header: every link in it is an in-page anchor the
 * header rides the camera to, and on a page with no sections to ride to they
 * would be dead controls. A visitor who arrives here wants a way out, and the
 * two links below are it.
 */
export default async function NotFound() {
  const t = await getTranslations("NotFound");

  return (
    <div
      className="flex min-h-svh flex-col"
      style={{
        backgroundColor: "var(--bp-paper)",
        // the same drafting paper the drawing stands on everywhere else
        backgroundImage: `
          linear-gradient(var(--bp-grid-major) 1px, transparent 1px),
          linear-gradient(90deg, var(--bp-grid-major) 1px, transparent 1px),
          linear-gradient(var(--bp-grid) 1px, transparent 1px),
          linear-gradient(90deg, var(--bp-grid) 1px, transparent 1px)`,
        backgroundSize: "125px 125px, 125px 125px, 25px 25px, 25px 25px",
      }}
    >
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-4 py-4 md:px-6">
        <Link href="/" className="text-lg font-bold tracking-wide">
          SABMER
        </Link>
        <ThemeToggle />
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-10 px-4 pb-16 md:flex-row md:gap-16 md:px-6">
        <div className="w-full max-w-[17rem] shrink-0 md:max-w-[19rem]">
          <FallingCar label={t("drawing")} />
        </div>

        <div className="sheet w-full max-w-lg max-md:p-6">
          <h1 className="sheet-title text-2xl sm:text-3xl">{t("title")}</h1>
          <p className="mt-4 leading-relaxed opacity-85">{t("body")}</p>
          <div className="mt-8">
            <Link
              href="/"
              className="inline-block rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#1e3a8a" }}
            >
              {t("home")}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
