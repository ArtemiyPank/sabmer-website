/**
 * Canonical site URL for metadata, sitemap, JSON-LD — and, where the site is
 * actually deployed, the origin the admin holds its requests to.
 *
 * Three sources, in order. `NEXT_PUBLIC_SITE_URL` is ours and exists only as
 * an override: nothing sets it by default, and it is deliberately left unset
 * in local development (see payload.config.ts). `VERCEL_PROJECT_PRODUCTION_URL`
 * is set by Vercel itself and always holds the project's production domain, so
 * the site follows the domain without anybody having to remember a variable —
 * it is a bare host, hence the scheme. The literal is the floor: a build run
 * anywhere else still says the right thing rather than inventing a hostname.
 */
const vercelDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL;
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (vercelDomain ? `https://${vercelDomain}` : "https://sabmer.co.il");
