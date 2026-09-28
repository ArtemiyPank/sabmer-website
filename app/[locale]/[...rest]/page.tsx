import { notFound } from "next/navigation";

/**
 * Anything under a locale that is not the site itself.
 *
 * A nested `not-found.tsx` is only reached by a route that matches and then
 * calls `notFound()`; an address that matches nothing at all falls past it to
 * the framework's own bare page. Catching the address here, at the lowest
 * priority any route can have, is what puts it back inside the locale — with
 * the fonts, the theme chosen before first paint, and the translations that
 * ../not-found.tsx needs to say anything.
 */
export default function CatchAll() {
  notFound();
}
