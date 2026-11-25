import { areaPath, type Area } from '../lib/area';
import AreaSwitch from './AreaSwitch';
import styles from './BrowseNav.module.css';

export type Tab = 'arter' | 'familier';

const TAB_PATHS: Record<Tab, string> = { arter: '/', familier: '/familier' };

interface Props {
  tab: Tab;
  area: Area;
  choose: (a: Area) => void;
}

/**
 * Top of the front page and /familier: where (Norge | Hele verden), then what (Arter | Familier).
 * The tabs are plain links between the two pages, in the area shown: / and /familier, or
 * /verden and /verden/familier. How many is said in the line under the tabs, not on them.
 */
export default function BrowseNav({ tab, area, choose }: Props) {
  const link = (value: Tab, label: string) => (
    <a class={styles.tab} href={areaPath(TAB_PATHS[value], area)} aria-current={tab === value ? 'page' : undefined}>
      {label}
    </a>
  );

  return (
    <div class={styles.nav}>
      <AreaSwitch area={area} choose={choose} path={TAB_PATHS[tab]} />
      <nav class={styles.tabs} aria-label="Visning">
        {link('arter', 'Arter')}
        {link('familier', 'Familier')}
      </nav>
    </div>
  );
}
