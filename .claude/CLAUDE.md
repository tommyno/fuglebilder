# Fuglebilder — notes for coding agents

Norwegian bird-photo site. Astro + Preact islands, TypeScript, deployed on Vercel with ISR. Photos and names come from iNaturalist. Keep this file up to date when a decision below changes; README.md is for people and stays non-technical.

## Commands

```bash
pnpm dev          # http://localhost:4321 (launch config "fuglebilder")
pnpm check        # type check, run after changes
pnpm build        # production build (Vercel output in .vercel/output)
pnpm build:index  # refresh data/ from iNaturalist (~4 min, ~1 req/s)
pnpm build:icons  # re-render PNG app icons from public/favicon.svg
```

Use pnpm, never npm or yarn (version pinned in `packageManager`). Deploys: GitHub → Vercel (framework preset Astro), every push to `main` goes live and PRs get preview deploys.

## Layout

| Path | What |
|---|---|
| `src/pages/index.astro` | Front page: search + Sett i Norge (static) / Hele verden (random) |
| `src/pages/fugl/[slug].astro` | Species photo grid, on demand + ISR (24 h). Slug = Norwegian name (Latin when there is none), accents folded, e.g. `/fugl/svarttrost`. Unknown slugs are 404. Photo filter kept in `?vis=`. |
| `src/pages/mine-fugler.astro` | Favorites, static shell rendered on the client from localStorage |
| `src/pages/om.astro` | About page (static): what the site is, iNaturalist and licenses, GitHub link |
| `src/components/Footer.astro` | One-line footer on every page (forest green, `--color-green-dark`): tagline + link to `/om` |
| `src/pages/api/search/[q].json.ts` | Norwegian + Latin search, top 12 (server only) |
| `src/pages/api/photos/[taxon]/[filter]/[page].json.ts` | Photos best first (see below). `filter` = `alle`, `voksen`, `ungfugl`, `hann` or `hunn` |
| `src/pages/api/random/[seed].json.ts` | 24 random birds (seed in the path so each set is cached) |
| `src/pages/api/norwegian-birds.json.ts` | Every bird seen in Norway, A–Å (static, build time; browsers cache it a day via `vercel.json`) |
| `src/lib/species.server.ts` | Loads the index; search, random pool, Norwegian list |
| `src/lib/slug.ts` | `foldAccents`, `slugify`, `slugClashes`. No imports, so `scripts/build-index.mjs` can import it too |
| `src/lib/lightbox.ts` | PhotoSwipe full view: caption, credit, heart, `?photo=n` so Back closes it |
| `src/components/Button.module.css` | Shared button look for `<a>` and `<button>`, in `.astro` and Preact alike: `.button` plus `.ghost` (quiet, grey on hover) or `.primary` (accent fill). Don't restyle buttons locally |
| `src/lib/favorites.ts` | nanostores favorites persisted to localStorage, shared between islands |
| `scripts/build-index.mjs` | Writes `data/species.json` and `data/slug-clashes.json` |

## Data

- `data/species.json` (~760 KB): every active iNat species under Aves (taxon 3) with taxon id, Latin name, Norwegian names, worldwide observation count, research-grade observations in Norway (place 7016) and an open-licensed photo. Committed so builds never depend on iNat. Bundled with the server function only; never ship it to the browser.
- Species with no open-licensed photo and no sightings (~300) are dropped when the index loads (`species.server.ts`): their photo page could only be empty, so no page, no search hit, and they're not in the species count on /om and in the footer (~11,080).
- `data/slug-clashes.json`: ids of species whose name slug is already taken by a more observed species; their slug gets the Latin name appended (`/fugl/blavingebladfugl-chloropsis-cochinchinensis`).
- Photos are hotlinked from `inaturalist-open-data.s3.amazonaws.com` (`medium` in the grid, `large` in full view). No Vercel image optimization.

## Rules and why

- **Server values go in the URL path, never `?query`.** Vercel ISR ignores query strings, so `?x=` values would be cached as one page. Client-only state (`?vis=`, `?photo=`) may use the query.
- **Norwegian only** (bokmål), UI and search. Search matches Norwegian and Latin names. ~750 of ~11,400 species have no Norwegian name and are shown by Latin name. iNat has no nynorsk names. Display: Norwegian name with Latin under it.
- **Search matching:** lowercase, accents dropped, ø→o, æ→ae, spaces and hyphens removed ("kjottmeis", "svart trost", "svartrost" all work). Ranking: exact > ends with > prefix > word prefix > substring > fuzzy (1–2 typos), then popularity. "Ends with" handles Norwegian compounds ("meis" → kjøttmeis). Species seen in Norway get a popularity boost (blåmeis before amerikameis). One result per species.
- **Licenses:** the site is non-commercial for good, so every CC license is allowed, NC and ND included. Credit (photographer + license, linking to the observation) is shown in the full view.
- **Photo order** (`alle`): iNat's curated taxon photos, then sightings annotated "Alive" by votes, then other sightings by votes. Research grade only, cover photo of each sighting only, at least 800 px long edge, no panoramas (aspect > 2.5). Skip sightings annotated dead or feathers/tracks/bones, and ones whose description says dead/roadkill/carcass (several languages).
- **Age/sex filters require "Alive" too,** and skip curated photos. Many dead birds carry an age or sex annotation with no dead annotation or telling description. iNat's API can't combine two annotation filters, so "Alive" is checked server side and a filtered page can come back short. One filter at a time.
- **Sett i Norge** (Norske fugler): species seen in Norway at least 3 times (research grade), ~280, A–Å. The minimum drops one-off strays and escapes. **Hele verden** (Tilfeldige fugler): 24 picked uniformly from every species with a photo, a Norwegian name and at least 50 sightings worldwide (~7,600; fewer sightings means a nearly empty photo page); 100,000 possible sets, each cached by its seed. The "Hele verden" chip keeps the tab's current set; only "Vis nye" in the line above the grid ("Viser 24 tilfeldige arter") deals a new one. Sett i Norge is the default; the front-page choice is remembered per browser.
- **Look:** photo first, light theme only (no dark mode), big touch targets for tablets. System font at light weights (body 400 by default, headings 500, labels 500, bird names on photos and chips 600): headings stand out by size, not weight. CSS Modules / Astro scoped styles + custom properties in `src/styles/variables.css`. Colours are a plain palette named by look (`--color-white`, `--color-green`, `--color-red` …) used directly; only composite values like `--scrim` and the shadows get their own names. No Tailwind.
- **No database, no login.** Fits the free Vercel plan.

## Not done yet

Other languages, dark mode, location/date per photo, Wikipedia facts, and a tab of public-domain bird plates (Audubon, Gould and others) from the Biodiversity Heritage Library.
