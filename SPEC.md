# Fuglebilder — spec

A site for browsing photos of birds.
Research behind these choices: [RESEARCH.md](RESEARCH.md).

## Decisions (interview 2026-11-23, plus follow-ups)

| # | Topic | Decision |
|---|---|---|
| 1 | Languages | **Norwegian only** (bokmål), UI and search (changed 2026-11-23). Search matches **Norwegian and Latin names**: "svarttrost", "svart trost", "svartrost" (typo) and "Turdus merula" all find the same bird. 10,640 of 11,387 species have a Norwegian name; the rest are found and shown by their Latin name. iNaturalist has no nynorsk names. |
| 2 | Species scope | **The whole world** (~11,400 species), **Norway first**. Ranked by name-match quality, then popularity: worldwide observation count plus a boost for species seen in Norway (iNat place 7016, research grade). "meis" → kjøttmeis, blåmeis before amerikameis. |
| 3 | Search | Big search field with **live suggestions with thumbnails**: Norwegian name, Latin name, and "også kalt …" when an alternative Norwegian name matched. Tapping one opens that species' photo grid. Spaces/hyphens ignored, ø/æ/å optional ("kjottmeis" works). |
| 4 | Licenses | Non-commercial site forever. Photos licensed **CC0, CC BY, CC BY-SA, CC BY-NC, CC BY-NC-SA, CC BY-ND, CC BY-NC-ND** are all allowed. Credit shown in full view. |
| 5 | Extras | **Favorites ("My birds")** saved in localStorage, no login. |
| 6 | Front page | Two buttons, no heading: **Tilfeldige fugler** (shuffle icon) and **Norske fugler**; the one showing is green. The choice is remembered per browser. **Tilfeldige fugler:** 24 random birds, a new set on every click, picked uniformly from the 800 most observed species worldwide (with a photo and a Norwegian name). **Norske fugler:** every species seen in Norway at least 3 times (iNat place 7016, research grade), about 280, sorted A–Å by Norwegian name; the minimum leaves out one-off strays and escapes. |
| 7 | Style | **Clean, photo-first, light theme only** (no dark mode). Big touch targets. **CSS Modules + CSS custom properties, no Tailwind.** |
| 8 | Displayed names | Norwegian name with the Latin name under it. Latin only when there is no Norwegian name. |
| 9 | Full view | Swipe/arrow between photos. Overlay shows the name, Latin name, a small credit (photographer + license, linking to the iNat observation) and a heart. Tap to hide the overlay. Pinch to zoom. |
| 10 | Framework | **Astro + Preact islands**, TypeScript. |
| 11 | Hosting | Private **GitHub repo → Vercel**, auto-deploy, preview deploys on PRs. |

## Routes

Values the server needs go in the **path**, not in `?query` values, because Vercel ISR ignores query strings.

| Route | Rendering | What it does |
|---|---|---|
| `/` | Static | Search field, "Mine fugler" link, random-birds grid |
| `/fugl/[taxonId]-[slug]` (e.g. `/fugl/12716-svarttrost`) | On demand + ISR (cached 24 h) | Species photo grid. Other slugs redirect to the canonical one. |
| `/mine-fugler` | Static shell | Favorites, rendered on the client from localStorage |
| `/api/search/[q].json` | On demand + ISR | Norwegian + Latin species search, top 12 results |
| `/api/photos/[taxonId]/[filter]/[page].json` | On demand + ISR | Photos, best first, sorted automatically: (1) iNat's curated photos for the species, (2) sightings annotated "Alive", most votes first, (3) other sightings, most votes first. Research grade and open licenses only, cover photo of each sighting only, at least 800 px, no panoramas. Skips sightings annotated dead or as feathers/tracks/bones, and ones whose description says dead/roadkill/carcass (English, Norwegian and a few other languages). `filter` = `alle` for that order; `voksen`, `ungfugl`, `hann` or `hunn` returns only sightings with that iNat annotation (Life Stage / Sex) that are also annotated "Alive", most votes first, same exclusions, no curated photos. Plenty of dead birds carry an age or sex annotation without a dead one or a telling description, so unannotated sightings are left out. One filter at a time: iNat's API can't combine annotation filters, so "Alive" is checked server-side and a page can come back short. The bird page keeps the choice in `?vis=`. |
| `/api/random/[seed].json` | On demand + ISR | 24 random well-known birds that have a photo and a Norwegian name |
| `/api/norske.json` | Static (build time) | Every bird seen in Norway (at least 3 times), A–Å |

The full view is client-side only. `?photo=n` is updated in the URL, so the back button closes it.

## Data

- **Build-time name index** (`scripts/build-index.mjs`): every active iNat species under Aves (taxon 3), with taxon id, Latin name, Norwegian names, observation count, number of observations in Norway and an open-licensed photo (default photo, or the first open-licensed taxon photo). Output: `data/species.json`, about 760 KB, bundled with the server function only. Re-run occasionally.
- **Matching:** names are normalized (lowercase, accents removed, ø→o, æ→ae, spaces and hyphens removed). Ranking: exact > ends with (Norwegian compounds: "meis" → kjøttmeis) > prefix > word prefix > substring > fuzzy (1–2 typos), plus popularity (with the Norway boost). One result per species.
- **Photos** are hotlinked from `inaturalist-open-data.s3.amazonaws.com`: `medium` in the grid, `large` in full view. No Vercel image optimization.

## Interactive parts (islands)

Search box + suggestions · photo grid (infinite scroll, full view, hearts) · random grid + shuffle · My birds page. The rest is plain HTML.

## Stack

- **Framework:** Astro + Preact islands (decided 2026-11-23) with `@astrojs/vercel` (`isr: { expiration: 86400 }`).
- **Full view:** PhotoSwipe.
- **Favorites shared between islands:** nanostores (persisted to localStorage).
- **Styling:** CSS Modules / Astro scoped styles.
- **Hosting:** Vercel Hobby plan. No auth, no database.

## Out of scope for v1

Other languages, dark mode, old bird illustrations tab, photo filters, location/date info, Wikipedia facts.
