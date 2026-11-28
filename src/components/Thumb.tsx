/**
 * A grid image that stays hidden until it has fully loaded and decoded, then fades in, so it
 * never paints top-to-bottom like a curtain. The tile behind it pulses meanwhile. The fade is
 * src/lib/thumbs.ts, for every page: islands and plain HTML grids alike.
 * Callers key the tile per photo, so an <img> never gets a new src.
 */
export function Thumb({ src, alt }: { src: string; alt: string }) {
  return <img src={src} alt={alt} loading="lazy" decoding="async" data-state="loading" />;
}
