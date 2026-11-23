# Fuglebilder — research notes (2026-11-23)

## 1. Bird names (all species, many languages, Latin)

| Source | What you get | License | Notes |
|---|---|---|---|
| **iNaturalist API** (`api.inaturalist.org/v1`) | ~11,400 bird species. Common names in ~40 locales incl. `nb`, plus Latin. Autocomplete endpoint takes `locale=nb`. | Free, no key. Names are factual data | **Tested:** `kjøttmeis` → *Parus major*, and `parus maj` → Great Tit. Rate limit ~60 req/min, so cache on our side. |
| **Wikidata** (SPARQL) | Every bird taxon with labels in every language Wikipedia has, incl. `nb`, `nn` and Northern Sámi `se`. Also a link to its Wikimedia Commons image | **CC0** | **Tested:** *Parus major* → kjøttmeis (nb/nn), buoidegaccet (se), talgoxe (sv), talitiainen (fi). Good for building a static index. |
| **IOC World Bird List, multilingual** (worldbirdnames.org) | Authoritative checklist, ~11k species, ~30 languages incl. Norwegian (added in v14.1, 2024) | CC BY 3.0/4.0 (sources disagree; credit IOC either way) | Spreadsheet download, not an API. Best source for the "official" names. |
| eBird/Clements taxonomy | 90+ name locales | Free with an API key, eBird terms | More restrictive terms. Not needed. |

**Recommendation:** build **one combined species index at build time**: iNat taxon id, Latin name, and **all common names in all languages** (Wikidata can fill gaps later). Search matches across every language at once, so no language picker is needed.

**Tested cross-language matching** (iNat autocomplete): `svarttrost`, `blackbird` and `amsel` → *Turdus merula*. `blackbird` also finds the Red-winged Blackbird, so we rank by popularity. `black bird` (with a space) fails on iNat, so our own matcher ignores spaces and hyphens.

**Measured size:** popular species have ~52 distinct names, rarer ones ~16–20. That's about 450–1,100 bytes per species raw, so about **6 MB raw / 2 MB compressed** for all 11,400. Too heavy to download and search in the browser, so **search runs in a Vercel function** (`/api/search/[q].json`, cached per query). The index never reaches the browser.

## 2. Free and open images

| Source | Content | License | Fit |
|---|---|---|---|
| **iNaturalist observations** | Real wild-bird photos. Kjøttmeis alone has **24,000+** research-grade photos licensed CC0/CC BY/CC BY-SA. Can sort by community votes, so the best photos come first. | Per photo: CC0, CC BY, CC BY-SA (filter out NC if you want, but NC is fine for a non-commercial site) | ★★★ Main source. Images are served from the AWS Open Data bucket `inaturalist-open-data`, which is allowed for hotlinking. Sizes: square/small/medium/large/original. |
| **Wikimedia Commons** | Curated, often high-quality photos | CC BY / CC BY-SA / PD | ★★ Good backup. Fewer photos per species, attribution metadata is messier. |
| **Biodiversity Heritage Library** (Flickr + API) | Public-domain **bird paintings and plates** (Audubon, Gould, Naumann, von Wright…) | Public domain | ★★ Classic illustrations, a nice alternative to photos. Mapping plates to species is patchy. Possibly a later "Illustrations" tab. |
| Openverse API | Aggregated CC images | Varies | ★ Noisy. Skip. |
| Macaulay Library / eBird media | Excellent | **Not open** | ✗ |

Attribution: CC BY requires credit. Show "© photographer · CC BY" in the full-screen view, with a link to the iNat observation.

## 3. Tech stack (Vercel)

- **Astro + TypeScript, with Preact islands** for the interactive parts (search, photo grid, favorites). **Chosen.** Next.js would also work, but this site doesn't need it, and Astro ships less JavaScript and suits plain CSS.
- **Vercel:** official `@astrojs/vercel` adapter. Pages and endpoints with `export const prerender = false` are rendered on demand. **ISR** (`isr: { expiration: 86400 }`) caches them after the first request. Docs checked: ISR **ignores query strings**, so dynamic values go in the path (`/api/photos/[taxonId]/[page].json`).
- **i18n:** none. The UI is English only, and bird names come from the cross-language index.
- **Search:** the server-side matcher over the combined index (see §1). Normalized (case, accents, spaces/hyphens), ranked exact > prefix > word prefix > fuzzy, with popularity as a tie-breaker.
- **Photos:** an Astro endpoint proxies the iNaturalist API with ISR caching. Visitors don't hit iNat's rate limit, and repeat requests are instant. Images load straight from the iNat S3 bucket (no Vercel image optimization, so no image costs).
- **Grid and full-screen view:** CSS grid + **PhotoSwipe** (plain JavaScript; swipe, pinch-zoom, keyboard arrows, well tested on mobile Safari).
- **Shared favorites:** nanostores, persisted to localStorage.
- **Styling:** CSS Modules + CSS custom properties, light theme (no Tailwind). Large touch targets and big type for tablets.
- **No database, no login.** Hobby (free) Vercel plan is enough.
