/**
 * Seeds the CMS from messages/{ru,he,en}.json and creates the first admin
 * user if none exists. Idempotent: overwrites the site-content global.
 *
 * Run: npx payload run scripts/seed.ts
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { readFileSync } from "fs";

const locales = ["ru", "he", "en"] as const;

const read = (locale: string) =>
  JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"));

const payload = await getPayload({ config });

// --- first admin user (dev credentials; change in production) ---
const existing = await payload.find({ collection: "users", limit: 1 });
if (existing.totalDocs === 0) {
  await payload.create({
    collection: "users",
    data: { email: "admin@sabmer.example", password: "sabmer-admin" },
  });
  console.log("Created admin user: admin@sabmer.example / sabmer-admin");
} else {
  console.log("Admin user already exists, skipping");
}

// --- site content per locale ---
for (const locale of locales) {
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
      foundersTitle: m.Founders.title,
      founders: [
        { name: m.Founders.amirName, role: m.Founders.amirRole, bio: m.Founders.amirBio },
        { name: m.Founders.vovaName, role: m.Founders.vovaRole, bio: m.Founders.vovaBio },
      ],
      careersTitle: m.Careers.title,
      careersIntro: m.Careers.intro,
      careersOffers: Object.values(m.Careers.offers).map((text) => ({ text: text as string })),
      careersRolesTitle: m.Careers.rolesTitle,
      careersRoles: Object.values(m.Careers.roles).map((text) => ({ text: text as string })),
      careersApply: m.Careers.apply,
      contactsTitle: m.Contacts.title,
      phone: m.Contacts.phone,
      email: m.Contacts.email,
      address: m.Contacts.address,
      footerRights: m.Footer.rights,
    },
  });
  console.log(`Seeded site-content [${locale}]`);
}

process.exit(0);
