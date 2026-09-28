"use client";

import { Children, cloneElement, isValidElement, useSyncExternalStore } from "react";
import { getReview, subscribeReview } from "@/lib/reviews";

/**
 * Shows one of its children at a time — the same one the plate is lettered
 * with, paged by the same arrows.
 *
 * The card used to set every review at once, on the reasoning that a card has
 * nothing to page with. It does: ReviewArrows is not part of the drawing, it
 * is fixed over the page and appears in either layout when the scroll reaches
 * the reviews. So the flowing layout was showing two arrows that did nothing
 * and a list the plate never shows in one piece.
 *
 * Which one is current is decided by the same number
 * `components/elevator3d/parts/Engraved.tsx` letters from, so the two cannot
 * come apart: press an arrow and both move.
 *
 * Every child is still written into the HTML, and hidden by a stylesheet rule
 * rather than by leaving it out. A visitor with no JavaScript gets no arrows
 * either, so hiding the rest would put them out of reach for good — the
 * <noscript> block in the layout brings them all back.
 */
export default function PagedCards({ children }: { children: React.ReactNode }) {
  const items = Children.toArray(children);
  const at = useSyncExternalStore(subscribeReview, getReview, () => 0);
  const i = items.length ? ((at % items.length) + items.length) % items.length : 0;

  return (
    <div className="paged">
      {/*
        With scripting off the arrows can never move, so the hiding rule would
        put every card but the first out of reach. Content inside <noscript> is
        only parsed when that is the case, which is exactly when the rule has
        to go.
      */}
      <noscript>
        <style>{`.paged > [data-card] { display: revert !important }`}</style>
      </noscript>
      {items.map((child, k) =>
        isValidElement(child)
          ? cloneElement(child as React.ReactElement<Record<string, unknown>>, {
              "data-card": "",
              "data-current": k === i ? "" : undefined,
            })
          : child
      )}
    </div>
  );
}

/**
 * Which of them is on show, as the plate writes it in its title block: "2 / 3".
 *
 * The drawing puts this where a sheet number goes, in place of the company
 * name, because on a plate that pages the useful thing to say there is where
 * you are in the set. The card says the same, from the same number.
 */
export function CardCounter({ total }: { total: number }) {
  const at = useSyncExternalStore(subscribeReview, getReview, () => 0);
  return <>{`${total ? ((at % total) + total) % total + 1 : 0} / ${total}`}</>;
}
