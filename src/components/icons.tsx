/** Also drawn by the lightbox, which builds its button from plain HTML. */
export const HEART_PATH =
  'M12 21s-7.5-4.6-9.6-9.3C.8 8 3 4 6.9 4c2.1 0 3.6 1.2 5.1 3 1.5-1.8 3-3 5.1-3C21 4 23.2 8 21.6 11.7 19.5 16.4 12 21 12 21Z';

export const HeartIcon = ({ class: className }: { class?: string }) => (
  <svg class={className} viewBox="0 0 24 24" aria-hidden="true">
    <path fill="currentColor" d={HEART_PATH} />
  </svg>
);

export const BirdIcon = ({ class: className }: { class?: string }) => (
  <svg class={className} viewBox="0 0 64 64" aria-hidden="true">
    <path
      fill="currentColor"
      d="M44 14a8 8 0 0 0-7.6 5.5L33 30c-6 0-14-3-20-9 0 13 7 22 17 24l-6 7h8l5-6.5c8-1.5 13-8.5 13-17.5v-5l6-3-6-2a8 8 0 0 0-6-4Zm0 5a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z"
    />
  </svg>
);

export const ShuffleIcon = ({ class: className }: { class?: string }) => (
  <svg class={className} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
  </svg>
);

export const SearchIcon = ({ class: className }: { class?: string }) => (
  <svg class={className} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export const ArrowUpIcon = ({ class: className }: { class?: string }) => (
  <svg class={className} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);
