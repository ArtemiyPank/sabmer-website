import path from "path";
import { fileURLToPath } from "url";
import { buildConfig } from "payload";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import sharp from "sharp";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Sessions are signed with this. An empty one signs them with nothing, so a
 * missing variable has to stop the build rather than quietly ship an admin
 * anyone can forge a cookie for.
 */
const secret = process.env.PAYLOAD_SECRET;
if (!secret) {
  throw new Error("PAYLOAD_SECRET is not set — see .env.example");
}

/** the site's own origin, when it is known: requests are held to it */
const site = process.env.NEXT_PUBLIC_SITE_URL;

export default buildConfig({
  secret,
  ...(site ? { serverURL: site, cors: [site], csrf: [site] } : {}),
  db: postgresAdapter({
    // DATABASE_URI (local dev) or DATABASE_URL (injected by Vercel/Neon)
    pool: {
      connectionString:
        process.env.DATABASE_URI || process.env.DATABASE_URL || "",
    },
  }),
  editor: lexicalEditor(),
  sharp,
  // content is edited per locale, mirroring the site's next-intl locales
  localization: {
    locales: [
      { code: "ru", label: "Русский" },
      { code: "he", label: "עברית", rtl: true },
      { code: "en", label: "English" },
    ],
    defaultLocale: "ru",
    fallback: true,
  },
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  collections: [
    {
      slug: "users",
      auth: true,
      admin: { useAsTitle: "email" },
      fields: [],
    },
    {
      slug: "media",
      upload: {
        staticDir: path.resolve(dirname, "public/media"),
        imageSizes: [
          { name: "thumbnail", width: 240, height: 240, position: "centre" },
          { name: "card", width: 640 },
        ],
        mimeTypes: ["image/*"],
      },
      fields: [{ name: "alt", type: "text", localized: true }],
    },
  ],
  globals: [
    {
      slug: "site-content",
      label: "Site content",
      access: { read: () => true },
      fields: [
        {
          type: "tabs",
          tabs: [
            {
              label: "Meta",
              fields: [
                { name: "metaTitle", type: "text", localized: true },
                { name: "metaDescription", type: "textarea", localized: true },
              ],
            },
            {
              label: "Hero",
              fields: [
                { name: "heroTagline", type: "text", localized: true },
                { name: "heroSub", type: "textarea", localized: true },
                { name: "heroCtaContact", type: "text", localized: true },
                { name: "heroCtaCareers", type: "text", localized: true },
              ],
            },
            {
              label: "About",
              fields: [
                { name: "aboutTitle", type: "text", localized: true },
                { name: "aboutText", type: "textarea", localized: true },
                {
                  name: "aboutStages",
                  type: "array",
                  localized: true,
                  labels: { singular: "Line", plural: "Lines" },
                  fields: [{ name: "text", type: "text", required: true }],
                },
              ],
            },
            {
              label: "Founders",
              fields: [
                { name: "foundersTitle", type: "text", localized: true },
                { name: "foundersText", type: "textarea", localized: true },
                {
                  name: "founders",
                  type: "array",
                  localized: true,
                  maxRows: 4,
                  fields: [
                    { name: "name", type: "text", required: true },
                    { name: "role", type: "text" },
                    { name: "photo", type: "upload", relationTo: "media" },
                  ],
                },
              ],
            },
            {
              label: "Work",
              fields: [
                { name: "jobsTitle", type: "text", localized: true },
                { name: "jobsIntro", type: "textarea", localized: true },
                {
                  name: "jobsTerms",
                  type: "array",
                  localized: true,
                  labels: { singular: "Term", plural: "Terms" },
                  fields: [{ name: "text", type: "text", required: true }],
                },
                { name: "jobsApply", type: "text", localized: true },
              ],
            },
            {
              label: "Reviews",
              fields: [
                { name: "reviewsTitle", type: "text", localized: true },
                {
                  name: "reviews",
                  type: "array",
                  localized: true,
                  labels: { singular: "Review", plural: "Reviews" },
                  fields: [
                    { name: "name", type: "text", required: true },
                    { name: "period", type: "text" },
                    { name: "text", type: "textarea" },
                    { name: "contact", type: "text" },
                  ],
                },
              ],
            },
            {
              label: "Contacts",
              fields: [
                { name: "contactsTitle", type: "text", localized: true },
                { name: "phone", type: "text" },
                { name: "email", type: "email" },
                { name: "address", type: "text", localized: true },
                { name: "registration", type: "text" },
              ],
            },
            {
              label: "Footer",
              fields: [{ name: "footerRights", type: "text", localized: true }],
            },
          ],
        },
      ],
    },
  ],
});
