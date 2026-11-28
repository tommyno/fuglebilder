// Thumb's fade-in (Thumb.tsx), for every grid image: plain HTML grids and islands alike. One
// listener on the document catches images added later (more photos, a new random set) too.

const waiting = (el: EventTarget | null): el is HTMLImageElement =>
  el instanceof HTMLImageElement && el.dataset.state === 'loading';

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
