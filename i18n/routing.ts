import { defineRouting } from "next-intl/routing";

/**
 * The three languages the site is written in, and the one a visitor gets when
 * none of them is theirs.
 *
 * The order is the order they are offered in. English is the fallback rather
 * than the commonest language here: a visitor whose browser asks for Hebrew or
 * Russian is sent to it either way, so the default is only ever read by
 * somebody who speaks none of the three — and English is the one of them they
 * are likeliest to make something of. It is also what `x-default` points a
 * search engine at, for the same reason.
 *
 * Note this is not the CMS's default (see `localization` in payload.config.ts).
 * That one decides which language a field falls back to when it has been left
 * empty in another, and the people writing the content write it in Russian.
 */
export const routing = defineRouting({
  locales: ["ru", "he", "en"],
  defaultLocale: "en",
});
