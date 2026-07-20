import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// next-intl's handler works as a Next 16 proxy: it redirects `/` to the
// best-matching locale and serves `/ru`, `/he`, `/en` path prefixes.
export default createMiddleware(routing);

export const config = {
  // Skip API routes, Next internals and files with an extension
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
