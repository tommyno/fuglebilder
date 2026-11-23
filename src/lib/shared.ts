// Code shared by the server and the browser.

import clashes from '../../data/slug-clashes.json';
import { foldAccents, slugify } from './slug';

export { foldAccents, slugify };

/** Species whose Norwegian name slug is taken by a more observed one; see slugClashes(). */
const CLASHES = new Set<number>(clashes);

export interface Taxon {
  id: number;
  sci: string;
  /** Norwegian name, null when the species has none */
  name: string | null;
}

/** A photo as returned by /api/photos and stored in favorites. */
export interface Photo {
  /** "<photoId>.<ext>" on the iNaturalist open-data bucket */
  p: string;
  w: number;
  h: number;
  /** photographer */
  by: string;
  /** license code, e.g. "cc-by-nc" */
  lic: string;
  /** iNaturalist observation id (missing for iNat's curated species photos) */
  obs?: number;
}

/**
 * Photo filters on the bird page, as they appear in ?vis= and the API path.
 * Each one is an iNaturalist annotation (Life Stage = 1, Sex = 9). iNat can only
 * filter on one annotation per query, so the filters can't be combined.
 */
export const PHOTO_FILTERS = {
  voksen: { label: 'Voksen', kind: 'alder', term: 1, value: 2 },
  ungfugl: { label: 'Ungfugl', kind: 'alder', term: 1, value: 8 },
  hann: { label: 'Hann', kind: 'kjønn', term: 9, value: 11 },
  hunn: { label: 'Hunn', kind: 'kjønn', term: 9, value: 10 },
} as const;

export type PhotoFilter = keyof typeof PHOTO_FILTERS;

export const isPhotoFilter = (v: string | null | undefined): v is PhotoFilter =>
  !!v && Object.hasOwn(PHOTO_FILTERS, v);

export type PhotoSize = 'square' | 'small' | 'medium' | 'large' | 'original';

const PHOTO_BASE = 'https://inaturalist-open-data.s3.amazonaws.com/photos';

export function photoUrl(photo: string, size: PhotoSize): string {
  const dot = photo.lastIndexOf('.');
  return `${PHOTO_BASE}/${photo.slice(0, dot)}/${size}.${photo.slice(dot + 1)}`;
}

/** The Norwegian name, or the Latin one when there is none. */
export const displayName = (t: Pick<Taxon, 'sci' | 'name'>) => t.name ?? t.sci;

/** "svarttrost"; Latin name when there is no Norwegian one, or appended when the Norwegian one is taken. */
export function birdSlug(t: Taxon): string {
  const slug = slugify(displayName(t));
  return CLASHES.has(t.id) ? `${slug}-${slugify(t.sci)}` : slug;
}

/** /fugl/svarttrost */
export const birdPath = (t: Taxon) => `/fugl/${birdSlug(t)}`;

/** Fetch JSON from our own API; rejects on HTTP errors. */
export async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json() as Promise<T>;
}

/** Where the credit links to: the sighting, or the photo's own page on iNaturalist. */
export const sourceUrl = (photo: Photo) =>
  photo.obs
    ? `https://www.inaturalist.org/observations/${photo.obs}`
    : `https://www.inaturalist.org/photos/${photo.p.slice(0, photo.p.lastIndexOf('.'))}`;

export function licenseLabel(lic: string): string {
  // "cc-by-nc" → "CC BY-NC"
  return lic === 'cc0' ? 'CC0' : lic.toUpperCase().replace(/^CC-/, 'CC ');
}

export function licenseUrl(lic: string): string {
  if (lic === 'cc0') return 'https://creativecommons.org/publicdomain/zero/1.0/deed.no';
  return `https://creativecommons.org/licenses/${lic.replace(/^cc-/, '')}/4.0/deed.no`;
}

/** Number of distinct cached random-bird sets. Each is cheap to compute, so cache misses are fine. */
export const RANDOM_SEEDS = 100_000;
