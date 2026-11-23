# Fuglebilder

Fuglebilder is a Norwegian website for exploring photos of a single bird species. Pick a bird and browse hundreds of photos of it, taken by people all over the world.

### Features:
- **Find any bird in the world** by typing its Norwegian or Latin name.
- **See the best photos first.** Photos are taken by people on [iNaturalist](https://www.inaturalist.org) and sorted by their votes. 
- **Filters** Show only adults, young birds, males or females.
- **Swipe through photos full screen,** and pinch to zoom.
- **Save favorites** under "Mine fugler". They stay in your browser, with no account needed.
- **Browse** every bird seen in Norway, A–Å, or a random set of birds from around the world.

## Running it on your computer

You need [Node.js](https://nodejs.org) and [pnpm](https://pnpm.io).

```bash
pnpm install
```

```bash
pnpm dev
```

Then open http://localhost:4321.

## Updating the bird list

The list of birds and their Norwegian names is stored in the `data` folder, so the site works even if iNaturalist is down. Refresh it now and then to pick up new names and sightings. It takes about four minutes:

```bash
pnpm build:index
```

## Photo credits

Every photo belongs to the [iNaturalist](https://www.inaturalist.org) user who took it and is shared under the Creative Commons license shown with the photo. The full-screen view names the photographer and links to the original sighting.
