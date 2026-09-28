import type { SiteNote } from "@/lib/site-notes";

/**
 * A plate, set as a card instead of as a texture.
 *
 * The site has two ways of showing the same five plates: lettered onto the
 * machine for a browser that can run the scene, and set in the flowing layout
 * for one that cannot. They used to be written out twice — once as the `notes`
 * handed to the drawing, once as hand-built sections here — and the two drifted
 * apart exactly as two copies of anything do: the cards carried the address and
 * the founders' names, the plates carried a sheet number and the registration,
 * and neither carried the other's.
 *
 * So there is one description of a plate now and two renderers for it. Whatever
 * the drawing letters, this sets; a field added to one appears in both, and
 * neither can quietly fall behind.
 *
 * `components/elevator3d/parts/Engraved.tsx` is the other renderer, and the
 * order of the parts here follows it: sheet line, rule, title, body, list,
 * sub-entries, button.
 */
export default function NoteSheet({
  note,
  className = "",
}: {
  note: SiteNote;
  className?: string;
}) {
  return (
    <div className={`sheet ${className}`}>
      <p
        className="font-mono text-xs tracking-wide"
        style={{ color: "var(--bp-accent)" }}
      >
        {note.n} &nbsp;·&nbsp; {(note.caption ?? "SABMER").toUpperCase()}
      </p>
      <hr
        className="mt-2 border-0"
        style={{ height: 1, backgroundColor: "var(--bp-accent)" }}
      />

      <h2 className="sheet-title mt-5">{note.title}</h2>

      {note.body ? (
        <p className="mt-4 leading-relaxed opacity-90">{note.body}</p>
      ) : null}

      {note.items?.length ? (
        <ul className="mt-4 space-y-2">
          {note.items.map((line) => (
            <li key={line} className="flex gap-2 text-sm leading-relaxed">
              <span aria-hidden="true" style={{ color: "var(--bp-accent)" }}>
                ·
              </span>
              <span className="opacity-90">{line}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {note.blocks?.map((b) => (
        <div key={b.title} className="mt-6">
          <hr
            className="border-0"
            style={{ height: 1, backgroundColor: "var(--bp-accent)" }}
          />
          <h3 className="mt-4 text-lg font-semibold">{b.title}</h3>
          {b.caption ? (
            <p
              className="mt-1 font-mono text-xs tracking-wide"
              style={{ color: "var(--bp-accent)" }}
            >
              {b.caption.toUpperCase()}
            </p>
          ) : null}
          {b.body ? (
            <p className="mt-3 text-sm leading-relaxed opacity-90">{b.body}</p>
          ) : null}
        </div>
      ))}

      {/*
        The drawing shows one card at a time and the arrows page through them;
        a card has nothing to page with, so it sets them all. Same entries, all
        of them visible at once.
      */}
      {note.cards?.map((card, i) => (
        <div key={`${card.name}-${i}`} className="mt-6">
          <hr
            className="border-0"
            style={{ height: 1, backgroundColor: "var(--bp-accent)" }}
          />
          <h3 className="mt-4 text-lg font-semibold">{card.name}</h3>
          {card.period ? (
            <p
              className="mt-1 font-mono text-xs tracking-wide"
              style={{ color: "var(--bp-accent)" }}
            >
              {card.period.toUpperCase()}
            </p>
          ) : null}
          {card.text ? (
            <p className="mt-3 text-sm leading-relaxed opacity-90">{card.text}</p>
          ) : null}
          {card.contact ? (
            <p className="mt-3 text-sm">
              <a
                className="opacity-70 hover:opacity-100"
                href={`tel:${card.contact.replace(/[^+\d]/g, "")}`}
              >
                {card.contact}
              </a>
            </p>
          ) : null}
        </div>
      ))}

      {note.action ? (
        <div className="mt-8">
          <a
            href={note.action.href}
            target={note.action.href.startsWith("http") ? "_blank" : undefined}
            rel={note.action.href.startsWith("http") ? "noopener noreferrer" : undefined}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80"
            style={{
              borderColor: "var(--bp-accent)",
              color: "var(--bp-accent)",
              backgroundColor: "color-mix(in srgb, var(--bp-accent) 12%, transparent)",
            }}
          >
            {note.action.label}
          </a>
        </div>
      ) : null}
    </div>
  );
}
