import { getPayload } from "payload";
import config from "@payload-config";

/**
 * CMS-managed content with graceful fallback: if the database is empty or
 * unreachable, the page renders from messages/{locale}.json so the site
 * never breaks. UI microcopy (form labels, aria) always comes from
 * next-intl; this covers the business content only.
 */
export type Content = {
  meta: { title: string; description: string };
  hero: { tagline: string; sub: string; ctaContact: string; ctaCareers: string };
  about: { title: string; text: string; stages: string[] };
  founders: {
    title: string;
    /** what holds for both of them; each entry adds only what is its own */
    text: string;
    people: { name: string; role: string; bio: string; photoUrl: string | null }[];
  };
  jobs: { title: string; intro: string; terms: string[]; apply: string };
  reviews: {
    title: string;
    items: { name: string; period: string; text: string; contact: string }[];
  };
  contacts: {
    title: string;
    phone: string;
    email: string;
    address: string;
    registration: string;
  };
  footer: { rights: string };
};

const fromMessages = async (locale: string): Promise<Content> => {
  const m = (await import(`@/messages/${locale}.json`)).default;
  return {
    meta: { title: m.Meta.title, description: m.Meta.description },
    hero: {
      tagline: m.Hero.tagline,
      sub: m.Hero.sub,
      ctaContact: m.Hero.ctaContact,
      ctaCareers: m.Hero.ctaCareers,
    },
    about: {
      title: m.About.title,
      text: m.About.text,
      stages: Object.values(m.About.stages) as string[],
    },
    founders: {
      title: m.Founders.title,
      text: m.Founders.text,
      people: [
        { name: m.Founders.amirName, role: m.Founders.amirRole, bio: m.Founders.amirBio, photoUrl: null },
        { name: m.Founders.vovaName, role: m.Founders.vovaRole, bio: m.Founders.vovaBio, photoUrl: null },
      ],
    },
    jobs: {
      title: m.Jobs.title,
      intro: m.Jobs.intro,
      terms: Object.values(m.Jobs.terms) as string[],
      apply: m.Jobs.apply,
    },
    reviews: { title: m.Reviews.title, items: m.Reviews.items },
    contacts: {
      title: m.Contacts.title,
      phone: m.Contacts.phone,
      email: m.Contacts.email,
      address: m.Contacts.address,
      registration: m.Contacts.registration,
    },
    footer: { rights: m.Footer.rights },
  };
};


export async function getContent(locale: "ru" | "he" | "en"): Promise<Content> {
  const fallback = await fromMessages(locale);
  try {
    const payload = await getPayload({ config });
    const g = await payload.findGlobal({ slug: "site-content", locale });
    return {
      meta: {
        title: g.metaTitle ?? fallback.meta.title,
        description: g.metaDescription ?? fallback.meta.description,
      },
      hero: {
        tagline: g.heroTagline ?? fallback.hero.tagline,
        sub: g.heroSub ?? fallback.hero.sub,
        ctaContact: g.heroCtaContact ?? fallback.hero.ctaContact,
        ctaCareers: g.heroCtaCareers ?? fallback.hero.ctaCareers,
      },
      about: {
        title: g.aboutTitle ?? fallback.about.title,
        text: g.aboutText ?? fallback.about.text,
        stages:
          g.aboutStages && g.aboutStages.length > 0
            ? g.aboutStages.map((l) => l.text)
            : fallback.about.stages,
      },
      founders: {
        title: g.foundersTitle ?? fallback.founders.title,
        text: g.foundersText ?? fallback.founders.text,
        people:
          g.founders && g.founders.length > 0
            ? g.founders.map((f) => ({
                name: f.name,
                role: f.role ?? "",
                bio: f.bio ?? "",
                photoUrl:
                  f.photo && typeof f.photo === "object" && f.photo.url
                    ? f.photo.url
                    : null,
              }))
            : fallback.founders.people,
      },
      jobs: {
        title: g.jobsTitle ?? fallback.jobs.title,
        intro: g.jobsIntro ?? fallback.jobs.intro,
        terms:
          g.jobsTerms && g.jobsTerms.length > 0
            ? g.jobsTerms.map((t) => t.text)
            : fallback.jobs.terms,
        apply: g.jobsApply ?? fallback.jobs.apply,
      },
      reviews: {
        title: g.reviewsTitle ?? fallback.reviews.title,
        items:
          g.reviews && g.reviews.length > 0
            ? g.reviews.map((r) => ({
                name: r.name,
                period: r.period ?? "",
                text: r.text ?? "",
                contact: r.contact ?? "",
              }))
            : fallback.reviews.items,
      },
      contacts: {
        title: g.contactsTitle ?? fallback.contacts.title,
        phone: g.phone ?? fallback.contacts.phone,
        email: g.email ?? fallback.contacts.email,
        address: g.address ?? fallback.contacts.address,
        registration: g.registration ?? fallback.contacts.registration,
      },
      footer: { rights: g.footerRights ?? fallback.footer.rights },
    };
  } catch (err) {
    // one line, not the whole failed query: this is an expected path whenever
    // the database is empty, unreachable, or behind the current schema
    // the cause says what actually went wrong ("relation … does not exist");
    // the error itself is the whole failed query, which helps nobody in a log
    const cause = err instanceof Error ? (err.cause as Error | undefined) : undefined;
    const why = (cause?.message ?? (err instanceof Error ? err.message : String(err)))
      .split("\n")[0]
      .slice(0, 160);
    console.warn(`CMS unavailable, rendering from messages: ${why}`);
    return fallback;
  }
}
