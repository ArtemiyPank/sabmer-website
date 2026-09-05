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
  about: { title: string; text: string };
  founders: {
    title: string;
    people: { name: string; role: string; bio: string; photoUrl: string | null }[];
  };
  careers: {
    title: string;
    intro: string;
    offers: string[];
    rolesTitle: string;
    roles: string[];
    apply: string;
  };
  contacts: { title: string; phone: string; email: string; address: string };
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
    about: { title: m.About.title, text: m.About.text },
    founders: {
      title: m.Founders.title,
      people: [
        { name: m.Founders.amirName, role: m.Founders.amirRole, bio: m.Founders.amirBio, photoUrl: null },
        { name: m.Founders.vovaName, role: m.Founders.vovaRole, bio: m.Founders.vovaBio, photoUrl: null },
      ],
    },
    careers: {
      title: m.Careers.title,
      intro: m.Careers.intro,
      offers: Object.values(m.Careers.offers) as string[],
      rolesTitle: m.Careers.rolesTitle,
      roles: Object.values(m.Careers.roles) as string[],
      apply: m.Careers.apply,
    },
    contacts: {
      title: m.Contacts.title,
      phone: m.Contacts.phone,
      email: m.Contacts.email,
      address: m.Contacts.address,
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
      },
      founders: {
        title: g.foundersTitle ?? fallback.founders.title,
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
      careers: {
        title: g.careersTitle ?? fallback.careers.title,
        intro: g.careersIntro ?? fallback.careers.intro,
        offers:
          g.careersOffers && g.careersOffers.length > 0
            ? g.careersOffers.map((o) => o.text)
            : fallback.careers.offers,
        rolesTitle: g.careersRolesTitle ?? fallback.careers.rolesTitle,
        roles:
          g.careersRoles && g.careersRoles.length > 0
            ? g.careersRoles.map((r) => r.text)
            : fallback.careers.roles,
        apply: g.careersApply ?? fallback.careers.apply,
      },
      contacts: {
        title: g.contactsTitle ?? fallback.contacts.title,
        phone: g.phone ?? fallback.contacts.phone,
        email: g.email ?? fallback.contacts.email,
        address: g.address ?? fallback.contacts.address,
      },
      footer: { rights: g.footerRights ?? fallback.footer.rights },
    };
  } catch (err) {
    console.warn("CMS unavailable, rendering from messages fallback:", err);
    return fallback;
  }
}
