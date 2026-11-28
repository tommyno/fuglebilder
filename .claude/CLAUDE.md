# Fuglebilder — notes for coding agents

Norwegian bird-photo site. Astro + Preact islands, TypeScript, deployed on Vercel with ISR. Photos and names come from iNaturalist. Keep this file up to date when a decision below changes. It holds decisions and why, constraints and outside quirks, not looks: the CSS is the truth for how things look, so a visual tweak needs no edit here. README.md is for people and stays non-technical.

## Commands

```bash
pnpm dev          # http://localhost:4321 (launch config "fuglebilder")
pnpm check        # type check, run after changes
pnpm build        # production build (Vercel output in .vercel/output)
pnpm build:index  # refresh data/ from iNaturalist (~4 min, ~1 req/s)
pnpm build:icons  # re-render PNG app icons and the og:image card (public/og-image.png) from public/favicon.svg
```

Use pnpm, never npm or yarn (version pinned in `packageManager`). Deploys: GitHub → Vercel (framework preset Astro), every push to `main` goes live and PRs get preview deploys.

## Layout

| Path | What |
|---|---|
| `src/pages/index.astro` | Front page, static. Both views in the page: every bird seen in Norway A–Å (`BirdGrid`), and with `#verden` 24 random (`RandomBirds`, fetched once that view shows). `BrowseNav` on top |
| `src/pages/fugl/[slug].astro` | Species photo grid, on demand + ISR (24 h). Slug = Norwegian name (Latin when there is none), accents folded, e.g. `/fugl/svarttrost`. Unknown slugs are 404. The photo filter is kept in `?vis=` |
| `src/pages/familier/[slug].astro` | A family's species, static (`getStaticPaths`: the data is committed, so no ISR or cold start). The area switch (`BrowseNav` without the Familier switch) under the title: Norge shows the species seen in Norway, `#verden` every living species in one A–Å list (no Sett i Norge part: the switch already does that), then Utdødde arter under their own heading. No switch when the views would be the same or Norge empty (no species seen in Norway, or all of them). Links carry the area: a species page adds `#verden` for a bird not seen in Norway (it isn't in the Norge view), and `/familier`'s world view links to `#verden`. A species page links to its family by name, no breadcrumb trail. Slug = Norwegian family name, e.g. `/familier/snipefamilien` |
| `src/pages/familier/index.astro` | The front page's Familier view, static (same `BrowseNav`, so no back link or visible title): families as tiles, A–Å, wholly extinct ones last; both views in the page. Not grouped by order: names like Apodiformes added nothing |
| `src/components/BrowseNav.astro` | Top of the front page and /familier (and, the area switch alone, family pages): the area switch (Sett i Norge \| Hele verden) and a Familier switch, one compact row, then a grey count line per area ("Viser 280 arter sett i Norge"; the front page's world view has its own line with "Vis nye"), as tall as that line so switching doesn't move the grid. Both views are in the page (`data-area="norge"` / `"verden"`); `#verden` in the address shows the world one through `:target` + `:has()` in `global.css`, which works without JS. The area links `location.replace()` the hash, so switching adds no history entry and Back (and Tilbake) leaves the page instead of flipping between the views; without JS they're plain links. `:target` only matches once a new page has loaded, so following the Familier switch showed Norge, then jumped to Verden: a tiny inline script in `Base.astro`'s `<head>` sets `data-view="verden"` before the first paint and drops it on the first hash change. Path routes (`/verden/…`) were considered and dropped: they'd double every family URL. The area switch is `#norge` / `#verden` links. Familier is a link to `/familier` (or back to `/`), there twice so it keeps the area (`/familier#verden`). Not remembered between visits |
| `src/components/Segmented.module.css` | Shared look for a few choices side by side (the photo filters, the area switch) |
| `src/lib/families.server.ts` | Loads `data/families.json`: families with slugs, species A–Å, cover photo |
| `src/components/BackLink.astro` | "Tilbake": history back when you came from the site, else the front page |
| `src/pages/mine-fugler.astro` | Favorites, static shell rendered on the client from localStorage |
| `src/pages/om.astro` | About page (static): what the site is, iNaturalist and licenses, GitHub link |
| `src/components/Footer.astro` | Footer on every page: tagline + link to `/om` |
| `src/pages/api/search/[q].json.ts` | Norwegian + Latin search, top 12 (server only) |
| `src/pages/api/photos/[taxon]/[filter]/[page].json.ts` | Photos best first (see below). `filter` = `alle`, `voksen`, `ungfugl`, `hann` or `hunn` |
| `src/pages/api/random/[seed].json.ts` | 24 random birds (seed in the path so each set is cached) |
| `src/lib/species.server.ts` | Loads the index; search, random pool, Norwegian list |
| `src/lib/slug.ts` | `foldAccents`, `slugify`, `slugClashes`. No imports, so `scripts/build-index.mjs` can import it too |
| `src/lib/lightbox.ts` | PhotoSwipe full view: caption, credit, heart, `?photo=n` so Back closes it |
| `src/lib/thumbs.ts` | Thumb's fade-in, for every grid image (islands too: `Thumb` is a plain `<img>`). Plain HTML grids (front page Sett i Norge, `/familier`, family pages) aren't islands: hydrating them only for the fade put the whole list in the page twice |
| `src/components/Button.module.css` | Shared button look for `<a>` and `<button>`, in `.astro` and Preact alike: `.button` plus `.ghost` or `.primary`. Don't restyle buttons locally |
| `src/components/RedList.astro` | Small status pills under the species name: introduced in Norway, Norway's red list, IUCN's, extinct. The header stays compact: family name above the species name, the Latin name links to Store norske leksikon |
| `src/lib/favorites.ts` | nanostores favorites persisted to localStorage, shared between islands |
| `scripts/build-index.mjs` | Writes `data/species.json`, `data/slug-clashes.json` and `data/families.json` |

## Data

- `data/species.json` (~760 KB): every active iNat species under Aves (taxon 3) with taxon id, Latin name, Norwegian names, worldwide observation count, research-grade observations in Norway (place 7016), an open-licensed photo, red-list status and whether it's introduced in Norway (see below). Committed so builds never depend on iNat. Bundled with the server function only; never ship it to the browser.
- Species with no open-licensed photo and no sightings (~300) are dropped when the index loads (`species.server.ts`): their photo page could only be empty, so no page, no search hit, and ~11,080 remain. The site says "over 11 000 fuglearter" as plain text (footer, /om, titles), not computed.
- `data/families.json`: iNat's 258 bird families (Norwegian names where iNat has them, all but 11) and each family's species ids, from `ancestor_ids` on the taxon list. A family page shows species with a photo; Sett i Norge uses the same rule as the front page (seen at least 3 times).
- **Extinct species** (iNat's `extinct` flag, ~150 with a photo; unlike IUCN's EX it also covers birds gone before 1500, like the moas): their photos are mostly skeletons and museum specimens, so a family page shows them in their own "Utdødde arter" part at the bottom, and wholly extinct families come last on `/familier`, marked "utdødd". The species page's status pills say "Utdødd" when IUCN doesn't already say EX/EW.
- `data/slug-clashes.json`: ids of species whose name slug is already taken by a more observed species; their slug gets the Latin name appended (`/fugl/blavingebladfugl-chloropsis-cochinchinensis`).
- **Red-list status** ("CR/NT": Norway's list, then IUCN's worldwide one). IUCN's threatened statuses (NT and up, EX, EW) come from `conservation_status` on the taxon list (authority "IUCN Red List", no place). iNat leaves LC/DD out there, so those come from `observations/species_counts?csi=`, which also matches regional lists that map to the category (kanadagås came back VU), so it only fills in species with no threatened status. Norway's (Artsdatabanken, place 7016, newest list year) comes from each Norwegian bird's own taxon record, because the `cs=&place_id=7016` filter also matches Svalbard's list and global statuses. Shown only on the species page (`RedList.astro`) in IUCN's own colours (`--redlist-*`), never on grid tiles (too noisy). LC is shown too, so you can compare Norway with the world.
- **Introduced in Norway** (kanadagås, fasan …): from the same taxon records, `listed_taxa` for place 7016 with `establishment_means: "introduced"` (iNat's Norway checklist). Shown as "Innført i Norge" as a status pill on the species page.
- Photos are hotlinked from `inaturalist-open-data.s3.amazonaws.com` (`medium` in the grid, `large` in full view). No Vercel image optimization.

## Rules and why

- **Server values go in the URL path, never `?query`.** Vercel ISR ignores query strings, so `?x=` values would be cached as one page. Client-only state (`?vis=`, `?photo=`) may use the query.
- **Norwegian only** (bokmål), UI and search. Search matches Norwegian and Latin names. ~750 of ~11,400 species have no Norwegian name and are shown by Latin name. iNat has no nynorsk names. Display: Norwegian name with Latin under it.
- **Search matching:** lowercase, accents dropped, ø→o, æ→ae, spaces and hyphens removed ("kjottmeis", "svart trost", "svartrost" all work). Ranking: exact > ends with > prefix > word prefix > substring > fuzzy (1–2 typos), then popularity. "Ends with" handles Norwegian compounds ("meis" → kjøttmeis). Species seen in Norway get a popularity boost (blåmeis before amerikameis). One result per species.
- **Licenses:** the site is non-commercial for good, so every CC license is allowed, NC and ND included. Credit (photographer + license, linking to the observation) is shown in the full view.
- **Photo order** (`alle`): iNat's curated taxon photos, then sightings annotated "Alive" by votes, then other sightings by votes. Research grade only, cover photo of each sighting only, at least 800 px long edge, no panoramas (aspect > 2.5). Skip sightings annotated dead or feathers/tracks/bones, and ones whose description says dead/roadkill/carcass (several languages).
- **Age/sex filters require "Alive" too,** and skip curated photos. Many dead birds carry an age or sex annotation with no dead annotation or telling description. iNat's API can't combine two annotation filters, so "Alive" is checked server side and a filtered page can come back short. One filter at a time.
- **Sett i Norge** (Norske fugler): species seen in Norway at least 3 times (research grade), ~280, A–Å. The minimum drops one-off strays and escapes. **Hele verden** (Tilfeldige fugler): 24 picked uniformly from every species with a photo, a Norwegian name and at least 50 sightings worldwide (~7,600; fewer sightings means a nearly empty photo page); 100,000 possible sets, each cached by its seed. Going to Hele verden keeps the tab's current set; only "Vis nye" in the line above the grid deals a new one. Norge is the default; Hele verden is `#verden` in the address (see `BrowseNav.astro`).
- **Look:** photo first, light theme only (no dark mode), big touch targets for tablets. System font at light weights: headings stand out by size, not weight. CSS Modules / Astro scoped styles + custom properties in `src/styles/variables.css`. Colours are a plain palette named by look (`--color-white`, `--color-green`, `--color-red` …) used directly; only composite values like `--scrim` and the shadows get their own names, plus the IUCN red-list colours (`--redlist-cr` …), which are an outside standard. No Tailwind.
- **Link previews:** `Base.astro` writes canonical, og:* and twitter:card on every page, with absolute URLs from `site` in `astro.config.mjs` (path only, no query). Species pages use their iNat photo (`large`) as og:image; other pages use the logo card `public/og-image.png`. Facebook wants og:image explicit on every page.
- **No database, no login.** Fits the free Vercel plan.

## Not done yet

Other languages, dark mode, location/date per photo, Wikipedia facts, and a tab of public-domain bird plates (Audubon, Gould and others) from the Biodiversity Heritage Library.
