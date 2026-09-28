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
        reviewsTitle: m.Reviews.title,
        reviews: m.Reviews.items,
        contactsTitle: m.Contacts.title,
        phone: m.Contacts.phone,
        email: m.Contacts.email,
        address: m.Contacts.address,
        registration: m.Contacts.registration,
        footerRights: m.Footer.rights,
        // the wording of the interface, so an editor finds every word of the
        // page in the admin rather than all but the six in the navigation
        nav: {
          about: m.Header.about,
          jobs: m.Header.jobs,
          reviews: m.Header.reviews,
          founders: m.Header.founders,
          contacts: m.Header.contacts,
          home: m.Header.home,
        },
        buttons: {
          whatsapp: m.Contacts.whatsapp,
          whatsappJobs: m.Jobs.whatsapp,
          whatsappJobsText: m.Jobs.whatsappText,
          reviewPrev: m.Reviews.prev,
          reviewNext: m.Reviews.next,
          themeToggle: m.Header.themeToggle,
          langSwitch: m.Header.langSwitch,
          floorNav: m.Header.floorNav,
        },
        notFound: {
          title: m.NotFound.title,
          body: m.NotFound.body,
          home: m.NotFound.home,
          drawing: m.NotFound.drawing,
        },
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
