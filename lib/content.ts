import { cache } from "react";
import { getPayload } from "payload";
import config from "@payload-config";

/**
 * CMS-managed content with graceful fallback: if the database is empty or
 * unreachable, the page renders from messages/{locale}.json so the site never
 * breaks. Every word the visitor reads is editable, the interface's own
 * wording included — that half is laid over the message files in
 * ../i18n/request.ts, and this is the shape the business content takes.
 */
export type Content = {
  meta: { title: string; description: string };
  about: { title: string; text: string; stages: string[] };
  founders: {
    title: string;
    /** one text for the two of them */
    text: string;
    people: { name: string; role: string }[];
  };
  jobs: { title: string; intro: string; terms: string[] };
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
    about: {
      title: m.About.title,
      text: m.About.text,
      stages: Object.values(m.About.stages) as string[],
    },
    founders: {
      title: m.Founders.title,
      text: m.Founders.text,
      people: [
        { name: m.Founders.amirName, role: m.Founders.amirRole },
        { name: m.Founders.vovaName, role: m.Founders.vovaRole },
      ],
    },
    jobs: {
      title: m.Jobs.title,
      intro: m.Jobs.intro,
      terms: Object.values(m.Jobs.terms) as string[],
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


/**
 * The site-content global as the CMS holds it, or null if it cannot be read.
 *
 * Cached for the length of one request because two things want it: the page,
 * for the business copy, and the request-level message config, for the wording
 * of the interface. Without this they would each open the database for the
 * same row.
 */
export const siteContent = cache(async (locale: "ru" | "he" | "en") => {
  try {
    const payload = await getPayload({ config });
    return await payload.findGlobal({ slug: "site-content", locale });
  } catch (err) {
    // one line, not the whole failed query: this is an expected path whenever
    // the database is empty, unreachable, or behind the current schema.
    // The cause says what actually went wrong ("relation … does not exist");
    // the error itself is the whole failed query, which helps nobody in a log
    const e = err as { message?: string; cause?: { message?: string; code?: string } };
    // the first of these that actually says something: a connection refused
    // arrives with an empty message and its reason in `cause`
    const why =
      [e.cause?.message, e.cause?.code, e.message, String(err)]
        .map((v) => v?.split("\n")[0].replace(/[\s:]+$/, "").trim())
        .find((v) => v) ?? "no reason given";
    console.warn(`CMS unavailable, rendering from messages: ${why.slice(0, 160)}`);
    return null;
  }
});

export async function getContent(locale: "ru" | "he" | "en"): Promise<Content> {
  const fallback = await fromMessages(locale);
  const g = await siteContent(locale);
  if (!g) return fallback;
  return {
    meta: {
      title: g.metaTitle ?? fallback.meta.title,
      description: g.metaDescription ?? fallback.meta.description,
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
          ? g.founders.map((f) => ({ name: f.name, role: f.role ?? "" }))
          : fallback.founders.people,
    },
    jobs: {
      title: g.jobsTitle ?? fallback.jobs.title,
      intro: g.jobsIntro ?? fallback.jobs.intro,
      terms:
        g.jobsTerms && g.jobsTerms.length > 0
          ? g.jobsTerms.map((t) => t.text)
          : fallback.jobs.terms,
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
}
