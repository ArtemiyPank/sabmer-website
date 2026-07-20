import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import ElevatorBackdrop from "@/components/elevator/ElevatorBackdrop";
import Header from "@/components/site/Header";
import LanguageSwitcher from "@/components/site/LanguageSwitcher";
import ThemeToggle from "@/components/site/ThemeToggle";
import ContactForm from "@/components/site/ContactForm";

const card =
  "rounded-2xl border p-6 backdrop-blur-md md:p-8 " +
  "[background-color:var(--card)] [border-color:var(--card-border)]";

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations();
  const year = new Date().getFullYear();

  return (
    <div id="top">
      <ElevatorBackdrop />
      <Header />

      <main className="mx-auto max-w-6xl px-4 md:px-6">
        {/* ---- Hero ---- */}
        <section className="flex min-h-svh items-center pt-16">
          <div className="max-w-xl">
            <p
              className="text-sm font-medium uppercase tracking-[0.3em]"
              style={{ color: "var(--bp-accent)" }}
            >
              SABMER
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">
              {t("Hero.tagline")}
            </h1>
            <p className="mt-6 max-w-md leading-relaxed opacity-80">
              {t("Hero.sub")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#contacts"
                className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#1e3a8a" }}
              >
                {t("Hero.ctaContact")}
              </a>
              <a
                href="#careers"
                className="rounded-lg border px-5 py-2.5 text-sm font-semibold backdrop-blur-md transition-opacity hover:opacity-80"
                style={{
                  borderColor: "var(--card-border)",
                  backgroundColor: "var(--card)",
                }}
              >
                {t("Hero.ctaCareers")}
              </a>
            </div>
          </div>
        </section>

        {/* ---- About ---- */}
        <section id="about" className="scroll-mt-24 py-16 md:py-24">
          <div className={`${card} max-w-3xl`}>
            <h2 className="text-3xl font-bold">{t("About.title")}</h2>
            <p className="mt-4 leading-relaxed opacity-85">{t("About.text")}</p>
          </div>
          <div className="mt-6 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(["c1", "c2", "c3", "c4", "c5", "c6"] as const).map((c) => (
              <div key={c} className={card}>
                <h3 className="font-semibold">{t(`About.cards.${c}t`)}</h3>
                <p className="mt-2 text-sm leading-relaxed opacity-75">
                  {t(`About.cards.${c}d`)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ---- Founders ---- */}
        <section id="founders" className="scroll-mt-24 py-16 md:py-24">
          <h2 className={`${card} inline-block text-3xl font-bold`}>
            {t("Founders.title")}
          </h2>
          <div className="mt-6 grid max-w-4xl gap-4 md:grid-cols-2">
            {(["amir", "vova"] as const).map((f) => (
              <div key={f} className={card}>
                <div
                  className="flex h-20 w-20 items-center justify-center rounded-full border text-2xl font-bold"
                  style={{
                    borderColor: "var(--bp-accent)",
                    color: "var(--bp-accent)",
                  }}
                  aria-hidden="true"
                >
                  {t(`Founders.${f}Name`).slice(0, 1)}
                </div>
                <h3 className="mt-4 text-xl font-semibold">
                  {t(`Founders.${f}Name`)}
                </h3>
                <p className="text-sm" style={{ color: "var(--bp-accent)" }}>
                  {t(`Founders.${f}Role`)}
                </p>
                <p className="mt-3 text-sm leading-relaxed opacity-80">
                  {t(`Founders.${f}Bio`)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ---- Careers ---- */}
        <section id="careers" className="scroll-mt-24 py-16 md:py-24">
          <div className={`${card} max-w-3xl`}>
            <h2 className="text-3xl font-bold">{t("Careers.title")}</h2>
            <p className="mt-4 leading-relaxed opacity-85">
              {t("Careers.intro")}
            </p>
            <ul className="mt-4 space-y-2">
              {(["o1", "o2", "o3", "o4", "o5"] as const).map((o) => (
                <li key={o} className="flex items-center gap-2 text-sm">
                  <span style={{ color: "var(--bp-accent)" }}>✓</span>
                  {t(`Careers.offers.${o}`)}
                </li>
              ))}
            </ul>
            <h3 className="mt-8 text-lg font-semibold">
              {t("Careers.rolesTitle")}
            </h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {(["r1", "r2", "r3"] as const).map((r) => (
                <li
                  key={r}
                  className="rounded-full border px-4 py-1.5 text-sm"
                  style={{ borderColor: "var(--card-border)" }}
                >
                  {t(`Careers.roles.${r}`)}
                </li>
              ))}
            </ul>
            <a
              href="#contacts"
              className="mt-8 inline-block rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#1e3a8a" }}
            >
              {t("Careers.apply")}
            </a>
          </div>
        </section>

        {/* ---- Contacts ---- */}
        <section id="contacts" className="scroll-mt-24 py-16 md:py-24">
          <div className="grid max-w-4xl gap-4 md:grid-cols-[1fr_1.4fr]">
            <div className={card}>
              <h2 className="text-3xl font-bold">{t("Contacts.title")}</h2>
              <dl className="mt-6 space-y-4 text-sm">
                <div>
                  <dt className="opacity-60">{t("Contacts.phoneLabel")}</dt>
                  <dd className="mt-0.5">
                    <a href={`tel:${t("Contacts.phone").replace(/[^+\d]/g, "")}`}>
                      {t("Contacts.phone")}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="opacity-60">{t("Contacts.emailLabel")}</dt>
                  <dd className="mt-0.5">
                    <a href={`mailto:${t("Contacts.email")}`}>
                      {t("Contacts.email")}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="opacity-60">{t("Contacts.addressLabel")}</dt>
                  <dd className="mt-0.5">{t("Contacts.address")}</dd>
                </div>
              </dl>
            </div>
            <div className={card}>
              <ContactForm />
            </div>
          </div>
        </section>
      </main>

      {/* ---- Footer ---- */}
      <footer
        className="border-t backdrop-blur-md"
        style={{
          backgroundColor: "var(--card)",
          borderColor: "var(--card-border)",
        }}
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 md:px-6">
          <p className="text-sm opacity-70">
            © {year} SABMER. {t("Footer.rights")}
          </p>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </footer>
    </div>
  );
}
