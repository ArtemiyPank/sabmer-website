/**
 * The shipped copy for a language, loaded by name from a fixed list.
 *
 * Both places that load it used to build the path from the locale —
 * `import(\`@/messages/${locale}.json\`)` — and one of them was reached before
 * the locale had been checked. A request for /foo.bar never passes through the
 * i18n proxy (anything with a dot in it is taken for a static file and let by),
 * so it arrives at the layout with "foo.bar" as its locale, and the layout's
 * metadata went looking for messages/foo.bar.json. The bundler only ever
 * packs the three real files, so nothing else could be read — but every such
 * request was a server error, on demand, for anyone.
 *
 * With the files named here there is nothing to build a path from: a language
 * is one of these three keys or the call does not type-check.
 */
const MESSAGES = {
  ru: () => import("@/messages/ru.json"),
  he: () => import("@/messages/he.json"),
  en: () => import("@/messages/en.json"),
} as const;

export type MessagesLocale = keyof typeof MESSAGES;

export async function loadMessages(locale: MessagesLocale) {
  return (await MESSAGES[locale]()).default;
}
