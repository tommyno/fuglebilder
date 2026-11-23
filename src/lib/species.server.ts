// Server only: the species index and the search (Norwegian + Latin names).
// data/species.json is built by scripts/build-index.mjs.

import raw from '../../data/species.json';

type Rec = [id: number, sci: string, obs: number, photo: string | null, names: string[], norway?: number];

export interface Species {
  id: number;
  sci: string;
  obs: number;
  photo: string | null;
  /** Norwegian names, preferred first */
  names: string[];
  /** preferred Norwegian name */
  name: string | null;
  /** research-grade observations in Norway (0 = never seen there) */
  norway: number;
}

// sorted by observation count, most observed first
// A few iNat names are lowercase ("knoppand")
const capitalize = (n: string) => n.charAt(0).toLocaleUpperCase('nb') + n.slice(1);

const species: Species[] = (raw as Rec[]).map(([id, sci, obs, photo, rawNames, norway = 0]) => {
  const names = rawNames.map(capitalize);
  return { id, sci, obs, photo, names, name: names[0] ?? null, norway };
});
const byId = new Map(species.map((s) => [s.id, s]));

export const getSpecies = (id: number) => byId.get(id);

// ---------------------------------------------------------------- normalizing

const FOLD: Record<string, string> = { ø: 'o', æ: 'ae', œ: 'oe', ß: 'ss' };
const SEPARATORS = /[\s\-‐–'’`´.,()/]+/g;

/** Lowercase, strip accents, fold ø/æ (so "kjottmeis" finds "kjøttmeis"), collapse separators. */
export function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '') // å → a
    .replace(/[øæœß]/g, (c) => FOLD[c])
    .replace(SEPARATORS, ' ')
    .trim();
}

// ---------------------------------------------------------------- search index

interface Entry {
  s: Species;
  name: string;
  latin: boolean;
  /** " word word" — leading space makes word-prefix checks a single includes() */
  spaced: string;
  /** separators removed: "svart trost" and "svarttrost" both → "svarttrost" */
  compact: string;
}

const entries: Entry[] = [];
for (const s of species) {
  const add = (name: string, latin: boolean) => {
    const f = fold(name);
    if (f) entries.push({ s, name, latin, spaced: ' ' + f, compact: f.replaceAll(' ', '') });
  };
  add(s.sci, true);
  for (const n of s.names) add(n, false);
}

/** Edit distance between q and the best-matching prefix of `target` (bounded). */
function prefixDistance(q: string, target: string, max: number): number {
  const n = q.length;
  const m = Math.min(target.length, n + max);
  let prev = Array.from({ length: m + 1 }, (_, j) => j);
  for (let i = 1; i <= n; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= m; j++) {
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (q[i - 1] === target[j - 1] ? 0 : 1));
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  let best = max + 1;
  for (let j = Math.max(0, n - max); j <= m; j++) best = Math.min(best, prev[j]);
  return best;
}

export interface SearchResult {
  id: number;
  sci: string;
  /** preferred Norwegian name */
  name: string | null;
  /** another Norwegian name that matched, when it isn't the preferred one */
  alias: string | null;
  photo: string | null;
}

/** Worldwide popularity, plus a boost for birds seen in Norway ("meis" → blåmeis before amerikameis). */
const popularity = (s: Species) =>
  6 * Math.log10(s.obs + 1) + (s.norway ? 12 + 5 * Math.log10(s.norway + 1) : 0);

export function search(query: string, limit = 12): SearchResult[] {
  const qf = fold(query);
  const qc = qf.replaceAll(' ', '');
  if (qc.length < 2) return [];
  const qWords = qf.split(' ');

  const best = new Map<Species, { score: number; e: Entry }>();
  const consider = (e: Entry, tier: number) => {
    const score = tier + popularity(e.s) + (e.latin ? 0 : 4);
    const cur = best.get(e.s);
    if (!cur || score > cur.score) best.set(e.s, { score, e });
  };

  for (const e of entries) {
    let tier = 0;
    if (e.compact === qc) tier = 120;
    // Norwegian compounds name the kind of bird last: "kjøttmeis", "snøugle"
    else if (qc.length >= 3 && e.compact.endsWith(qc)) tier = 88;
    else if (e.compact.startsWith(qc)) tier = 85;
    else if (qWords.length > 1 && qWords.every((w) => e.spaced.includes(' ' + w))) tier = 70;
    else if (e.spaced.includes(' ' + qc)) tier = 65;
    else if (qc.length >= 3 && e.compact.includes(qc)) tier = 45; // "meis" in "blåmeisunge"
    if (tier) consider(e, tier);
  }

  // Typos ("svartrost", "kjøtmeis") only when exact-ish matching found little.
  if (best.size < limit && qc.length >= 4) {
    const max = qc.length >= 8 ? 2 : 1;
    for (const e of entries) {
      if (best.has(e.s) || e.compact[0] !== qc[0]) continue;
      const d = prefixDistance(qc, e.compact, max);
      if (d <= max) consider(e, 35 - d * 8);
    }
  }

  return [...best.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ e }) => ({
      id: e.s.id,
      sci: e.s.sci,
      name: e.s.name,
      alias: !e.latin && e.name !== e.s.name ? e.name : null,
      photo: e.s.photo,
    }));
}

// ---------------------------------------------------------------- random birds

// The 800 most observed species worldwide that have a photo and a Norwegian name.
// Picked uniformly at random: no weighting towards Norway.
const RANDOM_POOL = 800;
const RANDOM_COUNT = 24;
const pool = species.filter((s) => s.photo && s.name).slice(0, RANDOM_POOL);

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface RandomBird {
  id: number;
  sci: string;
  name: string | null;
  photo: string;
}

function shuffled<T>(list: T[], rand: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** 24 random well-known birds, deterministic per seed so it can be cached. */
export function randomBirds(seed: number): RandomBird[] {
  const picked = shuffled(pool, mulberry32(seed)).slice(0, RANDOM_COUNT);
  return picked.map((s) => ({ id: s.id, sci: s.sci, name: s.name, photo: s.photo! }));
}

// ---------------------------------------------------------------- Norwegian birds

// Species seen in Norway at least 3 times (research grade). The minimum leaves out
// one-off strays and escapes (a turkey, a black swan…). About 280 species.
const NORWAY_MIN = 3;

/** Birds seen in Norway with a photo and a Norwegian name, sorted A–Å (Norwegian order). */
export function norwegianBirds(): RandomBird[] {
  const collator = new Intl.Collator('nb');
  return species
    .filter((s) => s.photo && s.name && s.norway >= NORWAY_MIN)
    .sort((a, b) => collator.compare(a.name!, b.name!))
    .map((s) => ({ id: s.id, sci: s.sci, name: s.name, photo: s.photo! }));
}
