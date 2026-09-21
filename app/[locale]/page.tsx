import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import ElevatorBackdrop from "@/components/elevator/ElevatorBackdrop";
import Header from "@/components/site/Header";
import LanguageSwitcher from "@/components/site/LanguageSwitcher";
import ThemeToggle from "@/components/site/ThemeToggle";
import WhatsAppButton from "@/components/site/WhatsAppButton";
import ScrollSnap from "@/components/site/ScrollSnap";
import BackToTop from "@/components/site/BackToTop";
import ReviewArrows from "@/components/site/ReviewArrows";
import PlateAction from "@/components/site/PlateAction";
import ReviewCall from "@/components/site/ReviewCall";
import FadeCard from "@/components/site/FadeCard";
import { SITE_URL } from "@/lib/site";
import { getContent } from "@/lib/content";
import { whatsappLink } from "@/lib/whatsapp";
import type { SiteNotes } from "@/lib/site-notes";

export const revalidate = 300;

// one class for every text container; `data-ui` on <html> restyles them all
// (frosted card / drafting callout / title block / bare lettering)
const card = "sheet";

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations();
  const c = await getContent(locale as "ru" | "he" | "en");
  const year = new Date().getFullYear();
  // the one thing a plate can be pressed for: applying, from the Work plate
  const apply = {
    label: t("Jobs.whatsapp"),
    href: whatsappLink(c.contacts.phone, t("Jobs.whatsappText")),
    mark: "whatsapp" as const,
  };

  // the same copy the sections render, for the layout that letters it onto the parts
  const notes: SiteNotes = {
    about: { n: "01", title: c.about.title, body: c.about.text, items: c.about.stages },
    jobs: { n: "02", title: c.jobs.title, body: c.jobs.intro, items: c.jobs.terms, action: apply },
    reviews: { n: "03", title: c.reviews.title, cards: c.reviews.items },
    founders: { n: "04", title: c.founders.title, body: c.founders.text },
    contacts: {
      n: "05",
      title: c.contacts.title,
      // the registration number rides in the title block, where a drawing
      // keeps that sort of thing; the address is left to the Contacts section,
      // which can hold it properly
      caption: c.contacts.registration,
      // the separator is tied to the address after it, so that a narrow plate
      // breaks the line before the mark instead of leaving it hanging
      body: `${c.contacts.phone}  ·\u00A0${c.contacts.email}`,
    },
  };

  // Structured data goes into a <script> as raw text, and every field in it is
  // editable from the admin. JSON escapes quotes but not "<", so a stray
  // "</script>" in a description would close the tag and let the rest of the
  // field run as markup. Escaping the one character that can do that is enough.
  const inlineJson = (v: unknown) => JSON.stringify(v).replace(/</g, "\\u003c");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "SABMER",
    legalName: "סאבמר בע\"מ",
    description: c.meta.description,
    url: `${SITE_URL}/${locale}`,
    telephone: c.contacts.phone,
    email: c.contacts.email,
    // the town only: the registered address is a private one
    address: {
      "@type": "PostalAddress",
      addressLocality: "Bat Yam",
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
        dangerouslySetInnerHTML={{ __html: inlineJson(jsonLd) }}
      />
      <ElevatorBackdrop notes={notes} />
      <ScrollSnap />
      <Header />
      <BackToTop />
      <ReviewArrows count={c.reviews.items.length} />
      <PlateAction stop="jobs" href={apply.href} label={apply.label} />
      <ReviewCall contacts={c.reviews.items.map((r) => r.contact)} />

      <main className="mx-auto max-w-6xl px-4 md:px-6">
        {/* ---- About: who we are and what we take on ---- */}
        <section id="about" className="flex min-h-svh items-center pt-16">
          <FadeCard className="sheet w-full max-w-xl max-md:p-6">
            <p
              className="text-sm font-medium uppercase tracking-[0.3em]"
              style={{ color: "var(--bp-accent)" }}
            >
              SABMER
            </p>
            <h1 className="sheet-title mt-4 text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">
              {c.hero.tagline}
            </h1>
            <p className="mt-6 leading-relaxed opacity-85">{c.about.text}</p>
            <ul className="mt-4 space-y-2">
              {c.about.stages.map((line) => (
                <li key={line} className="flex gap-2 text-sm leading-relaxed">
                  <span aria-hidden="true" style={{ color: "var(--bp-accent)" }}>
                    —
                  </span>
                  {line}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#contacts"
                className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#1e3a8a" }}
              >
                {c.hero.ctaContact}
              </a>
              <a
                href="#jobs"
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

        {/* ---- Work: the terms ---- */}
        <section id="jobs" className="scroll-mt-24 py-16 md:py-24">
          <FadeCard className={`${card} max-w-3xl`}>
            <h2 className="sheet-title">{c.jobs.title}</h2>
            <p className="mt-4 leading-relaxed opacity-85">{c.jobs.intro}</p>
            <ul className="mt-4 space-y-2">
              {c.jobs.terms.map((term) => (
                <li key={term} className="flex items-center gap-2 text-sm">
                  <span style={{ color: "var(--bp-accent)" }}>✓</span>
                  {term}
                </li>
              ))}
            </ul>
            <p className="mt-8 text-sm">
              {c.jobs.apply}{" "}
              <a
                className="font-semibold"
                style={{ color: "var(--bp-accent)" }}
                href={`tel:${c.contacts.phone.replace(/[^+\d]/g, "")}`}
              >
                {c.contacts.phone}
              </a>
            </p>
            <div className="mt-4">
              <WhatsAppButton
                phone={c.contacts.phone}
                label={t("Jobs.whatsapp")}
                message={t("Jobs.whatsappText")}
              />
            </div>
          </FadeCard>
        </section>

        <div aria-hidden="true" className="h-[30svh] md:hidden" />

        {/* ---- Reviews: what the crew says ---- */}
        <section id="reviews" className="scroll-mt-24 py-16 md:py-24">
          <FadeCard className={`${card} inline-block`}>
            <h2 className="sheet-title">{c.reviews.title}</h2>
          </FadeCard>
          <div className="mt-6 grid max-w-4xl gap-4 md:grid-cols-3">
            {c.reviews.items.map((r, i) => (
              <FadeCard key={`${r.name}-${i}`} className={card}>
                <h3 className="text-lg font-semibold">{r.name}</h3>
                <p className="text-sm" style={{ color: "var(--bp-accent)" }}>
                  {r.period}
                </p>
                <p className="mt-3 text-sm leading-relaxed opacity-80">{r.text}</p>
                {r.contact ? (
                  <p className="mt-3 text-sm">
                    <a
                      className="opacity-70 hover:opacity-100"
                      href={`tel:${r.contact.replace(/[^+\d]/g, "")}`}
                    >
                      {r.contact}
                    </a>
                  </p>
                ) : null}
              </FadeCard>
            ))}
          </div>
        </section>

        <div aria-hidden="true" className="h-[30svh] md:hidden" />

        {/* ---- Founders ---- */}
        <section id="founders" className="scroll-mt-24 py-16 md:py-24">
          <FadeCard className={`${card} max-w-2xl`}>
            <h2 className="sheet-title">{c.founders.title}</h2>
            <p className="mt-4 leading-relaxed opacity-85">{c.founders.text}</p>
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
              </FadeCard>
            ))}
          </div>
        </section>

        <div aria-hidden="true" className="h-[30svh] md:hidden" />

        {/* ---- Contacts ---- */}
        <section id="contacts" className="scroll-mt-24 py-16 md:py-24">
          <div className="grid max-w-4xl gap-4">
            <FadeCard className={`${card} max-w-md`}>
              <h2 className="sheet-title">{c.contacts.title}</h2>
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
                    <a href={`mailto:${c.contacts.email}`}>{c.contacts.email}</a>
                  </dd>
                </div>
                <div>
                  <dt className="opacity-60">{t("Contacts.addressLabel")}</dt>
                  <dd className="mt-0.5">{c.contacts.address}</dd>
                </div>
                <div>
                  <dt className="opacity-60">
                    {t("Contacts.registrationLabel")}
                  </dt>
                  {/* Hebrew in every locale: isolated so a Latin sentence
                      around it cannot reorder its digits */}
                  <dd className="mt-0.5"><bdi>{c.contacts.registration}</bdi></dd>
                </div>
              </dl>
              <div className="mt-6">
                <WhatsAppButton phone={c.contacts.phone} />
              </div>
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
            <WhatsAppButton phone={c.contacts.phone} variant="icon" />
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </footer>
    </div>
  );
}
