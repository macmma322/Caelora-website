import { setCurrentChapter } from './navigation';
// A bounded scroll renderer: cached geometry, read once on resize, writes once per scroll frame.
// Static HTML remains complete when JS, observer support or motion enhancement is unavailable.
const motionQuery = matchMedia('(min-width: 60rem) and (prefers-reduced-motion: no-preference)');
const journey = document.querySelector<HTMLElement>('[data-journey]');
const scenes = [...document.querySelectorAll<HTMLElement>('[data-depth-scene]')];
const clamp = (value: number) => Math.max(0, Math.min(1, value));
let teardown = () => {};
function configureMotion() {
  teardown();
  if (!motionQuery.matches || !('IntersectionObserver' in window)) return;
  const controller = new AbortController();
  const { signal } = controller;
  let frame = 0;
  let viewport = innerHeight;
  let journeyTop = 0;
  let journeyTravel = 1;
  const visible = new Set<HTMLElement>();
  const geometries = new Map<HTMLElement, { top: number; height: number }>();
  const layers = journey
    ? new Map(
        [...journey.querySelectorAll<HTMLElement>('[data-journey-layer]')].map((layer) => [
          layer.dataset.journeyLayer,
          layer,
        ]),
      )
    : new Map<string, HTMLElement>();
  const wilderness = journey?.querySelector<HTMLElement>('.wilderness-copy');
  const home = journey?.querySelector<HTMLElement>('.home-copy');
  const nativeHeroDepth = CSS.supports('animation-timeline', 'view()');
  journey?.classList.add('is-enhanced');
  function measure() {
    viewport = innerHeight;
    const y = scrollY;
    scenes.forEach((scene) => {
      const rect = scene.getBoundingClientRect();
      geometries.set(scene, { top: rect.top + y, height: rect.height });
    });
    if (journey) {
      const rect = journey.getBoundingClientRect();
      journeyTop = rect.top + y;
      journeyTravel = Math.max(1, rect.height - viewport);
    }
  }
  function render() {
    frame = 0;
    const y = scrollY;
    visible.forEach((scene) => {
      if (nativeHeroDepth && scene.classList.contains('hero')) return;
      const geometry = geometries.get(scene);
      if (!geometry) return;
      const offset = Math.max(-viewport, Math.min(viewport, y - geometry.top));
      scene.querySelectorAll<HTMLElement>('[data-depth]').forEach((layer) => {
        layer.style.translate = `0 ${Math.round(offset * Number(layer.dataset.depth))}px`;
      });
    });
    if (journey && visible.has(journey)) {
      const progress = clamp((y - journeyTop) / journeyTravel);
      const arrival = clamp((progress - 0.3) / 0.5);
      const nextChapter = progress < 0.5 ? 'world' : 'your-path';
      if (y >= journeyTop - 100 && y <= journeyTop + journeyTravel + 100) {
        setCurrentChapter(nextChapter);
      }
      const distant = layers.get('distant');

      const middle = layers.get('middle');
      const near = layers.get('near');
      const atmosphere = layers.get('atmosphere');
      const hearthShade = layers.get('hearthShade');
      if (hearthShade) hearthShade.style.opacity = String(arrival);
      if (distant)
        distant.style.transform = `translateY(${-40 * progress}px) scale(${1.04 + arrival * 0.32})`;

      if (middle) middle.style.transform = `translateY(${65 * progress}px)`;
      if (near) near.style.transform = `translateY(${160 * progress}px)`;
      if (atmosphere) atmosphere.style.opacity = String(1 - 0.15 * arrival);
      if (wilderness) {
        wilderness.style.opacity = String(progress < 0.5 ? 1 : 0);
        wilderness.style.translate = `0 ${-65 * progress}px`;
      }
      if (home) {
        home.style.opacity = String(progress >= 0.5 ? 1 : 0);
        home.style.translate = `0 ${40 * (1 - arrival)}px`;
      }
    }
  }
  function schedule() {
    if (!frame && !document.hidden) frame = requestAnimationFrame(render);
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visible.add(entry.target as HTMLElement);
        else visible.delete(entry.target as HTMLElement);
      });
      schedule();
    },
    { rootMargin: '150px' },
  );
  [...scenes, ...(journey ? [journey] : [])].forEach((scene) => observer.observe(scene));
  measure();
  void document.fonts.ready.then(() => {
    if (!signal.aborted) {
      measure();
      schedule();
    }
  });
  addEventListener(
    'pageshow',
    () => {
      measure();
      schedule();
    },
    { signal },
  );
  addEventListener('scroll', schedule, { passive: true, signal });
  addEventListener(
    'resize',
    () => {
      measure();
      schedule();
    },
    { passive: true, signal },
  );
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else {
        measure();
        schedule();
      }
    },
    { signal },
  );
  function visitHome(behavior: ScrollBehavior) {
    measure();
    if (journey) scrollTo({ top: journeyTop + journeyTravel * 0.86, behavior });
    if (behavior === 'instant' && home) {
      home.tabIndex = -1;
      home.focus({ preventScroll: true });
    }
  }
  document.addEventListener(
    'click',
    (event) => {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>('a[href]');
      if (
        !link ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const target = new URL(link.href);
      if (
        target.pathname !== location.pathname ||
        target.origin !== location.origin ||
        target.hash !== '#your-path'
      )
        return;
      event.preventDefault();
      history.pushState(null, '', target.hash);
      visitHome(document.documentElement.hasAttribute('data-keyboard') ? 'instant' : 'smooth');
    },
    { signal },
  );
  addEventListener(
    'hashchange',
    () => {
      if (location.hash === '#your-path') visitHome('instant');
    },
    { signal },
  );
  if (location.hash === '#your-path') visitHome('instant');
  teardown = () => {
    controller.abort();
    observer.disconnect();
    cancelAnimationFrame(frame);
    journey?.classList.remove('is-enhanced');
    document
      .querySelectorAll<HTMLElement>('[data-depth], [data-journey-layer], .journey-copy')
      .forEach((layer) => {
        layer.style.removeProperty('transform');
        layer.style.removeProperty('translate');
        layer.style.removeProperty('opacity');
      });
  };
}
configureMotion();
motionQuery.addEventListener('change', configureMotion);
addEventListener('pagehide', (event) => {
  if (event.persisted) return;
  teardown();
  motionQuery.removeEventListener('change', configureMotion);
});

