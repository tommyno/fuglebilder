import { useEffect, useState } from 'preact/hooks';
import { birdPath, photoUrl } from '../lib/shared';
import { Thumb } from './Thumb';
import { TileLabel } from './Tile';
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

export type Mode = 'norge' | 'verden';

/** ?vis=verden is client state (the server always renders Sett i Norge), so it may live in the query. */
export function modeFromUrl(): Mode {
  return new URLSearchParams(location.search).get('vis') === 'verden' ? 'verden' : 'norge';
}
export function saveModeInUrl(mode: Mode) {
  const url = new URL(location.href);
  if (mode === 'verden') url.searchParams.set('vis', 'verden');
  else url.searchParams.delete('vis');
  history.replaceState(history.state, '', url);
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

/** A family's species, A–Å: the ones seen in Norway, or the whole world with the extinct ones last. */
export default function FamilyGrid({ birds }: { birds: FamilyBird[] }) {
  const norway = birds.filter((b) => b.no);
  const living = birds.filter((b) => !b.ex);
  const extinct = birds.filter((b) => b.ex);
  // Only a choice when it changes something
  const choice = norway.length > 0 && norway.length < birds.length;
  const [mode, setMode] = useState<Mode>(norway.length ? 'norge' : 'verden');

  useEffect(() => {
    if (choice && modeFromUrl() === 'verden') setMode('verden');
  }, []);

  const choose = (m: Mode) => {
    setMode(m);
    saveModeInUrl(m);
  };

  const world = mode === 'verden';

  return (
    <section aria-label="Arter">
      {choice && (
        <div class={own.choices}>
          <button class={styles.chip} type="button" aria-pressed={mode === 'norge'} onClick={() => choose('norge')}>
            Sett i Norge <span class={own.chipCount}>{norway.length}</span>
          </button>
          <button class={styles.chip} type="button" aria-pressed={mode === 'verden'} onClick={() => choose('verden')}>
            Hele verden <span class={own.chipCount}>{birds.length}</span>
          </button>
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
