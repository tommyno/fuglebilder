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
 * A family's species, A–Å, all on one page: Sett i Norge first, then Ellers i verden, then
 * Utdødde arter. Headings only when there is more than one part.
 */
export default function FamilyGrid({ birds }: { birds: FamilyBird[] }) {
  const sections = [
    { title: 'Sett i Norge', birds: birds.filter((b) => b.no) },
    { title: 'Ellers i verden', birds: birds.filter((b) => !b.no && !b.ex) },
    { title: 'Utdødde arter', birds: birds.filter((b) => b.ex) },
  ].filter((s) => s.birds.length);

  if (sections.length === 1) return <BirdGrid birds={sections[0].birds} />;

  return (
    <>
      {sections.map((s) => (
        <section key={s.title} class={own.section} aria-label={s.title}>
          <h2 class={own.sectionTitle}>
            {s.title} <span class={own.sectionCount}>{count(s.birds.length)}</span>
          </h2>
          <BirdGrid birds={s.birds} />
        </section>
      ))}
    </>
  );
}
