import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import ElevatorBackdrop from "@/components/elevator/ElevatorBackdrop";
import Header from "@/components/site/Header";
import LanguageSwitcher from "@/components/site/LanguageSwitcher";
import ThemeToggle from "@/components/site/ThemeToggle";
import ContactForm from "@/components/site/ContactForm";
import WhatsAppButton from "@/components/site/WhatsAppButton";
import FadeCard from "@/components/site/FadeCard";
import { SITE_URL } from "@/lib/site";
import { getContent } from "@/lib/content";

export const revalidate = 300;

const card =
  "rounded-2xl border p-6 backdrop-blur-md md:p-8 " +
  "[background-color:var(--card)] [border-color:var(--card-border)]";

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations();
  const c = await getContent(locale as "ru" | "he" | "en");
  const year = new Date().getFullYear();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "SABMER",
    description: c.meta.description,
    url: `${SITE_URL}/${locale}`,
    telephone: c.contacts.phone,
    email: c.contacts.email,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Rishon LeZion",
      addressCountry: "IL",
    },
    founder: c.founders.people.map((f) => ({
      "@type": "Person",
      name: f.name,
    })),
  };

  return (
    <div id="top">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ElevatorBackdrop />
      <Header />

      <main className="mx-auto max-w-6xl px-4 md:px-6">
        {/* ---- Hero ---- */}
        <section className="flex min-h-svh items-center pt-16">
          <FadeCard className="w-full max-w-xl max-md:rounded-2xl max-md:border max-md:p-6 max-md:backdrop-blur-md max-md:[background-color:var(--card)] max-md:[border-color:var(--card-border)]">
            <p
              className="text-sm font-medium uppercase tracking-[0.3em]"
              style={{ color: "var(--bp-accent)" }}
            >
              SABMER
            </p>
            <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">
              {c.hero.tagline}
            </h1>
            <p className="mt-6 max-w-md leading-relaxed opacity-80">
              {c.hero.sub}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#contacts"
                className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#1e3a8a" }}
              >
                {c.hero.ctaContact}
              </a>
              <a
                href="#careers"
                className="rounded-lg border px-5 py-2.5 text-sm font-semibold backdrop-blur-md transition-opacity hover:opacity-80"
                style={{
                  borderColor: "var(--card-border)",
                  backgroundColor: "var(--card)",
                }}
              >
                {c.hero.ctaCareers}
              </a>
            </div>
          </FadeCard>
        </section>

        {/* mobile viewing window: the schematic plays on a clean stage */}
        <div aria-hidden="true" className="h-[30svh] md:hidden" />

        {/* ---- About ---- */}
        <section id="about" className="scroll-mt-24 py-16 md:py-24">
          <FadeCard className={`${card} max-w-3xl`}>
            <h2 className="text-3xl font-bold">{c.about.title}</h2>
            <p className="mt-4 leading-relaxed opacity-85">{c.about.text}</p>
          </FadeCard>
        </section>

        <div aria-hidden="true" className="h-[30svh] md:hidden" />

        {/* ---- Founders ---- */}
        <section id="founders" className="scroll-mt-24 py-16 md:py-24">
          <FadeCard className="inline-block">
            <h2 className={`${card} text-3xl font-bold`}>
              {c.founders.title}
            </h2>
          </FadeCard>
          <div className="mt-6 grid max-w-4xl gap-4 md:grid-cols-2">
            {c.founders.people.map((f) => (
              <FadeCard key={f.name} className={card}>
                {f.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={f.photoUrl}
                    alt={f.name}
                    className="h-20 w-20 rounded-full border object-cover"
                    style={{ borderColor: "var(--bp-accent)" }}
                  />
                ) : (
                  <div
                    className="flex h-20 w-20 items-center justify-center rounded-full border text-2xl font-bold"
                    style={{
                      borderColor: "var(--bp-accent)",
                      color: "var(--bp-accent)",
                    }}
                    aria-hidden="true"
                  >
                    {f.name.slice(0, 1)}
                  </div>
                )}
                <h3 className="mt-4 text-xl font-semibold">{f.name}</h3>
                <p className="text-sm" style={{ color: "var(--bp-accent)" }}>
                  {f.role}
                </p>
                <p className="mt-3 text-sm leading-relaxed opacity-80">
                  {f.bio}
                </p>
              </FadeCard>
            ))}
          </div>
        </section>

        <div aria-hidden="true" className="h-[30svh] md:hidden" />

        {/* ---- Careers ---- */}
        <section id="careers" className="scroll-mt-24 py-16 md:py-24">
          <FadeCard className={`${card} max-w-3xl`}>
            <h2 className="text-3xl font-bold">{c.careers.title}</h2>
            <p className="mt-4 leading-relaxed opacity-85">
              {c.careers.intro}
            </p>
            <ul className="mt-4 space-y-2">
              {c.careers.offers.map((offer) => (
                <li key={offer} className="flex items-center gap-2 text-sm">
                  <span style={{ color: "var(--bp-accent)" }}>✓</span>
                  {offer}
                </li>
              ))}
            </ul>
            <h3 className="mt-8 text-lg font-semibold">
              {c.careers.rolesTitle}
            </h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {c.careers.roles.map((role) => (
                <li
                  key={role}
                  className="rounded-full border px-4 py-1.5 text-sm"
                  style={{ borderColor: "var(--card-border)" }}
                >
                  {role}
                </li>
              ))}
            </ul>
            <a
              href="#contacts"
              className="mt-8 inline-block rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#1e3a8a" }}
            >
              {c.careers.apply}
            </a>
          </FadeCard>
        </section>

        <div aria-hidden="true" className="h-[30svh] md:hidden" />

        {/* ---- Contacts ---- */}
        <section id="contacts" className="scroll-mt-24 py-16 md:py-24">
          <div className="grid max-w-4xl gap-4 md:grid-cols-[1fr_1.4fr]">
            <FadeCard className={card}>
              <h2 className="text-3xl font-bold">{c.contacts.title}</h2>
              <dl className="mt-6 space-y-4 text-sm">
                <div>
                  <dt className="opacity-60">{t("Contacts.phoneLabel")}</dt>
                  <dd className="mt-0.5">
                    <a href={`tel:${c.contacts.phone.replace(/[^+\d]/g, "")}`}>
                      {c.contacts.phone}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="opacity-60">{t("Contacts.emailLabel")}</dt>
                  <dd className="mt-0.5">
                    <a href={`mailto:${c.contacts.email}`}>
                      {c.contacts.email}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="opacity-60">{t("Contacts.addressLabel")}</dt>
                  <dd className="mt-0.5">{c.contacts.address}</dd>
                </div>
              </dl>
              <div className="mt-6">
                <WhatsAppButton />
              </div>
            </FadeCard>
            <FadeCard className={card}>
              <ContactForm />
            </FadeCard>
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
            © {year} SABMER. {c.footer.rights}
          </p>
          <div className="flex items-center gap-2">
            <WhatsAppButton variant="icon" />
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </footer>
    </div>
  );
}
