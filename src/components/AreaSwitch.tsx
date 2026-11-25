import { useEffect, useState } from 'preact/hooks';
import { areaOfPath, areaPath, norgePath, type Area } from '../lib/area';
import seg from './Segmented.module.css';

/**
 * Norge | Hele verden on a page that has both: starts from the area the server rendered (from the
 * path), and switching shows the other one in place and moves the address to it (/familier ↔
 * /verden/familier), so it feels like a toggle and not a new page. Back and Forward switch too.
 */
export function useArea(initial: Area): [Area, (a: Area) => void] {
  const [area, setArea] = useState(initial);

  useEffect(() => {
    const onPop = () => setArea(areaOfPath(location.pathname));
    addEventListener('popstate', onPop);
    return () => removeEventListener('popstate', onPop);
  }, []);

  const choose = (a: Area) => {
    if (a === areaOfPath(location.pathname)) return;
    history.pushState(null, '', areaPath(norgePath(location.pathname), a) + location.search);
    setArea(a);
  };
  return [area, choose];
}

interface Props {
  area: Area;
  choose: (a: Area) => void;
  /** this page's Norge path ("/familier"), for the links */
  path: string;
  /** how many in each, after the label: "Norge 6", "Hele verden 26" */
  counts?: Record<Area, number>;
}

/**
 * Norge | Hele verden, the same control on the front page, /familier and family pages.
 * Real links to the page in the other area, so it works before (or without) JavaScript;
 * a plain click switches in place instead.
 */
export default function AreaSwitch({ area, choose, path, counts }: Props) {
  const option = (value: Area, label: string) => (
    <a
      class={seg.option}
      href={areaPath(path, value)}
      aria-current={area === value ? 'page' : undefined}
      onClick={(e) => {
        // A new tab or window (Ctrl/Cmd/Shift-click, middle click) is left to the browser
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        choose(value);
      }}
    >
      {label}
      {counts && <span class={seg.count}>{counts[value]}</span>}
    </a>
  );
  return (
    <nav class={`${seg.group} ${seg.wide}`} aria-label="Område">
      {option('norge', 'Norge')}
      {option('verden', 'Hele verden')}
    </nav>
  );
}
