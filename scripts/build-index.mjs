// Builds data/species.json: every active bird species on iNaturalist with its
// Norwegian (bokmål) names. Run occasionally: `pnpm build:index`.
//
// Record format (compact, array per species):
//   [taxonId, latinName, observationsCount, photo, names, norway, status?, introduced?]
//   photo: "<photoId>.<ext>" on the inaturalist-open-data bucket, only when the
//          photo has an open (CC/CC0) license, otherwise null
//   names: Norwegian names, preferred first (empty if it has none)
//   norway: research-grade observations in Norway (0 = never seen there)
//   status: red list "<Norway>/<world>", e.g. "CR/NT", "/LC" (Norway's list, then IUCN);
//           left out when the species has neither ("" when only `introduced` follows)
//   introduced: 1 when iNat lists the species as introduced in Norway, otherwise left out

import { writeFile, mkdir } from 'node:fs/promises';
import { slugClashes } from '../src/lib/slug.ts';

const API = 'https://api.inaturalist.org/v1/taxa';
const UA = 'fuglebilder index builder';
const PER_PAGE = 200;
const DELAY_MS = 1100; // iNat asks for ~1 req/s

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** GET JSON from iNat, retrying with back-off so one hiccup doesn't throw away a long run. */
async function getJson(url) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt >= 5) throw err;
      console.warn(`  retry ${attempt} after ${err.message}`);
      await sleep(5000 * attempt);
    }
  }
}

const fetchPage = (idAbove) =>
  getJson(
    `${API}?taxon_id=3&rank=species&is_active=true&order_by=id&order=asc` +
      `&per_page=${PER_PAGE}&id_above=${idAbove}&all_names=true&locale=nb`,
  );

const OPEN_PHOTO = /^https:\/\/inaturalist-open-data\.s3\.amazonaws\.com\/photos\/(\d+)\/[a-z]+\.(\w+)$/;
// IUCN's worldwide status, from the taxon list itself. iNat only fills it in for
// threatened species (NT and up, and EX/EW); LC and DD come in the fourth pass.
const iucn = new Map();
function toRecord(t) {
  const cs = t.conservation_status;
  if (cs?.authority === 'IUCN Red List' && !cs.place_id && cs.status) iucn.set(t.id, cs.status.toUpperCase());

  const names = [];
  for (const n of t.names ?? []) {
    // iNat uses "nb" for bokmål; "no" appears on a few older names
    if (n.is_valid && (n.locale === 'nb' || n.locale === 'no') && !names.includes(n.name)) names.push(n.name);
  }

  let photo = null;
  const dp = t.default_photo;
  const m = dp?.license_code && dp.url?.match(OPEN_PHOTO);
  if (m) photo = `${m[1]}.${m[2]}`;

  return [t.id, t.name, t.observations_count ?? 0, photo, names];
}

const records = [];
let idAbove = 0;
let total = null;
for (;;) {
  const page = await fetchPage(idAbove);
  total ??= page.total_results;
  if (!page.results.length) break;
  for (const t of page.results) records.push(toRecord(t));
  idAbove = page.results.at(-1).id;
  console.log(`${records.length} / ${total}`);
  if (page.results.length < PER_PAGE) break;
  await sleep(DELAY_MS);
}

// Second pass: species whose default photo isn't openly licensed often have
// other taxon photos that are. /v1/taxa/{ids} returns them, 30 ids per call.
const missing = records.filter((r) => !r[3]);
console.log(`Looking for open-licensed photos for ${missing.length} species…`);
for (let i = 0; i < missing.length; i += 30) {
  const batch = missing.slice(i, i + 30);
  const data = await getJson(`${API}/${batch.map((r) => r[0]).join(',')}`);
  const byId = new Map(data.results.map((t) => [t.id, t]));
  for (const r of batch) {
    for (const tp of byId.get(r[0])?.taxon_photos ?? []) {
      const m = tp.photo?.license_code && tp.photo.url?.match(OPEN_PHOTO);
      if (m) {
        r[3] = `${m[1]}.${m[2]}`;
        break;
      }
    }
  }
  if ((i / 30) % 10 === 0) console.log(`  ${i + batch.length} / ${missing.length}`);
  await sleep(DELAY_MS);
}

