import { useEffect } from 'preact/hooks';
import { takeAreaFromUrl } from '../lib/area';
import { photoUrl } from '../lib/shared';
import { useArea } from './AreaSwitch';
import BrowseNav, { type BrowseCounts } from './BrowseNav';
import browse from './BrowseNav.module.css';
import { Thumb } from './Thumb';
import styles from './Grid.module.css';
import own from './Families.module.css';

export interface OverviewFamily {
  href: string;
  /** display name: Norwegian, or Latin when there is none */
  label: string;
  /** species with a photo, extinct ones too */
  world: number;
  /** species on the Sett i Norge list */
  norway: number;
  /** cover photo: the most observed species in the world, and in Norway */
  photo: string;
  photoNo: string | null;
  /** every species in it is extinct; such families come last */
  extinct: boolean;
}

const count = (n: number) => (n === 1 ? '1 art' : `${n} arter`);

/** /familier, the Familier tab: every family as a tile, A–Å, the ones with birds seen in Norway or the whole world. */
export default function FamilyOverview({ families, counts }: { families: OverviewFamily[]; counts: BrowseCounts }) {
  useEffect(takeAreaFromUrl, []);
  const chosen = useArea();
  // The server renders Sett i Norge, so show that until the viewer's choice is known
  const norway = chosen !== 'verden';
  const shown = norway ? families.filter((f) => f.norway) : families;

  return (
    <section class={browse.section} aria-label="Familier">
      <BrowseNav tab="familier" area={chosen} counts={counts} />
      <p class={browse.lead}>{norway ? 'Familier med fugler sett i Norge, A–Å' : 'Alle verdens fuglefamilier, A–Å'}</p>
      <ul class={styles.grid}>
        {shown.map((f) => (
          <li key={f.href}>
            <a class={styles.tile} href={f.href}>
              <Thumb src={photoUrl((norway && f.photoNo) || f.photo, 'medium')} alt="" />
              <span class={styles.label}>
                <span class={styles.labelName}>{f.label}</span>
                <span class={own.tileCount}>
                  {count(norway ? f.norway : f.world)}
                  {f.extinct && ', utdødd'}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
