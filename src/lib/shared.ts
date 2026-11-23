// Code shared by the server and the browser.

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

export type PhotoSize = 'square' | 'small' | 'medium' | 'large' | 'original';

const PHOTO_BASE = 'https://inaturalist-open-data.s3.amazonaws.com/photos';

export function photoUrl(photo: string, size: PhotoSize): string {
  const dot = photo.lastIndexOf('.');
  return `${PHOTO_BASE}/${photo.slice(0, dot)}/${size}.${photo.slice(dot + 1)}`;
}

const FOLD: Record<string, string> = { ø: 'o', æ: 'ae', œ: 'oe', ß: 'ss' };

/** "Svarttrost" → "svarttrost", "Blåmeis" → "blameis", "Turdus merula" → "turdus-merula" */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[øæœß]/g, (c) => FOLD[c])
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** /fugl/12716-svarttrost (Latin name when there is no Norwegian one) */
export const birdPath = (t: { id: number; sci: string; name: string | null }) =>
  `/fugl/${t.id}-${slugify(t.name ?? t.sci)}`;

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

/** Number of distinct cached random-bird sets. */
export const RANDOM_SEEDS = 1000;
