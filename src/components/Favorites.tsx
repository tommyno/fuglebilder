import { useStore } from '@nanostores/preact';
import { useRef } from 'preact/hooks';
import { birdPath, photoUrl } from '../lib/shared';
import { $favorites } from '../lib/favorites';
import { openLightbox, type Slide } from '../lib/lightbox';
import { HeartIcon } from './icons';
import { Thumb } from './Thumb';
import styles from './Grid.module.css';

/** «Mine fugler»: lagrede bilder, nyeste først. */
export default function Favorites() {
  const favorites = useStore($favorites);
  const slides = useRef<Slide[]>([]);

  if (favorites.length === 0) {
    return (
      <p class={styles.status}>
        Ingen lagrede fugler ennå. Åpne et bilde og trykk på <HeartIcon class={styles.inlineHeart} /> for å lagre det her.
        <br />
        <br />
        <a class={styles.button} href="/">
          Finn en fugl
        </a>
      </p>
    );
  }

  const open = (index: number) => {
    // Øyeblikksbilde: å fjerne et hjerte i fullskjerm skal ikke flytte bildene
    slides.current = favorites.map((f) => ({ photo: f, taxon: f.taxon }));
    openLightbox({ slides: slides.current, index });
  };

  return (
    <ul class={styles.grid}>
      {favorites.map((f, i) => (
        <li key={f.p}>
          <button class={styles.tile} type="button" onClick={() => open(i)}>
            <Thumb src={photoUrl(f.p, 'medium')} alt={f.taxon.name ?? f.taxon.sci} />
            <span class={styles.label}>
              <span class={styles.labelName}>{f.taxon.name ?? f.taxon.sci}</span>
              {f.taxon.name && <span class={styles.labelSci}>{f.taxon.sci}</span>}
            </span>
          </button>
          <a class={styles.speciesLink} href={birdPath(f.taxon)}>
            Flere bilder →
          </a>
        </li>
      ))}
    </ul>
  );
}
