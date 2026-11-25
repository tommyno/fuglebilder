import { useEffect, useState } from 'preact/hooks';
import { $area, type Area } from '../lib/area';
import seg from './Segmented.module.css';

/**
 * The site-wide Norge / Hele verden choice. null until the page has started in the browser:
 * the server can't know the viewer's choice, so reading it during hydration would mismatch.
 */
export function useArea(): Area | null {
  const [area, setArea] = useState<Area | null>(null);
  useEffect(() => $area.subscribe(setArea), []);
  return area;
}

interface Props {
  area: Area | null;
  /** how many in each, after the label: "Norge 6", "Hele verden 26" */
  counts?: Record<Area, number>;
}

/** Norge | Hele verden, the same control on the front page, /familier and family pages. */
export default function AreaSwitch({ area, counts }: Props) {
  const option = (value: Area, label: string) => (
    <button
      class={seg.option}
      type="button"
      aria-pressed={area === value}
      onClick={() => area !== value && $area.set(value)}
    >
      {label}
      {counts && <span class={seg.count}>{counts[value]}</span>}
    </button>
  );
  return (
    <div class={`${seg.group} ${seg.wide}`} role="group" aria-label="Område">
      {option('norge', 'Norge')}
      {option('verden', 'Hele verden')}
    </div>
  );
}
