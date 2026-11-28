import { Fragment } from 'preact';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { PHOTO_FILTERS, displayName, getJson, isPhotoFilter, photoUrl, type Photo, type PhotoFilter, type Taxon } from '../lib/shared';
import { $favorites } from '../lib/favorites';
import { initialPhotoIndex, openLightbox, type Slide } from '../lib/lightbox';
import { HeartIcon } from './icons';
import { Thumb } from './Thumb';
import { Skeletons } from './Tile';
import styles from './Grid.module.css';
import button from './Button.module.css';
import filterStyles from './PhotoGrid.module.css';
import seg from './Segmented.module.css';

/** null = alle bilder */
type Filter = PhotoFilter | null;

const FILTER_KEYS = Object.keys(PHOTO_FILTERS) as PhotoFilter[];

/** ?vis=ungfugl i adressen */
function readFilter(): Filter {
  const v = new URL(location.href).searchParams.get('vis');
  return isPhotoFilter(v) ? v : null;
}

function writeFilter(f: Filter) {
  const url = new URL(location.href);
  if (f) url.searchParams.set('vis', f);
  else url.searchParams.delete('vis');
  url.searchParams.delete('photo'); // bildenummeret gjelder det forrige utvalget
  history.replaceState(history.state, '', url.pathname + url.search + url.hash);
}

/** Alle bildene av én art, best stemte først, med uendelig rulling og filter for alder/kjønn. */
export default function PhotoGrid({ taxon }: { taxon: Taxon }) {
  const slidesRef = useRef<Slide[]>([]); // live array: the lightbox reads it while open
  const seen = useRef(new Set<string>()); // photo ids in slidesRef, to drop repeats across pages
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const [state, setState] = useState<'loading' | 'idle' | 'done' | 'error'>('loading');
  // undefined until read from the address after hydration (the page HTML is cached without it)
  const [filter, setFilter] = useState<Filter | undefined>(undefined);
  const filterRef = useRef<Filter | undefined>(undefined);
  const generation = useRef(0); // bumped on filter change, so late answers for the old filter are dropped
  const page = useRef(0);
  const busy = useRef<Promise<void> | null>(null);
  const hasMore = useRef(true);
  const sentinel = useRef<HTMLDivElement>(null);
  const tiles = useRef<HTMLUListElement>(null);
  const favorites = useStore($favorites);
  const favSet = useMemo(() => new Set(favorites.map((f) => f.p)), [favorites]);

  const loadMore = useCallback((): Promise<void> => {
    if (busy.current) return busy.current;
    if (!hasMore.current || filterRef.current === undefined) return Promise.resolve();
    const gen = generation.current;
    const path = `/api/photos/${taxon.id}/${filterRef.current ?? 'alle'}/${page.current + 1}.json`;
    setState('loading');
    const job = (async () => {
      try {
        const data = await getJson<{ photos: Photo[]; hasMore: boolean }>(path);
        if (gen !== generation.current) return;
        page.current++;
        hasMore.current = data.hasMore;
        for (const photo of data.photos) {
          if (seen.current.has(photo.p)) continue;
          seen.current.add(photo.p);
          slidesRef.current.push({ photo, taxon });
        }
        rerender(0);
        setState(hasMore.current ? 'idle' : 'done');
      } catch {
        if (gen === generation.current) setState('error');
      } finally {
        if (gen === generation.current) busy.current = null; // otherwise choose() already let go of it
      }
    })();
    busy.current = job;
    return job;
  }, [taxon]);

  const choose = useCallback(
    (f: Filter) => {
      if (f === filterRef.current) return;
      generation.current++;
      busy.current = null;
      page.current = 0;
      hasMore.current = true;
      slidesRef.current = [];
      seen.current = new Set();
      rerender(0);
      filterRef.current = f;
      setFilter(f);
      writeFilter(f);
      void loadMore();
    },
    [loadMore],
  );

  const open = useCallback(
    (index: number) =>
      openLightbox({
        slides: slidesRef.current,
        index,
        loadMore,
        onChange: (i) => tiles.current?.children[i]?.scrollIntoView({ block: 'nearest' }),
      }),
    [loadMore],
  );

  // Første side, og åpne ?photo=n hvis adressen ber om det
  useEffect(() => {
    const f = readFilter();
    filterRef.current = f;
    setFilter(f);
    const gen = generation.current;
    (async () => {
      await loadMore();
      const want = initialPhotoIndex();
      if (want === null) return;
      while (slidesRef.current.length <= want && hasMore.current && gen === generation.current) {
        await loadMore();
        if (page.current > 20) break;
      }
      if (gen === generation.current && want < slidesRef.current.length) open(want);
    })();
  }, []);

  // Uendelig rulling
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => entries[0].isIntersecting && loadMore(), {
      rootMargin: '1200px 0px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, state]);

  const slides = slidesRef.current;
  const alt = displayName(taxon);
  const active = filter ? PHOTO_FILTERS[filter] : null;

  return (
    <>
      {/* Alle | Voksen Ungfugl | Hann Hunn: the small pill from the front page, scrolls sideways if too wide */}
      <div class={filterStyles.filters}>
        <div class={seg.group} role="group" aria-label="Vis bilder av">
          <button class={seg.option} type="button" aria-pressed={filter === null} onClick={() => choose(null)}>
            Alle
          </button>
          {FILTER_KEYS.map((key, i) => (
            <Fragment key={key}>
              {(i === 0 || PHOTO_FILTERS[key].kind !== PHOTO_FILTERS[FILTER_KEYS[i - 1]].kind) && (
                <span class={seg.sep} aria-hidden="true" />
              )}
              <button
                class={seg.option}
                type="button"
                aria-pressed={filter === key}
                onClick={() => choose(filter === key ? null : key)}
              >
                {PHOTO_FILTERS[key].label}
              </button>
            </Fragment>
          ))}
        </div>
      </div>

      <ul class={styles.grid} ref={tiles}>
        {slides.map((s, i) => (
          <li key={s.photo.p}>
            <button class={styles.tile} type="button" onClick={() => open(i)} aria-label={`Åpne bilde ${i + 1}`}>
              <Thumb src={photoUrl(s.photo.p, 'medium')} alt={alt} />
              {favSet.has(s.photo.p) && <HeartIcon class={styles.heart} />}
            </button>
          </li>
        ))}
        {state === 'loading' && <Skeletons count={slides.length ? 4 : 12} />}
      </ul>

      {state === 'error' && (
        <p class={styles.status}>
          Klarte ikke å hente bildene.{' '}
          <button class={`${button.button} ${button.primary}`} type="button" onClick={() => loadMore()}>
            Prøv igjen
          </button>
        </p>
      )}
      {state === 'done' && slides.length === 0 && !active && (
        <p class={styles.status}>Fant ingen bilder av denne fuglen ennå.</p>
      )}
      {state === 'done' && slides.length === 0 && active && (
        <div class={filterStyles.empty}>
          <p class={filterStyles.emptyTitle}>Fant ingen bilder</p>
          <button class={`${button.button} ${button.primary}`} type="button" onClick={() => choose(null)}>
            Vis alle bilder
          </button>
        </div>
      )}
      {state === 'idle' && <div ref={sentinel} class={styles.sentinel} />}
    </>
  );
}
