import { useEffect, useState } from 'preact/hooks';
import { birdPath, getJson, photoUrl, RANDOM_SEEDS } from '../lib/shared';
import type { RandomBird as Bird } from '../lib/species.server';
import { useArea } from './AreaSwitch';
import BrowseNav from './BrowseNav';
import browse from './BrowseNav.module.css';
import { ShuffleIcon } from './icons';
import { Thumb } from './Thumb';
import { Skeletons, TileLabel } from './Tile';
import styles from './Grid.module.css';
import own from './RandomBirds.module.css';

// Keep the same random set for this tab, so going to a bird and back shows the same birds.
// Only a browser reload (or the button) deals a new set. A new tab starts fresh.
const SEED_KEY = 'fuglebilder:random-seed';
function isReload() {
  try {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    return nav?.type === 'reload';
  } catch {
    return false;
  }
}
function initialSeed(): number {
  if (!isReload()) {
    try {
      const saved = sessionStorage.getItem(SEED_KEY);
      const n = Number(saved);
      if (saved !== null && Number.isInteger(n) && n >= 0 && n < RANDOM_SEEDS) return n;
    } catch {}
  }
  return newSeed();
}
function newSeed(): number {
  const s = Math.floor(Math.random() * RANDOM_SEEDS);
  try {
    sessionStorage.setItem(SEED_KEY, String(s));
  } catch {}
  return s;
}

/** Front page, Arter: every bird seen in Norway A–Å, or 24 random birds from the whole world. */
export default function RandomBirds({ norwegianCount }: { norwegianCount: number }) {
  const area = useArea();
  const [seed, setSeed] = useState<number | null>(null);
  const [random, setRandom] = useState<Bird[] | null>(null);
  const [norske, setNorske] = useState<Bird[] | null>(null);
  const [failed, setFailed] = useState(false);

  /** Fetch a list of birds into `set`; an answer that arrives after cleanup is dropped. */
  const load = (url: string, set: (b: Bird[]) => void) => {
    const ctrl = new AbortController();
    setFailed(false);
    getJson<{ birds: Bird[] }>(url, ctrl.signal)
      .then((d) => set(d.birds))
      .catch(() => !ctrl.signal.aborted && setFailed(true));
    return () => ctrl.abort();
  };

  // Hele verden shows this tab's set (a new one only if there is none yet); "Vis nye" deals a new one.
  useEffect(() => {
    setFailed(false);
    if (area === 'verden' && seed === null) setSeed(initialSeed());
  }, [area]);

  useEffect(() => (seed === null ? undefined : load(`/api/random/${seed}.json`, setRandom)), [seed]);

  // The Norwegian list never changes, so fetch it once.
  useEffect(() => (area !== 'norge' || norske ? undefined : load('/api/norwegian-birds.json', setNorske)), [area]);

  const shuffle = () => {
    setRandom(null); // don't show the old set while the new one loads
    setFailed(false);
    setSeed(newSeed());
  };

  const birds = area === 'norge' ? norske : area === 'verden' ? random : null;

  return (
    <section class={browse.section} aria-labelledby="random-title">
      <h2 id="random-title" class="visually-hidden">
        {area === 'verden' ? 'Tilfeldige fugler' : 'Norske fugler fra A til Å'}
      </h2>
      <BrowseNav tab="arter" area={area} />

      {area === 'norge' && <p class={browse.lead}>{norwegianCount} arter sett i Norge</p>}
      {area === 'verden' && (
        <div class={own.info}>
          <p>{random?.length ?? 24} tilfeldige arter fra hele verden</p>
          <button class={`${styles.chip} ${own.shuffle}`} type="button" onClick={shuffle}>
            Vis nye
            <ShuffleIcon />
          </button>
        </div>
      )}

      {failed && (
        <p class={styles.status}>
          {area === 'norge'
            ? 'Klarte ikke å hente fuglene akkurat nå. Prøv igjen litt senere.'
            : 'Klarte ikke å hente fugler akkurat nå. Prøv «Vis nye».'}
        </p>
      )}

      <ul class={styles.grid}>
        {birds
          ? birds.map((b) => (
              <li key={b.id}>
                <a class={styles.tile} href={birdPath(b)}>
                  {/* empty alt: the label below already names the link */}
                  <Thumb src={photoUrl(b.photo, 'medium')} alt="" />
                  <TileLabel taxon={b} />
                </a>
              </li>
            ))
          : !failed && <Skeletons count={12} />}
      </ul>
    </section>
  );
}
