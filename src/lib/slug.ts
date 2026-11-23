// URL slugs for bird pages. No imports, so scripts/build-index.mjs can import it too.

const FOLD: Record<string, string> = { ø: 'o', æ: 'ae', œ: 'oe', ß: 'ss' };

/** Lowercase, strip accents (å → a) and fold ø/æ: "Kjøttmeis" → "kjottmeis". Used by both slugs and search. */
export const foldAccents = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[øæœß]/g, (c) => FOLD[c]);

/** "Svarttrost" → "svarttrost", "Blåmeis" → "blameis", "Turdus merula" → "turdus-merula" */
export const slugify = (name: string): string =>
  foldAccents(name)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * Ids of species whose name slug is already taken by a more observed species
 * (two species called "Blåvingebladfugl"). Those get the Latin name appended.
 * `birds` must be sorted most observed first; `name` is the display name.
 */
export function slugClashes(birds: { id: number; name: string }[]): number[] {
  const taken = new Set<string>();
  const clashes: number[] = [];
  for (const b of birds) {
    const s = slugify(b.name);
    if (taken.has(s)) clashes.push(b.id);
    else taken.add(s);
  }
  return clashes;
}
