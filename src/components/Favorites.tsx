import { useStore } from '@nanostores/preact';
import { birdPath, photoUrl } from '../lib/shared';
import { $favorites } from '../lib/favorites';
import { openLightbox } from '../lib/lightbox';
import { HeartIcon } from './icons';
import { Thumb } from './Thumb';
import { TileLabel } from './Tile';
import styles from './Grid.module.css';
import button from './Button.module.css';

/** «Mine fugler»: lagrede bilder, nyeste først. */
export default function Favorites() {
  const favorites = useStore($favorites);

  if (favorites.length === 0) {
    return (
      <p class={styles.status}>
        Ingen lagrede fugler ennå. Åpne et bilde og trykk på <HeartIcon class={styles.inlineHeart} /> for å lagre det her.
        <br />
        <br />
        <a class={`${button.button} ${button.primary}`} href="/">
          Finn en fugl
        </a>
      </p>
    );
  }

  // Øyeblikksbilde: å fjerne et hjerte i fullskjerm skal ikke flytte bildene
  const open = (index: number) => openLightbox({ slides: favorites.map((f) => ({ photo: f, taxon: f.taxon })), index });

  return (
    <ul class={styles.grid}>
      {favorites.map((f, i) => (
        <li key={f.p}>
          <button class={styles.tile} type="button" onClick={() => open(i)}>
            {/* empty alt: the label below already names the button */}
            <Thumb src={photoUrl(f.p, 'medium')} alt="" />
            <TileLabel taxon={f.taxon} />
          </button>
          <a class={styles.speciesLink} href={birdPath(f.taxon)}>
            Flere bilder →
          </a>
        </li>
      ))}
    </ul>
  );
}
