// Server only: bird families, from iNat's taxonomy.
// data/families.json is built by scripts/build-index.mjs.

import raw from '../../data/families.json';
import { byName, displayName, taxonSlug } from './shared';
import { slugClashes } from './slug';
import { capitalize, getSpecies, isNorwegian, type Species } from './species.server';

type RawFamily = [id: number, sci: string, names: string[], species: number[]];

export interface Family {
  id: number;
  sci: string;
  /** preferred Norwegian name, null when iNat has none */
  name: string | null;
  slug: string;
  /** living species with a photo, A–Å */
  species: Species[];
  /** the ones on the Sett i Norge list */
  norwegian: Species[];
  /** extinct species with a photo, A–Å: mostly skeletons and museum specimens, so shown apart */
  extinct: Species[];
}

/** Every species in the family is extinct (the moas, the Hawaiian honeyeaters) */
export const isExtinctFamily = (f: Pick<Family, 'species'>) => !f.species.length;

// A–Å, wholly extinct families last
const sorted = (raw as RawFamily[])
  .flatMap(([id, sci, names, ids]) => {
    // Species without a photo would be empty tiles; those left out of the index have no page
    const all = ids
      .map(getSpecies)
      .filter((s): s is Species => !!s?.photo)
      .sort(byName);
    if (!all.length) return [];
    const species = all.filter((s) => !s.extinct);
    const name = names[0] ? capitalize(names[0]) : null;
    return [{ id, sci, name, species, norwegian: species.filter(isNorwegian), extinct: all.filter((s) => s.extinct) }];
  })
  .sort((a, b) => Number(isExtinctFamily(a)) - Number(isExtinctFamily(b)) || byName(a, b));

// Slug from the display name; a clash gets the Latin name appended, like species slugs
const clashes = new Set(slugClashes(sorted.map((f) => ({ id: f.id, name: displayName(f) }))));
const families: Family[] = sorted.map((f) => ({ ...f, slug: taxonSlug(f, clashes) }));

const familyBySpecies = new Map(families.flatMap((f) => [...f.species, ...f.extinct].map((s) => [s.id, f] as const)));

/** The family a species belongs to (none for a few species iNat hasn't placed in one). */
export const getFamilyOf = (speciesId: number) => familyBySpecies.get(speciesId);

/** Every family, A–Å, the wholly extinct ones last. */
export const allFamilies = () => families;

export const familyPath = (f: Family) => `/familier/${f.slug}`;

/** The species the family is best known by: most observed in Norway, or in the world (living if any). */
export const coverSpecies = (f: Family, norway: boolean) =>
  norway
    ? f.norwegian.reduce((a, b) => (b.norway > a.norway ? b : a))
    : (f.species.length ? f.species : f.extinct).reduce((a, b) => (b.obs > a.obs ? b : a));
