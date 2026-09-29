import path from "path";
import { fileURLToPath } from "url";
import { buildConfig, ValidationError } from "payload";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { SITE_URL } from "@/lib/site";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/** the shortest password the admin accepts (see the users collection) */
const MIN_PASSWORD = 12;

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
      auth: {
        /**
         * The session cookie is sent over HTTPS only, wherever the site is
         * really served over HTTPS. Payload's default is `secure: false`,
         * which lets a browser that is sent to http://…/admin — a typed
         * address, an old link — hand the session over in the clear before
         * the redirect to https has happened. `VERCEL` rather than NODE_ENV
         * for the reason `site` below gives: a production build on a
         * developer's machine is served over plain http, and a cookie it may
         * not set would lock its own admin out.
         */
        cookies: { secure: Boolean(process.env.VERCEL) },
      },
      admin: { useAsTitle: "email" },
      hooks: {
        /**
         * Payload asks nothing of a password but three characters. The five
         * wrong guesses and ten-minute lock it does have (its defaults) make
         * guessing slow, not hopeless, and a short enough password is found
         * well inside a year of that. Twelve is the floor for an account that
         * can rewrite the whole site.
         *
         * This runs wherever a password is chosen in the admin — creating an
         * account, changing one's own. The emailed reset link is the one path
         * it does not see, and that path cannot be used here: there is no
         * email adapter, so no reset link is ever sent.
         */
        beforeValidate: [
          ({ data }) => {
            const password = (data as { password?: unknown } | undefined)?.password;
            if (typeof password === "string" && password.length < MIN_PASSWORD) {
              throw new ValidationError({
                collection: "users",
                errors: [
                  {
                    message: `Пароль должен быть не короче ${MIN_PASSWORD} символов`,
                    path: "password",
                  },
                ],
              });
            }
            return data;
          },
        ],
      },
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
                /**
                 * The company's number, and the only contact detail with a
                 * field of its own: it is what the WhatsApp buttons dial and
                 * what the Work plate opens a chat on, so it cannot be one row
                 * among others. A number is a number in every language, so it
                 * is not localized — there is one of it to keep current.
                 */
                { name: "phone", type: "text" },
                // the registration carries a word — "ח.פ." — so it is written
                // per language even though the number in it never changes
                { name: "registration", type: "text", localized: true },
                /**
                 * Everything else the section says, added and removed from
                 * here rather than by a developer. An email, a second number,
                 * an office — the page has no opinion about what these are.
                 *
                 * Localized, like every other list in this config: a line is
                 * written in the language it is read in, and a language left
                 * empty falls back to Russian.
                 */
                {
                  name: "contactLines",
                  type: "array",
                  localized: true,
                  label: "Строки контактов",
                  labels: { singular: "Строка", plural: "Строки" },
                  fields: [
                    { name: "text", type: "text", required: true },
                    {
                      name: "href",
                      type: "text",
                      label: "Ссылка (необязательно)",
                      admin: {
                        description:
                          "Куда ведёт строка, если по ней можно нажать: https://…, mailto:… или tel:… Оставьте пустым для обычного текста.",
                      },
                    },
                  ],
                },
              ],
            },
            {
              label: "Footer",
              fields: [{ name: "footerRights", type: "text", localized: true }],
            },
            {
              /**
               * The wording of the interface itself — the navigation, what
               * the buttons say, the page for an address that does not exist.
               *
               * It used to live only in messages/{locale}.json, on the reasoning
               * that microcopy belongs to the build and business content to the
               * CMS. That line is invisible to whoever is editing: they open the
               * admin, find every word of the page except the six in the
               * navigation, and have to ask a developer for those. Everything
               * the visitor reads is here now, and anything left empty falls
               * back to the file (see i18n/request.ts).
               */
              label: "Интерфейс",
              fields: [
                {
                  name: "nav",
                  type: "group",
                  label: "Навигация",
                  fields: [
                    { name: "about", type: "text", localized: true },
                    { name: "jobs", type: "text", localized: true },
                    { name: "reviews", type: "text", localized: true },
                    { name: "founders", type: "text", localized: true },
                    { name: "contacts", type: "text", localized: true },
                    { name: "home", type: "text", localized: true },
                  ],
                },
                {
                  name: "buttons",
                  type: "group",
                  label: "Кнопки",
                  fields: [
                    { name: "whatsapp", type: "text", localized: true },
                    { name: "whatsappJobs", type: "text", localized: true },
                    {
                      name: "whatsappJobsText",
                      type: "textarea",
                      localized: true,
                      label: "Текст, подставляемый в чат",
                    },
                    { name: "reviewPrev", type: "text", localized: true },
                    { name: "reviewNext", type: "text", localized: true },
                    { name: "themeToggle", type: "text", localized: true },
                    { name: "langSwitch", type: "text", localized: true },
                    { name: "floorNav", type: "text", localized: true },
                  ],
                },
                {
                  name: "notFound",
                  type: "group",
                  label: "Страница 404",
                  fields: [
                    { name: "title", type: "text", localized: true },
                    { name: "body", type: "textarea", localized: true },
                    { name: "home", type: "text", localized: true },
                    { name: "drawing", type: "text", localized: true, label: "Описание схемы для чтения с экрана" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
