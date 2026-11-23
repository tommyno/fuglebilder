# Fuglebilder

A Norwegian site for browsing bird photos. Search any bird by its Norwegian or Latin name, browse community-voted photos, swipe through them full screen, and save favorites. See [SPEC.md](SPEC.md) and [RESEARCH.md](RESEARCH.md).

## Develop

```bash
npm install
npm run dev        # http://localhost:4321
npm run check      # type check
npm run build      # production build (Vercel output in .vercel/output)
```

## Data

`data/species.json` holds every bird species on iNaturalist (~11,400) with its Norwegian names, how often it has been seen in Norway, and an open-licensed thumbnail. It is committed, so builds never depend on iNaturalist being up. Refresh it occasionally (takes ~4 minutes, about 1 request/second):

```bash
npm run build:index
```

## How it fits together

| Path | What |
|---|---|
| `src/pages/index.astro` | Front page: search + random birds (static) |
| `src/pages/fugl/[slug].astro` | Species photo grid, rendered on demand and cached by Vercel ISR |
| `src/pages/mine-fugler.astro` | Mine fugler / favorites (localStorage, client only) |
| `src/pages/api/search/[q].json.ts` | Norwegian + Latin search over the index (server only) |
| `src/pages/api/photos/[taxon]/[filter]/[page].json.ts` | Photos best first: iNat's curated species photos, then sightings marked alive, then the rest. No dead birds, carcasses or feathers. `filter` is `alle`, or `voksen`/`ungfugl`/`hann`/`hunn` for sightings annotated with that life stage or sex and as alive. |
| `src/pages/api/random/[seed].json.ts` | 24 random well-known birds from anywhere in the world |
| `src/pages/api/norske.json.ts` | Every bird seen in Norway, A–Å (static) |
| `src/lib/lightbox.ts` | PhotoSwipe full view with caption, credit, heart and `?photo=n` history |

Dynamic values go in the URL path, not `?query`, because Vercel ISR ignores query strings.

## Deploy

Push to GitHub, import the repo in Vercel (framework preset: Astro).

Photos: © their iNaturalist observers, under the Creative Commons license shown on each photo.
