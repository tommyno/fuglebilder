import { useEffect, useRef, useState } from 'preact/hooks';
import { birdPath, getJson, photoUrl } from '../lib/shared';
import type { SearchResult as Result } from '../lib/species.server';
import { BirdIcon, SearchIcon } from './icons';
import styles from './SearchBox.module.css';

/** Same query → same URL, so the server cache is shared. */
const cacheKey = (q: string) =>
  q
    .toLowerCase()
    .replace(/[/\\?#.%]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export default function SearchBox() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [searched, setSearched] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const key = cacheKey(q);
    if (key.replaceAll(' ', '').length < 2) {
      setResults([]);
      setSearched('');
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const data = await getJson<{ results: Result[] }>(`/api/search/${encodeURIComponent(key)}.json`, ctrl.signal);
        setResults(data.results);
        setSearched(key);
        setActive(-1);
        setOpen(true);
      } catch {
        /* avbrutt, offline eller serverfeil */
      }
    }, 120);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  // Lukk når man trykker utenfor
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(-1, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = results[active] ?? results[0];
      if (r) location.href = birdPath(r);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const showList = open && searched !== '';

  return (
    <div class={styles.root} ref={rootRef}>
      <form role="search" class={styles.field} onSubmit={(e) => e.preventDefault()}>
        <SearchIcon class={styles.icon} />
        <input
          class={styles.input}
          type="search"
          inputMode="search"
          enterKeyHint="search"
          placeholder="Søk etter fugler"
          aria-label="Fuglenavn"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellcheck={false}
          role="combobox"
          list={undefined} // Preact's types require `list` on a combobox input
          aria-expanded={showList}
          aria-controls="bird-suggestions"
          aria-activedescendant={active >= 0 ? `bird-opt-${active}` : undefined}
          value={q}
          onInput={(e) => {
            setQ((e.target as HTMLInputElement).value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
      </form>

      {showList && (
        <ul class={styles.list} id="bird-suggestions" role="listbox">
          {results.length === 0 && <li class={styles.empty}>Fant ingen fugler for «{searched}»</li>}
          {results.map((r, i) => (
            <li key={r.id} id={`bird-opt-${i}`} role="option" aria-selected={i === active}>
              <a
                class={`${styles.option} ${i === active ? styles.active : ''}`}
                href={birdPath(r)}
                onPointerEnter={() => setActive(i)}
              >
                {r.photo ? (
                  <img class={styles.thumb} src={photoUrl(r.photo, 'small')} alt="" loading="lazy" />
                ) : (
                  <span class={`${styles.thumb} ${styles.noThumb}`}>
                    <BirdIcon />
                  </span>
                )}
                <span class={styles.text}>
                  <span class={styles.primary}>{r.name ?? <i>{r.sci}</i>}</span>
                  <span class={styles.secondary}>
                    {r.alias && <>også kalt {r.alias} · </>}
                    {r.name && <i>{r.sci}</i>}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
