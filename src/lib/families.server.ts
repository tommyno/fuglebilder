// Server only: bird families, from iNat's taxonomy.
// data/families.json is built by scripts/build-index.mjs.

import raw from '../../data/families.json';
import { displayName, slugify } from './shared';
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
export const isExtinctFamily = (f: Family) => !f.species.length;

const collator = new Intl.Collator('nb');
const byName = (a: { name: string | null; sci: string }, b: { name: string | null; sci: string }) =>
  collator.compare(displayName(a), displayName(b));

const taken = new Set<string>();
const families: Family[] = (raw as RawFamily[])
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
  .sort(byName)
  // A–Å, wholly extinct families last
  .sort((a, b) => Number(!a.species.length) - Number(!b.species.length))
  .map((f) => {
    // Slug from the display name; a clash gets the Latin name appended, like species slugs
    let slug = slugify(displayName(f));
    if (taken.has(slug)) slug = `${slug}-${slugify(f.sci)}`;
    taken.add(slug);
    return { ...f, slug };
  });

const familyBySlug = new Map(families.map((f) => [f.slug, f]));
const familyBySpecies = new Map(families.flatMap((f) => [...f.species, ...f.extinct].map((s) => [s.id, f] as const)));

/** The family at /familie/<slug>. */
export const getFamilyBySlug = (slug: string) => familyBySlug.get(slug);

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
