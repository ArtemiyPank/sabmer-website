import path from "path";
import { fileURLToPath } from "url";
import { buildConfig } from "payload";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import sharp from "sharp";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default buildConfig({
  secret: process.env.PAYLOAD_SECRET || "",
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
              ],
            },
            {
              label: "Founders",
              fields: [
                { name: "foundersTitle", type: "text", localized: true },
                {
                  name: "founders",
                  type: "array",
                  localized: true,
                  maxRows: 4,
                  fields: [
                    { name: "name", type: "text", required: true },
                    { name: "role", type: "text" },
                    { name: "bio", type: "textarea" },
                    { name: "photo", type: "upload", relationTo: "media" },
                  ],
                },
              ],
            },
            {
              label: "Careers",
              fields: [
                { name: "careersTitle", type: "text", localized: true },
                { name: "careersIntro", type: "textarea", localized: true },
                {
                  name: "careersOffers",
                  type: "array",
                  localized: true,
                  labels: { singular: "Offer", plural: "Offers" },
                  fields: [{ name: "text", type: "text", required: true }],
                },
                { name: "careersRolesTitle", type: "text", localized: true },
                {
                  name: "careersRoles",
                  type: "array",
                  localized: true,
                  labels: { singular: "Role", plural: "Roles" },
                  fields: [{ name: "text", type: "text", required: true }],
                },
                { name: "careersApply", type: "text", localized: true },
              ],
            },
            {
              label: "Contacts",
              fields: [
                { name: "contactsTitle", type: "text", localized: true },
                { name: "phone", type: "text" },
                { name: "email", type: "email" },
                { name: "address", type: "text", localized: true },
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
