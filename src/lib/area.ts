// Norge or Hele verden, kept in the path: Norge has no prefix (/, /familier, /familie/alkefamilien),
// the whole world lives under /verden (/verden, /verden/familier, /verden/familie/alkefamilien).
// The server renders the right one from the path; no import here, so pages and islands share it.

export type Area = 'norge' | 'verden';

/** The `area` rest param of a page under src/pages/[...area]: none for Norge, "verden", else no such page. */
export function areaFromParam(param: string | undefined): Area | null {
  if (param === undefined) return 'norge';
  return param === 'verden' ? 'verden' : null;
}

/** The area a path is in: /verden/… or not. */
export const areaOfPath = (path: string): Area => (/^\/verden(\/|$)/.test(path) ? 'verden' : 'norge');

/** A page's path in an area, from its Norge path: ("/familier", "verden") → "/verden/familier", ("/", "verden") → "/verden". */
export const areaPath = (path: string, area: Area) => (area === 'norge' ? path : path === '/' ? '/verden' : `/verden${path}`);

/** The area-free (Norge) path of a path: "/verden/familier" → "/familier", "/verden" → "/". */
export const norgePath = (path: string) => path.replace(/^\/verden(?=\/|$)/, '') || '/';
