// Norge or Hele verden: one choice for the whole site (front page, /familier, family pages),
// remembered on this device. Client only; the server always renders Norge.
import { persistentAtom } from '@nanostores/persistent';

export type Area = 'norge' | 'verden';

const KEY = 'fuglebilder:area';

// Carry over the front page's old choice ("tilfeldige" was Hele verden) once.
// Must run before the atom below reads storage.
try {
  const old = localStorage.getItem('fuglebilder:front-mode') ?? localStorage.getItem('birdpic:front-mode');
  if (old !== null) {
    if (localStorage.getItem(KEY) === null) localStorage.setItem(KEY, old === 'tilfeldige' ? 'verden' : 'norge');
    localStorage.removeItem('fuglebilder:front-mode');
    localStorage.removeItem('birdpic:front-mode');
  }
} catch {}

export const $area = persistentAtom<Area>(KEY, 'norge', {
  encode: (a) => a,
  decode: (s) => (s === 'verden' ? 'verden' : 'norge'),
});

/**
 * Links from before the choice was site-wide carry ?vis=verden on family pages and /familier.
 * Take it as the choice and drop it from the address.
 */
export function takeAreaFromUrl() {
  const url = new URL(location.href);
  if (url.searchParams.get('vis') !== 'verden') return;
  $area.set('verden');
  url.searchParams.delete('vis');
  history.replaceState(history.state, '', url);
}
