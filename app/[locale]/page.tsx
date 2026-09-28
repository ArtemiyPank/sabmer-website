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
import NoteSheet from "@/components/site/NoteSheet";
import { SITE_URL } from "@/lib/site";
import { getContent } from "@/lib/content";
import { whatsappLink } from "@/lib/whatsapp";
import { ltr, type SiteNotes } from "@/lib/site-notes";

export const revalidate = 300;

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
    reviews: {
      n: "03",
      title: c.reviews.title,
      // the number a review is signed with is dialled, so it has to read the
      // way it is dialled whichever way the page runs
      cards: c.reviews.items.map((r) => ({ ...r, contact: ltr(r.contact) })),
    },
    founders: {
      n: "04",
      title: c.founders.title,
      body: c.founders.text,
      // who they are, named. This used to appear only in the flowing layout,
      // so the drawing described two people it never introduced
      blocks: c.founders.people.map((f) => ({ title: f.name, caption: f.role })),
    },
    contacts: {
      n: "05",
      title: c.contacts.title,
      // the registration number rides in the title block, where a drawing
      // keeps that sort of thing
      caption: c.contacts.registration,
      // the separator is tied to what follows it, so that a narrow plate
      // breaks the line before the mark instead of leaving it hanging
      body: `${ltr(c.contacts.phone)}  ·\u00A0${ltr(c.contacts.email)}`,
      items: [c.contacts.address],
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
        {/*
          The same five plates the drawing letters, set as cards for a browser
          that cannot run it — one description, two renderers, so the two can no
          longer drift apart (see components/site/NoteSheet.tsx).

          While the scene is running these only hold the scroll open: the tour
          shows the copy on the machine and `data-ui="engraved"` takes them off
          the screen, leaving them in the page for assistive technology and for
          anything that reads it without running it.
        */}
        <section id="about" className="flex min-h-svh items-center pt-16">
          <FadeCard className="w-full max-w-xl">
            <NoteSheet note={notes.about} className="max-md:p-6" />
          </FadeCard>
        </section>

        {/* mobile viewing window: the schematic plays on a clean stage */}
        <div aria-hidden="true" className="h-[30svh] md:hidden" />

        <section id="jobs" className="scroll-mt-24 py-16 md:py-24">
          <FadeCard className="max-w-3xl">
            <NoteSheet note={notes.jobs} className="max-md:p-6" />
          </FadeCard>
        </section>

        <div aria-hidden="true" className="h-[30svh] md:hidden" />

        <section id="reviews" className="scroll-mt-24 py-16 md:py-24">
          <FadeCard className="max-w-3xl">
            <NoteSheet note={notes.reviews} className="max-md:p-6" />
          </FadeCard>
        </section>

        <div aria-hidden="true" className="h-[30svh] md:hidden" />

        <section id="founders" className="scroll-mt-24 py-16 md:py-24">
          <FadeCard className="max-w-2xl">
            <NoteSheet note={notes.founders} className="max-md:p-6" />
          </FadeCard>
        </section>

        <div aria-hidden="true" className="h-[30svh] md:hidden" />

        <section id="contacts" className="scroll-mt-24 py-16 md:py-24">
          <FadeCard className="max-w-xl">
            <NoteSheet note={notes.contacts} className="max-md:p-6" />
          </FadeCard>
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
