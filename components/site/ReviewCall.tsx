"use client";

import { useSyncExternalStore } from "react";
import { getReview, subscribeReview } from "@/lib/reviews";
import PlateAction from "./PlateAction";

/**
 * The number the review on show is signed with, made dialable.
 *
 * The plate prints one card at a time and the arrows page through them, so
 * which number the button carries changes under the visitor — this follows the
 * same index the lettering does.
 */
export default function ReviewCall({ contacts }: { contacts: string[] }) {
  const review = useSyncExternalStore(subscribeReview, getReview, () => 0);
  if (contacts.length === 0) return null;
  const contact = contacts[((review % contacts.length) + contacts.length) % contacts.length];
  if (!contact) return null;
  return <PlateAction stop="reviews" href={`tel:${contact.replace(/[^+\d]/g, "")}`} label={contact} />;
}
