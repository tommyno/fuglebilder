import { useEffect, useState } from 'preact/hooks';
import { birdPath, photoUrl, RANDOM_SEEDS } from '../lib/shared';
import { ShuffleIcon } from './icons';
import styles from './Grid.module.css';
import own from './RandomBirds.module.css';

interface Bird {
  id: number;
  sci: string;
  name: string | null;
  photo: string;
}

/** Tilfeldige: 24 random birds from the whole world. Norske: every bird seen in Norway, A–Å. */
type Mode = 'tilfeldige' | 'norske';

const randomSeed = () => Math.floor(Math.random() * RANDOM_SEEDS);

// Remember the viewer's choice. Storage can be missing or blocked, so never rely on it.
const MODE_KEY = 'birdpic:front-mode';
function savedMode(): Mode {
  try {
    if (localStorage.getItem(MODE_KEY) === 'norske') return 'norske';
  } catch {}
  return 'tilfeldige';
}
function saveMode(mode: Mode) {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {}
}

// Keep the same random set for this tab, so going to a bird and back shows the same birds.
// Only a browser reload (or the button) deals a new set. A new tab starts fresh.
const SEED_KEY = 'birdpic:random-seed';
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
  const s = randomSeed();
  try {
    sessionStorage.setItem(SEED_KEY, String(s));
  } catch {}
  return s;
}

export default function RandomBirds() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [seed, setSeed] = useState<number | null>(null);
  const [random, setRandom] = useState<Bird[] | null>(null);
  const [norske, setNorske] = useState<Bird[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const m = savedMode();
    setMode(m);
    if (m === 'tilfeldige') setSeed(initialSeed());
  }, []);

  useEffect(() => {
    if (seed === null) return;
    let live = true;
    setFailed(false);
    fetch(`/api/random/${seed}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => live && setRandom(d.birds))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [seed]);

  // The Norwegian list never changes, so fetch it once.
  useEffect(() => {
    if (mode !== 'norske' || norske) return;
    let live = true;
    setFailed(false);
    fetch('/api/norske.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => live && setNorske(d.birds))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [mode]);

  const choose = (m: Mode) => {
    saveMode(m);
    setFailed(false);
    setMode(m);
  };

  // "Tilfeldige fugler" always deals a new set, also when it's already showing.
  const shuffle = () => {
    if (mode !== 'tilfeldige') setRandom(null); // don't flash the old set while the new one loads
    choose('tilfeldige');
    setSeed(newSeed());
  };

  const birds = mode === 'norske' ? norske : random;
  const buttonClass = (m: Mode) => (mode === m ? styles.button : `${styles.button} ${own.off}`);

  return (
    <section class={own.section} aria-labelledby="random-title">
      <h2 id="random-title" class="visually-hidden">
        {mode === 'norske' ? 'Norske fugler fra A til Å' : 'Tilfeldige fugler'}
      </h2>
      <div class={own.choices}>
        <button
          class={buttonClass('tilfeldige')}
          type="button"
          aria-label="Tilfeldige fugler"
          aria-pressed={mode === 'tilfeldige'}
          onClick={shuffle}
        >
          <ShuffleIcon />
          <span>
            Tilfeldige<span class={own.long}> fugler</span>
          </span>
        </button>
        <button
          class={buttonClass('norske')}
          type="button"
          aria-label="Norske fugler"
          aria-pressed={mode === 'norske'}
          onClick={() => mode !== 'norske' && choose('norske')}
        >
          <span>
            Norske<span class={own.long}> fugler</span>
          </span>
        </button>
      </div>

      {failed && (
        <p class={styles.status}>
          {mode === 'norske'
            ? 'Klarte ikke å hente fuglene akkurat nå. Prøv igjen litt senere.'
            : 'Klarte ikke å hente fugler akkurat nå. Prøv «Tilfeldige fugler» igjen.'}
        </p>
      )}

      <ul class={styles.grid}>
        {birds
          ? birds.map((b) => (
              <li key={b.id}>
                <a class={styles.tile} href={birdPath(b)}>
                  <img src={photoUrl(b.photo, 'medium')} alt={b.name ?? b.sci} loading="lazy" />
                  <span class={styles.label}>
                    <span class={styles.labelName}>{b.name ?? b.sci}</span>
                    {b.name && <span class={styles.labelSci}>{b.sci}</span>}
                  </span>
                </a>
              </li>
            ))
          : !failed && Array.from({ length: 12 }, (_, i) => <li key={i} class={styles.skeleton} />)}
      </ul>
    </section>
  );
}
