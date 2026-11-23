import type { APIRoute } from 'astro';
import { getSpecies } from '../../../../lib/species.server';
import { json, notFound } from '../../../../lib/http.server';
import type { Photo } from '../../../../lib/shared';

export const prerender = false;

// GET /api/photos/12716/1.json — photos of one species, best first, cached so
// visitors never hit iNaturalist's rate limit. Order:
//   1. iNat's curated photos for the species (page 1 only; the same set the
//      front page's photo comes from)
//   2. sightings people have annotated "Alive", most community votes first
//   3. all other sightings, most votes first, minus anything marked or
//      described as dead, and feathers/tracks/bones etc.
// Only the first (cover) photo of each sighting is used: later ones are
// usually worse angles of the same bird.

const API = 'https://api.inaturalist.org/v1';
const UA = { 'User-Agent': 'birdpic.net' };
const PER_PAGE = 30;
const MAX_PAGE = Math.floor(10_000 / PER_PAGE); // iNat stops paging at 10k results
const LICENSES = 'cc0,cc-by,cc-by-sa,cc-by-nc,cc-by-nc-sa,cc-by-nd,cc-by-nc-nd';
const OPEN_PHOTO = /^https:\/\/inaturalist-open-data\.s3\.amazonaws\.com\/photos\/(\d+)\/[a-z]+\.(\w+)$/;
const MIN_LONG_EDGE = 800; // skip tiny crops

// iNat annotations: "Alive or Dead" (17): Alive 18, Dead 19.
// "Evidence of Presence" (22): Organism 24; others are feathers, tracks, bones, scat, eggs, nests.
// Plus words in the description/tags, for dead birds nobody has annotated.
const DEAD_WORDS =
  /\b(dead|died|dying|roadkill|road kill|carcass|corpse|window strike|window kill|d[øo]d|d[øo]de|d[øo]dt|kadaver|trafikkdrept|overkj[øo]rt|tot|tote|mort|morte|muerto|muerta|morto|morta)\b/i;

interface INatPhoto {
  url?: string;
  license_code?: string | null;
  original_dimensions?: { width: number; height: number } | null;
  attribution_name?: string | null;
}
interface INatObservation {
  id: number;
  description?: string | null;
  tags?: string[];
  user?: { login?: string; name?: string | null };
  annotations?: { controlled_attribute_id: number; controlled_value_id: number }[];
  photos?: INatPhoto[];
}
interface ObsPage {
  total_results: number;
  results: INatObservation[];
}

const has = (o: INatObservation, attr: number, value: number) =>
  (o.annotations ?? []).some((a) => a.controlled_attribute_id === attr && a.controlled_value_id === value);

const notALiveBird = (o: INatObservation) =>
  has(o, 17, 19) ||
  (o.annotations ?? []).some((a) => a.controlled_attribute_id === 22 && a.controlled_value_id !== 24) ||
  DEAD_WORDS.test(`${o.description ?? ''} ${(o.tags ?? []).join(' ')}`);

function toPhoto(p: INatPhoto | undefined, by: string, obs?: number): Photo | null {
  const m = p?.license_code && p.url?.match(OPEN_PHOTO);
  const dims = p?.original_dimensions;
  if (!m || !dims?.width || !dims?.height) return null;
  const long = Math.max(dims.width, dims.height);
  const short = Math.min(dims.width, dims.height);
  if (long < MIN_LONG_EDGE || long / short > 2.5) return null; // tiny, or panorama strips
  return { p: `${m[1]}.${m[2]}`, w: dims.width, h: dims.height, by, lic: p!.license_code!, ...(obs ? { obs } : {}) };
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`iNaturalist responded ${res.status} for ${url}`);
  return res.json() as Promise<T>;
}

const observations = (taxon: number, page: number, alive: boolean) =>
  getJson<ObsPage>(
    `${API}/observations?taxon_id=${taxon}&photo_license=${LICENSES}&quality_grade=research&photos=true` +
      `&order_by=votes&order=desc&per_page=${PER_PAGE}&page=${page}` +
      (alive ? '&term_id=17&term_value_id=18' : ''),
  );

async function curatedPhotos(taxon: number): Promise<Photo[]> {
  try {
    const data = await getJson<{ results: { taxon_photos?: { photo: INatPhoto }[] }[] }>(`${API}/taxa/${taxon}`);
    const out: Photo[] = [];
    for (const { photo } of data.results[0]?.taxon_photos ?? []) {
      const p = toPhoto(photo, photo.attribution_name || 'ukjent');
      if (p) out.push(p);
    }
    return out;
  } catch (err) {
    console.error(err);
    return []; // the sightings are enough on their own
  }
}

function fromObservations(results: INatObservation[], skipAlive: boolean): Photo[] {
  const out: Photo[] = [];
  for (const o of results) {
    if (notALiveBird(o)) continue;
    if (skipAlive && has(o, 17, 18)) continue; // already shown on the "alive" pages
    const p = toPhoto(o.photos?.[0], o.user?.name || o.user?.login || 'ukjent', o.id);
    if (p) out.push(p);
  }
  return out;
}

export const GET: APIRoute = async ({ params }) => {
  const taxon = Number(params.taxon);
  const page = Number(params.page);
  if (!getSpecies(taxon) || !Number.isInteger(page) || page < 1 || page > 2 * MAX_PAGE) return notFound();

  try {
    const [curated, alive] = await Promise.all([
      page === 1 ? curatedPhotos(taxon) : Promise.resolve([]),
      observations(taxon, Math.min(page, MAX_PAGE), true),
    ]);
    const alivePages = Math.ceil(Math.min(alive.total_results, MAX_PAGE * PER_PAGE) / PER_PAGE);

    let photos: Photo[];
    let hasMore: boolean;
    if (page <= alivePages) {
      photos = [...curated, ...fromObservations(alive.results, false)];
      hasMore = true; // more "alive" pages, or the other sightings after them
    } else {
      const restPage = page - alivePages;
      const rest = restPage <= MAX_PAGE ? await observations(taxon, restPage, false) : { total_results: 0, results: [] };
      photos = [...curated, ...fromObservations(rest.results, true)];
      hasMore = restPage < MAX_PAGE && restPage * PER_PAGE < rest.total_results;
    }

    // curated photos often also appear among the sightings
    const seen = new Set<string>();
    photos = photos.filter((p) => !seen.has(p.p) && seen.add(p.p));
    return json({ photos, hasMore });
  } catch (err) {
    console.error(err);
    return json({ error: 'Could not reach iNaturalist' }, { status: 502 });
  }
};
