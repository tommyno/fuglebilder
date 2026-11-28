import { birdPath, photoUrl, type GridBird } from '../lib/shared';
import { Thumb } from './Thumb';
import { TileLabel } from './Tile';
import styles from './Grid.module.css';

/** Birds as photo tiles linking to their pages (front page, family pages). */
export default function BirdGrid({ birds }: { birds: GridBird[] }) {
  return (
    <ul class={styles.grid}>
      {birds.map((b) => (
        <li key={b.id}>
          <a class={styles.tile} href={birdPath(b)}>
            {/* empty alt: the label below already names the link */}
            <Thumb src={photoUrl(b.photo, 'medium')} alt="" />
            <TileLabel taxon={b} />
          </a>
        </li>
      ))}
    </ul>
  );
}
