import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withPayload } from "@payloadcms/next/withPayload";

const withNextIntl = createNextIntlPlugin();

/**
 * Response headers that cost nothing to send and close things the platform
 * leaves open by default.
 *
 * The Content-Security-Policy is deliberately the half that does not touch
 * scripts or styles. Constraining those properly needs a nonce on every inline
 * script Next.js writes, and a nonce makes every page render per request — the
 * home page would lose its cache for a policy that guards against an injection
 * the site has no way in for (every string is set as text; nothing from the
 * CMS is ever parsed as markup). What is here needs none of that:
 *
 * - `frame-ancestors 'none'` (and X-Frame-Options for browsers that predate
 *   it): no other site may put these pages in a frame. The admin is the reason
 *   — framed invisibly over a decoy, its buttons can be clicked by someone who
 *   thinks they are clicking something else.
 * - `base-uri 'self'`: a stray <base> cannot re-point every relative URL.
 * - `object-src 'none'`: no plugins.
 * - `form-action 'self'`: a form can only ever submit to this site.
 *
 * HSTS is not set here: Vercel already sends it on every response.
 */
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // nothing on the site asks for any of these, so nothing embedded in it may
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
  // a page this site opens cannot reach back into it through window.opener
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  // Payload would otherwise add "X-Powered-By: Next.js, Payload" — a free
  // answer to the first question anyone probing the site asks
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withPayload(withNextIntl(nextConfig));
