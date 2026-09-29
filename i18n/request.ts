import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";
import { siteContent } from "@/lib/content";
import { loadMessages } from "@/lib/messages";

/**
 * What the page says, in the language it was asked for.
 *
 * Two sources, one on top of the other. The files under messages/ are the
 * copy the site ships with; the CMS is whatever has been edited since. The
 * CMS wins where it has something to say and is ignored where it is blank, so
 * an editor changes a line by filling in a field and undoes it by clearing
 * one — and a database that is empty, unreachable, or behind the current
 * schema leaves the site reading exactly as it was built.
 *
 * Merging here rather than at each call site is what makes every word on the
 * page editable at once: `useTranslations` and `getTranslations` read from
 * this, so the navigation, the wording on the buttons and the page for an
 * address that does not exist all come through the same door as the business
 * copy, without a component knowing about it.
 */

type Dict = { [k: string]: string | Dict };

/** copies `patch` over `base`, ignoring anything blank or absent */
function overlay(base: Dict, patch: Dict): Dict {
  const out: Dict = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === undefined) continue;
    if (typeof v === "object") {
      const under = out[k];
      out[k] = overlay(typeof under === "object" ? under : {}, v as Dict);
    } else if (typeof v === "string" && v.trim() !== "") {
      out[k] = v;
    }
  }
  return out;
}

/** the site-content global in the shape messages/{locale}.json has */
function asMessages(g: Awaited<ReturnType<typeof siteContent>>): Dict {
  if (!g) return {};
  const i = (g as { nav?: Dict; buttons?: Dict; notFound?: Dict }) ?? {};
  const nav = (i.nav ?? {}) as Dict;
  const buttons = (i.buttons ?? {}) as Dict;
  const notFound = (i.notFound ?? {}) as Dict;
  return {
    Meta: { title: g.metaTitle, description: g.metaDescription } as Dict,
    Header: {
      about: nav.about,
      jobs: nav.jobs,
      reviews: nav.reviews,
      founders: nav.founders,
      contacts: nav.contacts,
      home: nav.home,
      themeToggle: buttons.themeToggle,
      langSwitch: buttons.langSwitch,
      floorNav: buttons.floorNav,
    } as Dict,
    About: { title: g.aboutTitle, text: g.aboutText } as Dict,
    Founders: { title: g.foundersTitle, text: g.foundersText } as Dict,
    Jobs: {
      title: g.jobsTitle,
      intro: g.jobsIntro,
      whatsapp: buttons.whatsappJobs,
      whatsappText: buttons.whatsappJobsText,
    } as Dict,
    Reviews: {
      title: g.reviewsTitle,
      prev: buttons.reviewPrev,
      next: buttons.reviewNext,
    } as Dict,
    Contacts: {
      title: g.contactsTitle,
      phone: g.phone,
      registration: g.registration,
      whatsapp: buttons.whatsapp,
    } as Dict,
    Footer: { rights: g.footerRights } as Dict,
    NotFound: notFound,
  } as Dict;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const shipped = (await loadMessages(locale)) as unknown as Dict;
  const edited = asMessages(await siteContent(locale));

  return { locale, messages: overlay(shipped, edited) };
});
