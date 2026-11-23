import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { photoUrl, type Photo, type Taxon } from '../lib/shared';
import { $favorites, type SlideTaxon } from '../lib/favorites';
import { initialPhotoIndex, openLightbox, type Slide } from '../lib/lightbox';
import { HeartIcon } from './icons';
import styles from './Grid.module.css';

/** Alle bildene av én art, best stemte først, med uendelig rulling. */
export default function PhotoGrid({ taxon }: { taxon: Taxon }) {
  const slidesRef = useRef<Slide[]>([]);
  const [count, setCount] = useState(0); // re-render trigger; slides live in the ref
  const [state, setState] = useState<'loading' | 'idle' | 'done' | 'error'>('loading');
  const page = useRef(0);
  const busy = useRef<Promise<void> | null>(null);
  const hasMore = useRef(true);
  const sentinel = useRef<HTMLDivElement>(null);
  const tiles = useRef<HTMLUListElement>(null);
  const favorites = useStore($favorites);
  const favSet = useMemo(() => new Set(favorites.map((f) => f.p)), [favorites]);

  const slideTaxon: SlideTaxon = useMemo(() => ({ id: taxon.id, sci: taxon.sci, name: taxon.name }), [taxon]);

  const loadMore = useCallback((): Promise<void> => {
    if (busy.current) return busy.current;
    if (!hasMore.current) return Promise.resolve();
    setState('loading');
    busy.current = (async () => {
      try {
        const res = await fetch(`/api/photos/${taxon.id}/${page.current + 1}.json`);
        if (!res.ok) throw new Error(String(res.status));
        const data: { photos: Photo[]; hasMore: boolean } = await res.json();
        page.current++;
        hasMore.current = data.hasMore;
        const seen = new Set(slidesRef.current.map((s) => s.photo.p));
        for (const photo of data.photos) {
          if (!seen.has(photo.p)) slidesRef.current.push({ photo, taxon: slideTaxon });
        }
        setCount(slidesRef.current.length);
        setState(hasMore.current ? 'idle' : 'done');
      } catch {
        setState('error');
      } finally {
        busy.current = null;
      }
    })();
    return busy.current;
  }, [taxon.id, slideTaxon]);

  const open = useCallback(
    (index: number) =>
      openLightbox({
        slides: slidesRef.current,
        index,
        loadMore: () => loadMore(),
        onChange: (i) => tiles.current?.children[i]?.scrollIntoView({ block: 'nearest' }),
      }),
    [loadMore],
  );

  // Første side, og åpne ?photo=n hvis adressen ber om det
  useEffect(() => {
    (async () => {
      await loadMore();
      const want = initialPhotoIndex();
      if (want === null) return;
      while (slidesRef.current.length <= want && hasMore.current) {
        await loadMore();
        if (page.current > 20) break;
      }
      if (want < slidesRef.current.length) open(want);
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
  const alt = slideTaxon.name ?? taxon.sci;

  return (
    <>
      <ul class={styles.grid} ref={tiles} data-count={count}>
        {slides.map((s, i) => (
          <li key={s.photo.p}>
            <button class={styles.tile} type="button" onClick={() => open(i)} aria-label={`Åpne bilde ${i + 1}`}>
              <img src={photoUrl(s.photo.p, 'medium')} alt={alt} loading="lazy" decoding="async" />
              {favSet.has(s.photo.p) && <HeartIcon class={styles.heart} />}
            </button>
          </li>
        ))}
        {state === 'loading' && Array.from({ length: slides.length ? 4 : 12 }, (_, i) => <li key={`s${i}`} class={styles.skeleton} />)}
      </ul>

      {state === 'error' && (
        <p class={styles.status}>
          Klarte ikke å hente bildene.{' '}
          <button class={styles.button} type="button" onClick={() => loadMore()}>
            Prøv igjen
          </button>
        </p>
      )}
      {state === 'done' && slides.length === 0 && <p class={styles.status}>Fant ingen bilder av denne fuglen ennå.</p>}
      {state === 'done' && slides.length > 0 && <p class={styles.status}>Det var alle bildene ({slides.length}).</p>}
      {state === 'idle' && <div ref={sentinel} class={styles.sentinel} />}
    </>
  );
}
