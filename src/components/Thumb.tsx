import { useEffect, useRef, useState } from 'preact/hooks';

/**
 * A grid image that stays hidden until it has fully loaded and decoded, then fades in,
 * so it never paints top-to-bottom like a curtain. The tile behind it pulses meanwhile.
 * Rendered without an island (plain HTML grids), src/lib/thumbs.ts does the same.
 */
export function Thumb({ src, alt }: { src: string; alt: string }) {
  const img = useRef<HTMLImageElement>(null);
  const [ready, setReady] = useState<string | null>(null); // the src that is ready to show
  const [failed, setFailed] = useState<string | null>(null);

  const show = () => {
    const el = img.current;
    if (!el) return;
    // decode() first so the fade starts with the whole picture, not a half-drawn one
    (el.decode ? el.decode().catch(() => {}) : Promise.resolve()).then(() => setReady(src));
  };

  // Already loaded (from cache, or before hydration): onLoad won't fire again
  useEffect(() => {
    const el = img.current;
    if (el?.complete && el.naturalWidth > 0) show();
  }, [src]);

  const state = ready === src ? 'ready' : failed === src ? 'failed' : 'loading';

  return (
    <img
      ref={img}
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      data-state={state}
      onLoad={show}
      onError={() => setFailed(src)}
    />
  );
}
