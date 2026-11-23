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

const randomSeed = () => Math.floor(Math.random() * RANDOM_SEEDS);

export default function RandomBirds() {
  const [seed, setSeed] = useState<number | null>(null);
  const [birds, setBirds] = useState<Bird[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => setSeed(randomSeed()), []);

  useEffect(() => {
    if (seed === null) return;
    let live = true;
    setFailed(false);
    fetch(`/api/random/${seed}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => live && setBirds(d.birds))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [seed]);

  return (
    <section class={own.section} aria-labelledby="random-title">
      <div class={own.head}>
        <h2 id="random-title" class={own.title}>
          Noen fugler å begynne med
        </h2>
        <button class={styles.button} type="button" onClick={() => setSeed(randomSeed())}>
          <ShuffleIcon />
          Nye fugler
        </button>
      </div>

      {failed && <p class={styles.status}>Klarte ikke å hente fugler akkurat nå. Prøv «Nye fugler» igjen.</p>}

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
