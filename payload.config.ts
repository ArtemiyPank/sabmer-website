import path from "path";
import { fileURLToPath } from "url";
import { buildConfig } from "payload";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { SITE_URL } from "@/lib/site";

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

/**
 * The origin the admin holds its requests to (CORS and CSRF), and only where
 * the site is really served from it.
 *
 * `VERCEL` is set by Vercel on its own builds and by nothing else, which is
 * the question being asked: is this the deployment, or a copy of it? A
 * production build run anywhere else — the demo on a developer's machine, a
 * colleague's laptop — would otherwise hold its admin to an origin it is not
 * being served from, and lock itself out of its own login. Checking NODE_ENV
 * would do exactly that: `next build` sets it to production everywhere.
 */
const site = process.env.VERCEL ? SITE_URL : process.env.NEXT_PUBLIC_SITE_URL;

export default buildConfig({
  secret,
  ...(site ? { serverURL: site, cors: [site], csrf: [site] } : {}),
  db: postgresAdapter({
    /**
     * `DATABASE_URI` is ours, and local development sets it. The other two are
     * what the Neon integration writes into the project on Vercel: the modern
     * name and the legacy one, both pooled. Reading all three means the
     * database works whichever of them the integration decides to set.
     *
     * Migrations do not come through here — they are given the direct
     * connection instead, because data-definition statements through a
     * transaction pooler are not reliable (see `migrate:deploy`).
     */
    pool: {
      connectionString:
        process.env.DATABASE_URI ||
        process.env.DATABASE_URL ||
        process.env.POSTGRES_URL ||
        "",
    },
    /**
     * The schema is moved by migrations, never by the adapter — here as well
     * as in production.
     *
     * Left to push, the adapter reshapes whatever database it is pointed at to
     * match the config, which is convenient right up until the two databases
     * stop being the same: a field renamed here and pushed only here leaves
     * the deployed one querying columns it does not have, and Payload builds
     * one query for the whole global, so a single missing table takes the
     * entire read down. That is not hypothetical — it is how this project
     * spent a month silently serving its fallback copy.
     *
     * So: change the config, run `npm run migrate:create`, commit what it
     * writes. `npm run migrate` brings any database up to it, and the deploy
     * runs it before the build (see vercel.json).
     */
    push: false,
  }),
  editor: lexicalEditor(),
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
