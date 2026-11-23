// "My birds": favorite photos, saved on this device only (localStorage).
import { persistentAtom } from '@nanostores/persistent';
import type { Photo } from './shared';

export interface SlideTaxon {
  id: number;
  sci: string;
  /** common name in the viewer's language when saved */
  name: string | null;
}

export interface Favorite extends Photo {
  taxon: SlideTaxon;
  added: number;
}

export const $favorites = persistentAtom<Favorite[]>('birdpic:favorites', [], {
  encode: JSON.stringify,
  decode: (s) => {
    try {
      const v = JSON.parse(s);
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  },
});

export const isFavorite = (p: string) => $favorites.get().some((f) => f.p === p);

export function toggleFavorite(photo: Photo, taxon: SlideTaxon): boolean {
  const list = $favorites.get();
  if (list.some((f) => f.p === photo.p)) {
    $favorites.set(list.filter((f) => f.p !== photo.p));
    return false;
  }
  const { p, w, h, by, lic, obs } = photo;
  $favorites.set([{ p, w, h, by, lic, ...(obs ? { obs } : {}), taxon, added: Date.now() }, ...list]);
  return true;
}
