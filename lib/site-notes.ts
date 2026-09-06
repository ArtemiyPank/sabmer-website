/**
 * The page text in the shape the 3D scene needs it: one note per section,
 * each pinned to a component of the elevator so it travels with that part as
 * the car comes apart. Built on the server (it is the same copy the flow
 * sections render) and handed to the canvas layer.
 */
export type SiteNote = {
  /** sheet number shown in the balloon */
  n: string;
  title: string;
  body?: string;
  /** bullet list (careers offers, contact lines) */
  items?: string[];
  /** small line under the title (a founder's role) */
  caption?: string;
};

export type SiteNotes = {
  hero: SiteNote;
  about: SiteNote;
  founders: SiteNote[];
  careers: SiteNote;
  contacts: SiteNote;
};
