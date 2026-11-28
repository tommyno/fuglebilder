import type { GridBird } from '../lib/shared';
import { speciesCount } from '../lib/shared';
import BirdGrid from './BirdGrid';
import own from './Families.module.css';

interface Props {
  /** living species, A–Å */
  living: GridBird[];
  /** the living ones on the Sett i Norge list */
  norwegian: GridBird[];
  /** extinct species: their own part at the bottom, as the photos are mostly skeletons and museum birds */
  extinct: GridBird[];
  /** Norge and Verden views, under the area switch (BrowseNav.astro). Without it only the world view. */
  split: boolean;
}

/** A family's species: Norge has the ones seen in Norway, Verden every living one, then Utdødde arter. */
export default function FamilyGrid({ living, norwegian, extinct, split }: Props) {
  const world = <World living={living} extinct={extinct} />;
  if (!split) return world;
  return (
    <>
      <div data-area="norge">
        <BirdGrid birds={norwegian} />
      </div>
      <div data-area="verden">{world}</div>
    </>
  );
}

function World({ living, extinct }: Pick<Props, 'living' | 'extinct'>) {
  if (!extinct.length || !living.length) return <BirdGrid birds={[...living, ...extinct]} />;
  return (
    <>
      <section class={own.section} aria-label="Levende arter">
        <BirdGrid birds={living} />
      </section>
      <section class={own.section} aria-label="Utdødde arter">
        <h2 class={own.sectionTitle}>
          Utdødde arter <span class={own.sectionCount}>{speciesCount(extinct.length)}</span>
        </h2>
        <BirdGrid birds={extinct} />
      </section>
    </>
  );
}
