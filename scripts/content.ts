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

type Data = Record<string, unknown>;

/** the shipped copy for one locale, in the shape the global holds it */
function contentFor(locale: string): Data {
  const m = read(locale);
  return {
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
    registration: m.Contacts.registration,
    // nothing shipped: what the section says beyond the number is added in the
    // admin. Listed here so a reset clears it — `blanks` skips an empty list,
    // so the deploy never proposes it and never reports itself unfinished
    contactLines: [],
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
  };
}

/** writes every locale of the site-content global */
export async function writeContent(payload: Payload) {
  for (const locale of LOCALES) {
    await payload.updateGlobal({ slug: "site-content", locale, data: contentFor(locale) });
    console.log(`  site-content [${locale}]`);
  }
}

/** whatever `stored` has nothing to say about, taken from `shipped` */
function blanks(shipped: Data, stored: Data | undefined): Data {
  const out: Data = {};
  for (const [k, v] of Object.entries(shipped)) {
    const have = stored?.[k];
    if (Array.isArray(v)) {
      // an empty shipped list has nothing to offer, and offering it on every
      // deploy would mean this never reports itself done
      if (v.length && (!Array.isArray(have) || have.length === 0)) out[k] = v;
    } else if (v && typeof v === "object") {
      const under = blanks(v as Data, (have ?? undefined) as Data | undefined);
      if (Object.keys(under).length > 0) out[k] = under;
    } else if (have === null || have === undefined || have === "") {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Fills in the fields nobody has written yet, and touches nothing else.
 *
 * A field left empty falls back to messages/{locale}.json, so the page reads
 * the same either way — but the admin does not: whoever opens it sees a blank
 * box where a heading should be, with no way to tell what the site currently
 * says or what they are replacing. The point of moving this copy into the CMS
 * was that every word of the site could be read and changed there, and a blank
 * box is neither.
 *
 * So: after a deploy adds fields, they arrive holding what the site already
 * says. Anything an editor has written stays exactly as they wrote it —
 * `blanks` only ever proposes a value where there is none.
 *
 * `fallbackLocale: false` matters. The global falls back to Russian when a
 * language has nothing of its own, so reading it the ordinary way shows a
 * Hebrew field as filled when it is empty, and the Hebrew page would go on
 * quietly reading Russian.
 */
export async function fillBlanks(payload: Payload) {
  for (const locale of LOCALES) {
    const stored = (await payload.findGlobal({
      slug: "site-content",
      locale,
      fallbackLocale: false,
      depth: 0,
    })) as unknown as Data;
    const data = blanks(contentFor(locale), stored);
    const n = Object.keys(data).length;
    if (n === 0) continue;
    await payload.updateGlobal({ slug: "site-content", locale, data });
    console.log(`  site-content [${locale}]: filled ${n} empty field(s)`);
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
