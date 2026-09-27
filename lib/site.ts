/**
 * Canonical site URL for metadata, sitemap and JSON-LD.
 *
 * The fallback is the real domain, so a build that forgets the variable still
 * says the right thing in its canonical links and sitemap. The variable is
 * kept because `payload.config.ts` reads it too, and there it must stay unset
 * in local development: setting it there would hold the admin's CORS and CSRF
 * to the live origin and lock the local one out.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://sabmer.co.il";