// Third pass: how often each species has been seen in Norway (iNat place 7016),
// so Norwegian birds rank first in search.
const NORWAY = 7016;
const norway = new Map();
for (let page = 1; ; page++) {
  const data = await getJson(
    `https://api.inaturalist.org/v1/observations/species_counts?place_id=${NORWAY}` +
      `&taxon_id=3&quality_grade=research&per_page=500&page=${page}`,
  );
  for (const r of data.results) norway.set(r.taxon.id, r.count);
  if (page * 500 >= data.total_results) break;
  await sleep(DELAY_MS);
}
for (const r of records) r[5] = norway.get(r[0]) ?? 0;
console.log(`${records.filter((r) => r[5]).length} species seen in Norway.`);

// Fourth pass: red-list status, in Norway (Artsdatabanken) and in the world (IUCN).
// LC and DD for the world: species_counts?csi= matches any list whose status maps to that
// IUCN category, regional ones too (kanadagås came back VU), so it only fills in species
// the taxon list gave no threatened status. LC first: a regional DD shouldn't beat it.
const IUCN_CODES = new Set(['EX', 'EW', 'CR', 'EN', 'VU', 'NT', 'LC', 'DD']);
for (const [id, code] of iucn) if (!IUCN_CODES.has(code)) iucn.delete(id);
for (const code of ['LC', 'DD']) {
  for (let page = 1; ; page++) {
    const data = await getJson(
      `https://api.inaturalist.org/v1/observations/species_counts?taxon_id=3&csi=${code}&per_page=500&page=${page}`,
    );
    for (const r of data.results) if (!iucn.has(r.taxon.id)) iucn.set(r.taxon.id, code);
    await sleep(DELAY_MS);
    if (page * 500 >= data.total_results) break;
  }
}
// Norway's list needs each taxon's own statuses: the place filter on species_counts also
// matches Svalbard's list and the global one. Only birds seen in Norway can be on it.
const NORWAY_CODES = new Set(['RE', 'CR', 'EN', 'VU', 'NT', 'LC', 'DD']);
const norwayStatus = new Map();
// The same records say whether the species is native or introduced in Norway (iNat's checklist).
const introduced = new Set();
const seen = records.filter((r) => r[5] > 0);
console.log(`Red-list and introduced status for ${seen.length} Norwegian species…`);
for (let i = 0; i < seen.length; i += 30) {
  const ids = seen.slice(i, i + 30).map((r) => r[0]);
  const data = await getJson(`${API}/${ids.join(',')}`);
  for (const t of data.results) {
    // Newest list first (the URL holds the year: …/rodlisteforarter/2021/27698)
    const year = (c) => Number(c.url?.match(/\/(\d{4})\//)?.[1] ?? 0);
    const best = (t.conservation_statuses ?? [])
      .filter((c) => c.authority === 'Artsdatabanken' && c.place?.id === NORWAY)
      .sort((a, b) => year(b) - year(a))[0];
    const code = best?.status?.toUpperCase();
    if (NORWAY_CODES.has(code)) norwayStatus.set(t.id, code);
    if ((t.listed_taxa ?? []).some((l) => l.place?.id === NORWAY && l.establishment_means === 'introduced')) introduced.add(t.id);
  }
  await sleep(DELAY_MS);
}
for (const r of records) {
  const no = norwayStatus.get(r[0]) ?? '';
  const world = iucn.get(r[0]) ?? '';
  if (no || world) r[6] = `${no}/${world}`;
  if (introduced.has(r[0])) {
    r[6] ??= '';
    r[7] = 1;
  }
}
console.log(`${norwayStatus.size} with Norwegian status, ${records.filter((r) => iucn.has(r[0])).length} with IUCN status, ${introduced.size} introduced in Norway.`);

records.sort((a, b) => b[2] - a[2]); // most observed first
await mkdir(new URL('../data/', import.meta.url), { recursive: true });
await writeFile(new URL('../data/species.json', import.meta.url), JSON.stringify(records));
// Bird URLs are /fugl/<name>; species sharing a name need the Latin one appended.
const clashes = slugClashes(records.map((r) => ({ id: r[0], name: r[4][0] ?? r[1] })));
await writeFile(new URL('../data/slug-clashes.json', import.meta.url), JSON.stringify(clashes));
const withPhoto = records.filter((r) => r[3]).length;
console.log(`Wrote ${records.length} species (${withPhoto} with open-licensed photo).`);
