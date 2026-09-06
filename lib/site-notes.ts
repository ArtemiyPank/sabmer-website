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
  /** small line under the number (a founder's role) */
  caption?: string;
};

export type SiteNotes = {
  hero: SiteNote;
  about: SiteNote;
  founders: SiteNote[];
  careers: SiteNote;
  contacts: SiteNote;
};
