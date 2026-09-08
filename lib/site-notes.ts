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
};

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
