/**
 * The page copy as the CMS holds it, read out of messages/{ru,he,en}.json.
 *
 * The JSON files are the source the site falls back to when the database is
 * unreachable, so seeding from them is what makes the two agree: whatever the
 * CMS has never been edited to say, it says the same thing either way.
 */
import { readFileSync } from "fs";
import type { Payload } from "payload";

export const LOCALES = ["ru", "he", "en"] as const;

const read = (locale: string) =>
  JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"));

/** writes every locale of the site-content global */
export async function writeContent(payload: Payload) {
  for (const locale of LOCALES) {
    const m = read(locale);
    await payload.updateGlobal({
      slug: "site-content",
      locale,
      data: {
        metaTitle: m.Meta.title,
        metaDescription: m.Meta.description,
        heroTagline: m.Hero.tagline,
        heroSub: m.Hero.sub,
        heroCtaContact: m.Hero.ctaContact,
        heroCtaCareers: m.Hero.ctaCareers,
        aboutTitle: m.About.title,
        aboutText: m.About.text,
        aboutStages: Object.values(m.About.stages).map((text) => ({ text: text as string })),
        foundersTitle: m.Founders.title,
        foundersText: m.Founders.text,
        founders: [
          { name: m.Founders.amirName, role: m.Founders.amirRole },
          { name: m.Founders.vovaName, role: m.Founders.vovaRole },
        ],
        jobsTitle: m.Jobs.title,
        jobsIntro: m.Jobs.intro,
        jobsTerms: Object.values(m.Jobs.terms).map((text) => ({ text: text as string })),
        jobsApply: m.Jobs.apply,
        reviewsTitle: m.Reviews.title,
        reviews: m.Reviews.items,
        contactsTitle: m.Contacts.title,
        phone: m.Contacts.phone,
        email: m.Contacts.email,
        address: m.Contacts.address,
        registration: m.Contacts.registration,
        footerRights: m.Footer.rights,
      },
    });
    console.log(`  site-content [${locale}]`);
  }
}

/**
 * Creates the first admin user, or says why it cannot. Credentials come from
 * the environment and are never written down here: a password in the
 * repository is a password everyone has.
 */
export async function createFirstAdmin(payload: Payload) {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "The database has no admin user and ADMIN_EMAIL / ADMIN_PASSWORD are not set, " +
        "so one cannot be made — see .env.example"
    );
  }
  await payload.create({ collection: "users", data: { email, password } });
  console.log(`  admin user ${email}`);
}
