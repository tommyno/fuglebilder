// Thumb's fade-in (Thumb.tsx) for grids rendered as plain HTML, not islands: the front page's
// Sett i Norge, /familier and family pages. Hydrating them only for this put their whole list
// in the page twice (markup and island props). Images inside islands run Thumb's own code.

const waiting = (el: EventTarget | null): el is HTMLImageElement =>
  el instanceof HTMLImageElement && el.dataset.state === 'loading' && !el.closest('astro-island');

/** Show it once decoded, so the fade starts with the whole picture, not a half-drawn one. */
function show(img: HTMLImageElement) {
  (img.decode ? img.decode().catch(() => {}) : Promise.resolve()).then(() => {
    img.dataset.state = 'ready';
  });
}

// load and error don't bubble, so listen in the capture phase
document.addEventListener('load', (e) => waiting(e.target) && show(e.target), true);
document.addEventListener(
  'error',
  (e) => {
    if (waiting(e.target)) e.target.dataset.state = 'failed';
  },
  true,
);

// Loaded before this script ran: no load event will come
for (const img of document.querySelectorAll('img')) {
  if (waiting(img) && img.complete && img.naturalWidth > 0) show(img);
}
