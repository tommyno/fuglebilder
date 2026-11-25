import type { Area } from '../lib/area';
import { birdPath, photoUrl } from '../lib/shared';
import { Thumb } from './Thumb';
import { TileLabel } from './Tile';
import AreaSwitch, { useArea } from './AreaSwitch';
import styles from './Grid.module.css';
import own from './Families.module.css';

export interface FamilyBird {
  id: number;
  sci: string;
  name: string | null;
  photo: string;
  /** on the Sett i Norge list */
  no: boolean;
  /** extinct: shown in its own row at the bottom, as the photos are mostly skeletons and museum birds */
  ex: boolean;
}

const Tiles = ({ birds }: { birds: FamilyBird[] }) => (
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

/**
 * A family's species, A–Å: the ones seen in Norway (/familie/…), or the whole world with the
 * extinct ones last (/verden/familie/…).
 */
export default function FamilyGrid({ birds, initialArea, path }: { birds: FamilyBird[]; initialArea: Area; path: string }) {
  const norway = birds.filter((b) => b.no);
  const living = birds.filter((b) => !b.ex);
  const extinct = birds.filter((b) => b.ex);
  // Only a choice when it changes something
  const choice = norway.length > 0 && norway.length < birds.length;
  const [area, choose] = useArea(initialArea);

  // A family with no birds seen in Norway shows the world either way
  const world = !norway.length || area === 'verden';

  return (
    <section aria-label="Arter">
      {choice && (
        <div class={own.choices}>
          <AreaSwitch area={area} choose={choose} path={path} counts={{ norge: norway.length, verden: birds.length }} />
        </div>
      )}
      <Tiles birds={world ? living : norway} />
      {world && extinct.length > 0 && (
        <>
          {living.length > 0 && <h2 class={own.extinctTitle}>Utdødde arter</h2>}
          <Tiles birds={extinct} />
        </>
      )}
    </section>
  );
}
