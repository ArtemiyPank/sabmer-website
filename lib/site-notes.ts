/**
 * The page text in the shape the 3D scene needs it: one note per section.
 * Used by the "on detail" layout, which letters each section onto the surface
 * of the elevator component it belongs to.
 */
export type SiteNote = {
  /** sheet number shown above the title */
  n: string;
  title: string;
  body?: string;
  items?: string[];
  /** small line beside the number */
  caption?: string;
  /** sub-entries listed under the title (the two founders share one plate) */
  blocks?: { title: string; caption?: string; body?: string }[];
  /**
   * Entries the plate shows one at a time, paged by the arrows that appear
   * when the tour parks on it. Only the reviews plate uses this.
   */
  cards?: ReviewCard[];
  /**
   * Runs inside `body` a reader can act on — a number to dial, an address to
   * write to.
   *
   * The plate ignores this and letters the body as it stands: it is a texture
   * and cannot carry a link. The card wraps each run in an anchor. Same words
   * either way — only one of the two can be pressed, which is the one
   * difference between the renderers that is not a choice.
   */
  links?: { text: string; href: string }[];
  /**
   * A button printed at the foot of the plate. The plate is a texture and
   * cannot carry a link, so the page lays a transparent anchor over it — see
   * `lib/plate-action.ts`.
   */
  action?: { label: string; href: string; mark?: "whatsapp" };
};

/**
 * A phone number or an email address set inside running text, fenced off
 * from the bidirectional algorithm.
 *
 * On the Hebrew page the line around it runs right to left, and "+972 55-994-0205"
 * is not one thing to that algorithm: the leading "+" is a neutral character,
 * so it takes the direction of the line and lands at the far end — the number
 * renders as "55-994-0205 972+". An isolate says this run is left-to-right and
 * nothing outside it may reach in, which leaves the line itself right-to-left
 * and the number intact.
 *
 * It is done to the note rather than in a renderer because both renderers need
 * it and only one of them is HTML: the flowing layout could use <bdi>, the
 * plate is drawn into a canvas and has nothing but the string. Canvas applies
 * the same algorithm, isolates included (measured).
 */
export const ltr = (s: string) => `\u2066${s}\u2069`;

/**
 * Where a link written in the admin may point.
 *
 * `href` on a contact line is whatever somebody typed, so it is checked twice:
 * here, where the note is built, so a bad one is never serialised to the
 * browser at all, and again where the anchor is written. These three are what
 * a contact line could reasonably be — a page, a mailbox, a number — and
 * anything else (`javascript:` being the one that matters) is dropped and the
 * line is set as plain text.
 */
export const canOpen = (href: string) => /^(https?:|mailto:|tel:)/i.test(href);

export type ReviewCard = {
  name: string;
  period: string;
  text: string;
  contact: string;
};

export type SiteNotes = {
  about: SiteNote;
  jobs: SiteNote;
  reviews: SiteNote;
  founders: SiteNote;
  contacts: SiteNote;
};
