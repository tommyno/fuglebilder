import BirdGrid, { type GridBird } from './BirdGrid';
import own from './Families.module.css';

export interface FamilyBird extends GridBird {
  /** on the Sett i Norge list */
  no: boolean;
  /** extinct: its own section at the bottom, as the photos are mostly skeletons and museum birds */
  ex: boolean;
}

const count = (n: number) => (n === 1 ? '1 art' : `${n} arter`);

/**
 * A family's species, A–Å, under the area switch (BrowseNav.astro) when `split`: the Norge view
 * has the living species seen in Norway, the world view (#verden) every living species in one
 * list, then Utdødde arter under their own heading. Without `split` (no species seen in Norway,
 * or all of them) only the world view, as the other would be empty or the same.
 */
export default function FamilyGrid({ birds, split }: { birds: FamilyBird[]; split: boolean }) {
  if (!split) return <World birds={birds} />;
  return (
    <>
      <div data-area="norge">
        <BirdGrid birds={birds.filter((b) => b.no && !b.ex)} />
      </div>
      <div data-area="verden">
        <World birds={birds} />
      </div>
    </>
  );
}

function World({ birds }: { birds: FamilyBird[] }) {
  const living = birds.filter((b) => !b.ex);
  const extinct = birds.filter((b) => b.ex);
  if (!extinct.length || !living.length) return <BirdGrid birds={birds} />;

  return (
    <>
      <section class={own.section} aria-label="Levende arter">
        <BirdGrid birds={living} />
      </section>
      <section class={own.section} aria-label="Utdødde arter">
        <h2 class={own.sectionTitle}>
          Utdødde arter <span class={own.sectionCount}>{count(extinct.length)}</span>
        </h2>
        <BirdGrid birds={extinct} />
      </section>
    </>
  );
}