const viewer = document.querySelector<HTMLDialogElement>('.art-viewer');
const artworkLinks = [...document.querySelectorAll<HTMLAnchorElement>('[data-artwork]')];
const image = viewer?.querySelector<HTMLImageElement>('#viewer-image');
const heading = viewer?.querySelector<HTMLElement>('#viewer-title');
const position = viewer?.querySelector<HTMLElement>('.viewer-position');
const error = viewer?.querySelector<HTMLElement>('.viewer-error');
let current = 0;
let generation = 0;
let trigger: HTMLElement | null = null;
async function showArtwork(index: number) {
  current = (index + artworkLinks.length) % artworkLinks.length;
  const link = artworkLinks[current];
  const source = link?.querySelector('img');
  if (!source || !image || !heading || !position || !error) return;
  const request = ++generation;
  error.hidden = true;
  image.hidden = true;
  heading.textContent =
    link.closest('figure')?.querySelector('figcaption > span')?.textContent ??
    link.closest('figure')?.querySelector('figcaption')?.textContent ??
    'Concept study';
  position.textContent = `${current + 1} / ${artworkLinks.length}`;
  const preload = new Image();
  preload.src = link.href;
  try {
    await preload.decode();
    if (request !== generation) return;
    image.width = preload.naturalWidth;
    image.height = preload.naturalHeight;
    image.src = preload.src;
    image.alt = source.alt;
    image.hidden = false;
  } catch {
    if (request === generation) error.hidden = false;
  }
}
artworkLinks.forEach((link, index) =>
  link.addEventListener('click', (event) => {
    if (!viewer || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    trigger = link;
    void showArtwork(index);
    viewer.showModal();
  }),
);
viewer?.querySelector('.viewer-close')?.addEventListener('click', () => viewer.close());
viewer
  ?.querySelectorAll<HTMLButtonElement>('[data-direction]')
  .forEach((button) =>
    button.addEventListener(
      'click',
      () => void showArtwork(current + Number(button.dataset.direction)),
    ),
  );
viewer?.addEventListener('keydown', (event) => {
  if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
  event.preventDefault();
  void showArtwork(current + (event.key === 'ArrowRight' ? 1 : -1));
});
viewer?.addEventListener('close', () => {
  generation++;
  trigger?.focus({ preventScroll: true });
});
