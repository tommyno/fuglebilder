import { useEffect, useState } from 'preact/hooks';
import { getJson, RANDOM_SEEDS } from '../lib/shared';
import type { RandomBird as Bird } from '../lib/species.server';
import BirdGrid from './BirdGrid';
import { ShuffleIcon } from './icons';
import { Skeletons } from './Tile';
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

// The world view shows when the address ends in #verden (BrowseNav.astro, global.css)
const worldShown = () => location.hash === '#verden';

/**
 * Front page, Hele verden: 24 random birds from the whole world, with "Vis nye". Sits in the
 * page's world view, so it fetches its birds only once that view is shown.
 */
export default function RandomBirds() {
  const [seed, setSeed] = useState<number | null>(null);
  const [random, setRandom] = useState<Bird[] | null>(null);
  const [failed, setFailed] = useState(false);

  // This tab's set (a new one only if there is none yet), once the world view is shown
  useEffect(() => {
    const start = () => worldShown() && setSeed((s) => s ?? initialSeed());
    start();
    addEventListener('hashchange', start);
    return () => removeEventListener('hashchange', start);
  }, []);

  useEffect(() => {
    if (seed === null) return;
    const ctrl = new AbortController();
    setFailed(false);
    getJson<{ birds: Bird[] }>(`/api/random/${seed}.json`, ctrl.signal)
      .then((d) => setRandom(d.birds))
      .catch(() => !ctrl.signal.aborted && setFailed(true));
    return () => ctrl.abort();
  }, [seed]);

  const shuffle = () => {
    setRandom(null); // don't show the old set while the new one loads
    setFailed(false);
    setSeed(newSeed());
  };

  return (
    <>
      <div class={own.info}>
        <p>{random?.length ?? 24} tilfeldige arter fra hele verden</p>
        <button class={`${styles.chip} ${own.shuffle}`} type="button" onClick={shuffle}>
          Vis nye
          <ShuffleIcon />
        </button>
      </div>
      {failed && <p class={styles.status}>Klarte ikke å hente fugler akkurat nå. Prøv «Vis nye».</p>}
      {random ? (
        <BirdGrid birds={random} />
      ) : (
        !failed && (
          <ul class={styles.grid}>
            <Skeletons count={12} />
          </ul>
        )
      )}
    </>
  );
}
