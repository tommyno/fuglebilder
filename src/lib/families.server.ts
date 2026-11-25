// Server only: bird families and the orders they belong to, from iNat's taxonomy.
// data/families.json is built by scripts/build-index.mjs.

import raw from '../../data/families.json';
import { displayName, slugify } from './shared';
import { capitalize, getSpecies, isNorwegian, type Species } from './species.server';

type RawOrder = [id: number, sci: string, names: string[]];
type RawFamily = [id: number, sci: string, names: string[], order: number | null, species: number[]];

interface Group {
  id: number;
  sci: string;
  /** preferred Norwegian name, null when iNat has none */
  name: string | null;
  slug: string;
}

export interface Order extends Group {
  /** A–Å */
  families: Family[];
}

export interface Family extends Group {
  order: Order;
  /** living species with a photo, A–Å */
  species: Species[];
  /** the ones on the Sett i Norge list */
  norwegian: Species[];
  /** extinct species with a photo, A–Å: mostly skeletons and museum specimens, so shown apart */
  extinct: Species[];
}

/** Every species in the family is extinct (the moas, the Hawaiian honeyeaters) */
export const isExtinctFamily = (f: Family) => !f.species.length;
/** Every family in the order is extinct (moas, elephant birds) */
export const isExtinctOrder = (o: Order) => o.families.every(isExtinctFamily);

const collator = new Intl.Collator('nb');
const byName = (a: { name: string | null; sci: string }, b: { name: string | null; sci: string }) =>
  collator.compare(displayName(a), displayName(b));

// iNat writes "Vade-, måke- & alkefugler"; Norwegian text says "og"
const norwegianName = (names: string[]) => (names[0] ? capitalize(names[0].replace(/ & /g, ' og ')) : null);

/** Slugs from the display name; a clash gets the Latin name appended, like species slugs. */
function withSlugs<T extends Omit<Group, 'slug'>>(groups: T[]): (T & { slug: string })[] {
  const taken = new Set<string>();
  return groups.map((g) => {
    let slug = slugify(displayName(g));
    if (taken.has(slug)) slug = `${slug}-${slugify(g.sci)}`;
    taken.add(slug);
    return { ...g, slug };
  });
}

const { orders: rawOrders, families: rawFamilies } = raw as { orders: RawOrder[]; families: RawFamily[] };

const orderList: Order[] = withSlugs(
  rawOrders.map(([id, sci, names]) => ({ id, sci, name: norwegianName(names), families: [] as Family[] })),
).sort(byName);
const orderById = new Map(orderList.map((o) => [o.id, o]));

const familyList: Family[] = withSlugs(
  rawFamilies.flatMap(([id, sci, names, orderId, ids]) => {
    const order = orderId === null ? undefined : orderById.get(orderId);
    // Species without a photo would be empty tiles; those left out of the index have no page
    const all = ids
      .map(getSpecies)
      .filter((s): s is Species => !!s?.photo)
      .sort(byName);
    if (!order || !all.length) return [];
    const species = all.filter((s) => !s.extinct);
    const extinct = all.filter((s) => s.extinct);
    return [{ id, sci, name: norwegianName(names), order, species, norwegian: species.filter(isNorwegian), extinct }];
  }),
).sort(byName);

// Within an order, extinct families last; extinct orders after all the others
for (const f of familyList) f.order.families.push(f);
for (const o of orderList) o.families.sort((a, b) => Number(isExtinctFamily(a)) - Number(isExtinctFamily(b)));
const orders = orderList
  .filter((o) => o.families.length)
  .sort((a, b) => Number(isExtinctOrder(a)) - Number(isExtinctOrder(b)));

const familyBySlug = new Map(familyList.map((f) => [f.slug, f]));
const familyBySpecies = new Map(familyList.flatMap((f) => [...f.species, ...f.extinct].map((s) => [s.id, f] as const)));

/** The family at /familie/<slug>. */
export const getFamilyBySlug = (slug: string) => familyBySlug.get(slug);

/** The family a species belongs to (none for a few species iNat hasn't placed in one). */
export const getFamilyOf = (speciesId: number) => familyBySpecies.get(speciesId);

/** Every order with at least one family, A–Å. */
export const allOrders = () => orders;

export const familyPath = (f: Family) => `/familie/${f.slug}`;
/** Orders have no page of their own: they are sections of /familier. */
export const orderPath = (o: Order) => `/familier#${o.slug}`;

/** The species the family is best known by: most observed in Norway, or in the world (living if any). */
export const coverSpecies = (f: Family, norway: boolean) =>
  norway
    ? f.norwegian.reduce((a, b) => (b.norway > a.norway ? b : a))
    : (f.species.length ? f.species : f.extinct).reduce((a, b) => (b.obs > a.obs ? b : a));
