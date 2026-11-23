// Fullskjermvisning (PhotoSwipe): sveip/piler mellom bilder, knip for å zoome,
// trykk for å skjule teksten. Legger ?photo=n i adressen så Tilbake lukker den.
import 'photoswipe/style.css';
import './lightbox.css';
import type PhotoSwipe from 'photoswipe';
import type { SlideData } from 'photoswipe';
import { displayName, licenseLabel, licenseUrl, photoUrl, sourceUrl, type Photo } from './shared';
import { HEART_PATH } from '../components/icons';
import { $favorites, isFavorite, toggleFavorite, type SlideTaxon } from './favorites';

export interface Slide {
  photo: Photo;
  taxon: SlideTaxon;
}

export interface LightboxOptions {
  /** Live array: the grid may push more slides while the view is open. */
  slides: Slide[];
  index: number;
  /** Called near the end so the grid can load more photos. */
  loadMore?: () => Promise<void>;
  /** Index changes, so the grid can scroll along. */
  onChange?: (index: number) => void;
}

const LARGE = 1024; // iNat "large" is at most 1024 px on the long edge

function toSlideData({ photo }: Slide, alt: string): SlideData {
  const scale = Math.min(1, LARGE / Math.max(photo.w, photo.h));
  const large = photoUrl(photo.p, 'large');
  return {
    src: large,
    // full resolution loads when zooming in
    srcset: `${large} ${Math.round(photo.w * scale)}w, ${photoUrl(photo.p, 'original')} ${photo.w}w`,
    msrc: photoUrl(photo.p, 'medium'),
    width: photo.w,
    height: photo.h,
    alt,
  };
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) => {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text) e.textContent = text;
  return e;
};

function link(href: string, text: string) {
  const a = el('a', undefined, text);
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener';
  return a;
}

function renderCaption(box: HTMLElement, s: Slide) {
  box.replaceChildren();
  box.append(el('div', 'bp-name', displayName(s.taxon)));
  if (s.taxon.name) box.append(el('div', 'bp-sci', s.taxon.sci));
  const credit = el('div', 'bp-credit');
  credit.append(`Foto: ${s.photo.by} · `, link(licenseUrl(s.photo.lic), licenseLabel(s.photo.lic)), ' · ');
  credit.append(link(sourceUrl(s.photo), 'iNaturalist'));
  box.append(credit);
}

const HEART = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${HEART_PATH}"/></svg>`;

const photoParam = () => new URL(location.href).searchParams.get('photo');

function urlWithPhoto(index: number | null): string {
  const url = new URL(location.href);
  if (index === null) url.searchParams.delete('photo');
  else url.searchParams.set('photo', String(index));
  return url.pathname + url.search + url.hash;
}

/** The ?photo=n the page was opened with, if any. */
export function initialPhotoIndex(): number | null {
  const v = photoParam();
  const n = v === null ? NaN : Number(v);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

export async function openLightbox({ slides, index, loadMore, onChange }: LightboxOptions): Promise<PhotoSwipe> {
  const { default: PhotoSwipe } = await import('photoswipe');

  const pswp = new PhotoSwipe({
    dataSource: slides as unknown as SlideData[],
    index,
    loop: false,
    bgOpacity: 1,
    showHideAnimationType: 'fade',
    tapAction: 'toggle-controls',
    imageClickAction: 'zoom',
    doubleTapAction: 'zoom',
    preload: [1, 3],
    closeTitle: 'Lukk',
    zoomTitle: 'Zoom',
    arrowPrevTitle: 'Forrige',
    arrowNextTitle: 'Neste',
    errorMsg: 'Bildet kunne ikke lastes.',
    paddingFn: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  });

  pswp.addFilter('itemData', (_data, i) => {
    const s = slides[i];
    return s ? toSlideData(s, displayName(s.taxon)) : {};
  });
  pswp.addFilter('numItems', () => slides.length);

  // Fade the large image in over the (already sharp) grid thumbnail once it's fully
  // loaded, instead of letting it paint top-to-bottom. PhotoSwipe keeps the
  // placeholder for 1 s after load, which covers the fade.
  // Hooked on contentAppend, not loadComplete: PhotoSwipe preloads images a few
  // slides ahead before they belong to a slide, and those never fire loadComplete.
  pswp.on('contentAppend', ({ content }) => {
    const img = content.element;
    if (!(img instanceof HTMLImageElement) || img.classList.contains('bp-ready')) return;
    const show = () => void img.decode().catch(() => {}).finally(() => img.classList.add('bp-ready'));
    if (img.complete && img.naturalWidth > 0) show();
    else img.addEventListener('load', show, { once: true });
  });

  pswp.on('uiRegister', () => {
    pswp.ui!.registerElement({
      name: 'bp-caption',
      appendTo: 'root',
      order: 9,
      onInit: (box, p) => {
        const update = () => slides[p.currIndex] && renderCaption(box, slides[p.currIndex]);
        p.on('change', update);
        update();
      },
    });
    pswp.ui!.registerElement({
      name: 'bp-heart',
      order: 8,
      isButton: true,
      title: 'Lagre i Mine fugler',
      html: HEART,
      onInit: (btn, p) => {
        const update = () => {
          const s = slides[p.currIndex];
          const on = !!s && isFavorite(s.photo.p);
          btn.classList.toggle('is-on', on);
          btn.setAttribute('aria-pressed', String(on));
        };
        p.on('change', update);
        const unlisten = $favorites.listen(update);
        p.on('destroy', unlisten);
        update();
      },
      onClick: (_e, _btn, p) => {
        const s = slides[p.currIndex];
        if (s) toggleFavorite(s.photo, s.taxon);
      },
    });
  });

  // Load more photos as the end gets near, then tell PhotoSwipe about them.
  let loading = false;
  const maybeLoadMore = async () => {
    if (!loadMore || loading || pswp.currIndex < slides.length - 4) return;
    loading = true;
    const before = slides.length;
    try {
      await loadMore();
    } finally {
      loading = false;
    }
    if (slides.length > before && !pswp.isDestroying) {
      for (let i = before; i < Math.min(slides.length, pswp.currIndex + 3); i++) pswp.refreshSlideContent(i);
      pswp.dispatch('change');
    }
  };

  // ---- history: Back closes the view
  let closedByBack = false;
  const onPop = () => {
    if (photoParam() === null) {
      closedByBack = true;
      pswp.close();
    }
  };
  if (photoParam() !== null) history.replaceState(history.state, '', urlWithPhoto(null));
  history.pushState({ bpPhoto: true }, '', urlWithPhoto(index));
  window.addEventListener('popstate', onPop);

  pswp.on('change', () => {
    history.replaceState({ bpPhoto: true }, '', urlWithPhoto(pswp.currIndex));
    onChange?.(pswp.currIndex);
    void maybeLoadMore();
  });
  pswp.on('close', () => {
    window.removeEventListener('popstate', onPop);
    if (!closedByBack) history.back();
  });

  pswp.init();
  void maybeLoadMore();
  return pswp;
}
