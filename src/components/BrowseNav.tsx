import type { Area } from '../lib/area';
import AreaSwitch from './AreaSwitch';
import styles from './BrowseNav.module.css';

export type Tab = 'arter' | 'familier';

export interface BrowseCounts {
  /** species on the Sett i Norge list */
  norgeArter: number;
  norgeFamilier: number;
  verdenFamilier: number;
}

interface Props {
  tab: Tab;
  area: Area | null;
  counts: BrowseCounts;
}

/**
 * Top of the front page and /familier: where (Norge | Hele verden), then what (Arter | Familier).
 * The tabs are plain links between the two pages; the area choice follows along.
 */
export default function BrowseNav({ tab, area, counts }: Props) {
  // No count on "Arter" for the whole world: that view is a random handful, not a list
  const arter = area === 'norge' ? counts.norgeArter : null;
  const familier = area === 'verden' ? counts.verdenFamilier : area === 'norge' ? counts.norgeFamilier : null;

  const link = (value: Tab, href: string, label: string, count: number | null) => (
    <a class={styles.tab} href={href} aria-current={tab === value ? 'page' : undefined}>
      {label}
      {count !== null && <span class={styles.count}>{count}</span>}
    </a>
  );

  return (
    <div class={styles.nav}>
      <AreaSwitch area={area} />
      <nav class={styles.tabs} aria-label="Visning">
        {link('arter', '/', 'Arter', arter)}
        {link('familier', '/familier', 'Familier', familier)}
      </nav>
    </div>
  );
}
