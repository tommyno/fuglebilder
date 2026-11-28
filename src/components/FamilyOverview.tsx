import { photoUrl } from '../lib/shared';
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

function Families({ families, norway }: { families: OverviewFamily[]; norway: boolean }) {
  return (
    <ul class={styles.grid}>
      {families.map((f) => (
        <li key={f.href}>
          {/* From the world view to the family page's world view */}
          <a class={styles.tile} href={norway ? f.href : `${f.href}#verden`}>
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
  );
}

/**
 * /familier, under BrowseNav: every family as a tile, A–Å. Both views are in the page; CSS shows
 * the Norge one (families with birds seen in Norway, with their Norwegian cover bird and count)
 * or, with #verden, the world one. Photos in the hidden view load lazily, so aren't fetched.
 */
export default function FamilyOverview({ families }: { families: OverviewFamily[] }) {
  const norwegian = families.filter((f) => f.norway);
  return (
    <>
      <div data-area="norge">
        <Families families={norwegian} norway />
      </div>
      <div data-area="verden">
        <Families families={families} norway={false} />
      </div>
    </>
  );
}
