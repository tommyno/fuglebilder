import type { ComponentChildren } from 'preact';
import type { Taxon } from '../lib/shared';
import { displayName } from '../lib/shared';
import styles from './Grid.module.css';

/**
 * Name over the bottom of a grid tile: Norwegian name, with the Latin one under it,
 * or `sub` in its place ("25 arter" on a family).
 */
export const TileLabel = ({ taxon, sub }: { taxon: Pick<Taxon, 'sci' | 'name'>; sub?: ComponentChildren }) => (
  <span class={styles.label}>
    <span class={styles.labelName}>{displayName(taxon)}</span>
    {sub ? (
      <span class={styles.labelSub}>{sub}</span>
    ) : (
      taxon.name && <span class={`${styles.labelSub} ${styles.labelSci}`}>{taxon.sci}</span>
    )}
  </span>
);

/** Pulsing placeholder tiles while a grid loads. */
export const Skeletons = ({ count }: { count: number }) => (
  <>
    {Array.from({ length: count }, (_, i) => (
      <li key={`skeleton-${i}`} class={styles.skeleton} />
    ))}
  </>
);
