import type { Area } from '../lib/area';
import AreaSwitch from './AreaSwitch';
import styles from './BrowseNav.module.css';

export type Tab = 'arter' | 'familier';

/**
 * Top of the front page and /familier: where (Norge | Hele verden), then what (Arter | Familier).
 * The tabs are plain links between the two pages; the area choice follows along. How many is
 * said in the line under the tabs, not on them.
 */
export default function BrowseNav({ tab, area }: { tab: Tab; area: Area | null }) {
  const link = (value: Tab, href: string, label: string) => (
    <a class={styles.tab} href={href} aria-current={tab === value ? 'page' : undefined}>
      {label}
    </a>
  );

  return (
    <div class={styles.nav}>
      <AreaSwitch area={area} />
      <nav class={styles.tabs} aria-label="Visning">
        {link('arter', '/', 'Arter')}
        {link('familier', '/familier', 'Familier')}
      </nav>
    </div>
  );
}
