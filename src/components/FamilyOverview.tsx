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
  /** every species in it is extinct; such families come last in their order */
  extinct: boolean;
}

export interface OverviewOrder {
  slug: string;
  label: string;
  sci: string | null;
  families: OverviewFamily[];
  /** every family in it is extinct (moas, elephant birds); such orders come last */
  extinct: boolean;
}

const count = (n: number) => (n === 1 ? '1 art' : `${n} arter`);

/** Every order with its families as tiles: the ones with birds seen in Norway, or the whole world. */
export default function FamilyOverview({ orders }: { orders: OverviewOrder[] }) {
  const [mode, setMode] = useState<Mode>('norge');
  const all = orders.flatMap((o) => o.families);
  const norwayTotal = all.filter((f) => f.norway).length;

  useEffect(() => {
    if (modeFromUrl() === 'verden') setMode('verden');
    // A breadcrumb links to /familier#<order>; an order with no Norwegian families is only under Hele verden
    const jump = () => {
      const slug = decodeURIComponent(location.hash.slice(1));
      const order = orders.find((o) => o.slug === slug);
      if (!order || order.families.some((f) => f.norway)) return;
      setMode('verden');
      requestAnimationFrame(() => document.getElementById(slug)?.scrollIntoView());
    };
    jump();
    addEventListener('hashchange', jump);
    return () => removeEventListener('hashchange', jump);
  }, []);

  const choose = (m: Mode) => {
    setMode(m);
    saveModeInUrl(m);
  };

  const norway = mode === 'norge';
  const shown = orders
    .map((o) => ({ ...o, families: norway ? o.families.filter((f) => f.norway) : o.families }))
    .filter((o) => o.families.length);

  return (
    <>
      <div class={own.choices}>
        <button class={styles.chip} type="button" aria-pressed={norway} onClick={() => choose('norge')}>
          Sett i Norge <span class={own.chipCount}>{norwayTotal}</span>
        </button>
        <button class={styles.chip} type="button" aria-pressed={!norway} onClick={() => choose('verden')}>
          Hele verden <span class={own.chipCount}>{all.length}</span>
        </button>
      </div>
      <p class={own.note}>
        {norway
          ? `${norwayTotal} familier med fugler sett i Norge, i ${shown.length} ordener.`
          : `Alle verdens ${all.length} fuglefamilier, i ${shown.length} ordener.`}
      </p>
      {shown.map((o) => (
        <section key={o.slug} id={o.slug} class={own.order} aria-labelledby={`${o.slug}-title`}>
          <h2 id={`${o.slug}-title`} class={own.orderTitle}>
            {o.label}
            {(o.sci || o.extinct) && (
              <span class={own.orderSci}>{[o.sci, o.extinct && 'utdødd'].filter(Boolean).join(' · ')}</span>
            )}
          </h2>
          <ul class={styles.grid}>
            {o.families.map((f) => (
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
        </section>
      ))}
    </>
  );
}
