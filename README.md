# SABMER

One-page site for a subcontractor installing Mitsubishi lifts. The page is a
drawing of a lift: the copy is lettered onto the machine itself, and scrolling
runs the camera down the hoistway from one plate to the next.

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
```

| script | what it does |
| --- | --- |
| `npm run dev` | development server |
| `npm run build` / `npm start` | production build and serve |
| `npm run lint` | eslint |
| `npm run typecheck` | tsc, no emit |
| `npm run seed` | fill the CMS from `messages/*.json` and create the first admin |
| `npm run types` | regenerate `payload-types.ts` after editing `payload.config.ts` |

`.env.example` lists the environment it expects. Without a reachable database
the site still renders: content falls back to `messages/{locale}.json`.

## Where things are

```
app/[locale]/page.tsx     the five sections, and the notes lettered onto the machine
app/(debug)/debug3d       a harness for the 3D scene alone (query params below)
components/elevator3d/    the machine: one file per assembly, plus the camera tour
components/elevator/      the backdrop that hosts the scene, and a 2D fallback
components/site/          header, floor panel, review arrows, scroll behaviour
lib/tuning.ts             every number that decides how the page feels
lib/content.ts            CMS content with a fallback to messages/
messages/                 ru · he · en
```

### Settings

`lib/tuning.ts` holds the dials: the coast, the camera tour, navigation, what
the renderer is asked for, and how the drawing follows the scroll. Two things
cannot live there and say so where they are — the height of a section
(`--tour-section` in `app/globals.css`) and the per-stop framing in the `STOPS`
table in `components/elevator3d/tour.ts`.

Geometry is not tuning: the millimetres of the machine are in
`components/elevator3d/dims.ts`.

### How scrolling behaves

While the visitor is driving — a finger on the glass, a hand on the wheel —
the page is entirely theirs and may cross as many plates as they push it
through. The coast that follows is ours: `components/site/ScrollSnap.tsx`
measures the speed they let go at and runs the coast itself, so it has a speed
ceiling and cannot carry the page across a plate. A coast too weak to reach the
next plate is left alone.

### The 3D harness

`/debug3d` renders the scene on its own. `?p=0.4` fixes the progress, `&mobile=1`
takes the mobile path, `&labels=0` drops the callouts, `&only=car,rails` renders
a subset of the assemblies.

## Content

Copy lives in `messages/{ru,he,en}.json` and can be overridden per locale from
the Payload admin at `/admin`. `npm run seed` pushes the JSON into the CMS.

Still placeholders, waiting on real values: the phone, the email and the
company registration number in `Contacts`, and the three employee reviews in
`Reviews`.
