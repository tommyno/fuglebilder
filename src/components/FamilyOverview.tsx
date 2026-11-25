import { useEffect, useState } from 'preact/hooks';
import { photoUrl } from '../lib/shared';
import { modeFromUrl, saveModeInUrl, type Mode } from './FamilyGrid';
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

/** Every family as a tile, A–Å: the ones with birds seen in Norway, or the whole world. */
export default function FamilyOverview({ families }: { families: OverviewFamily[] }) {
  const [mode, setMode] = useState<Mode>('norge');
  const norwegian = families.filter((f) => f.norway);

  useEffect(() => {
    if (modeFromUrl() === 'verden') setMode('verden');
  }, []);

  const choose = (m: Mode) => {
    setMode(m);
    saveModeInUrl(m);
  };

  const norway = mode === 'norge';
  const shown = norway ? norwegian : families;

  return (
    <>
      <div class={own.choices}>
        <button class={styles.chip} type="button" aria-pressed={norway} onClick={() => choose('norge')}>
          Sett i Norge <span class={own.chipCount}>{norwegian.length}</span>
        </button>
        <button class={styles.chip} type="button" aria-pressed={!norway} onClick={() => choose('verden')}>
          Hele verden <span class={own.chipCount}>{families.length}</span>
        </button>
      </div>
      <ul class={styles.grid}>
        {shown.map((f) => (
          <li key={f.href}>
            <a class={styles.tile} href={norway ? f.href : `${f.href}?vis=verden`}>
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
    </>
  );
}
