// Home-page motion. Progressive enhancement only: without this script (or with reduced motion)
// every element is already visible in its final position.
const motion = matchMedia('(prefers-reduced-motion: no-preference)');
const wide = matchMedia('(min-width: 60rem)');
const root = document.documentElement;
let teardown = () => {};

function enhance() {
  teardown();
  if (!motion.matches || !('IntersectionObserver' in window)) return;
  const controller = new AbortController();
  const { signal } = controller;
  const observers: IntersectionObserver[] = [];

  // 1. One-time entrance reveals, armed only now so failures never hide content.
  root.classList.add('motion-ready');
  const reveal = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-revealed');
        reveal.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -12% 0px' },
  );
  document.querySelectorAll('[data-reveal]').forEach((element) => reveal.observe(element));
  observers.push(reveal);

  // 2. Ambient loops (ember light) run only while on screen.
  const ambient = new IntersectionObserver((entries) => {
    for (const entry of entries) entry.target.classList.toggle('is-active', entry.isIntersecting);
  });
  document.querySelectorAll('[data-ambient]').forEach((element) => ambient.observe(element));
  observers.push(ambient);

  // 3. Depth layers. Browsers with scroll-driven animations use CSS (see site.css); others get
  // a bounded renderer: geometry is measured on resize, one write per layer per frame.
  if (wide.matches && !CSS.supports('animation-timeline', 'view()')) {
    const scenes = [...document.querySelectorAll<HTMLElement>('[data-depth-scene]')];
    const visible = new Set<HTMLElement>();
    const tops = new Map<HTMLElement, number>();
    let frame = 0;
    const measure = () =>
      scenes.forEach((scene) => tops.set(scene, scene.getBoundingClientRect().top + scrollY));
    const render = () => {
      frame = 0;
      visible.forEach((scene) => {
        const offset = Math.max(
          -innerHeight,
          Math.min(innerHeight, scrollY - (tops.get(scene) ?? 0)),
        );
        scene.querySelectorAll<HTMLElement>('[data-depth]').forEach((layer) => {
          layer.style.translate = `0 ${Math.round(offset * Number(layer.dataset.depth))}px`;
        });
      });
    };
    const schedule = () => {
      if (!frame && visible.size && !document.hidden) frame = requestAnimationFrame(render);
    };
    const depth = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) =>
          entry.isIntersecting
            ? visible.add(entry.target as HTMLElement)
            : visible.delete(entry.target as HTMLElement),
        );
        schedule();
      },
      { rootMargin: '120px' },
    );
    scenes.forEach((scene) => depth.observe(scene));
    observers.push(depth);
    measure();
    void document.fonts.ready.then(() => !signal.aborted && (measure(), schedule()));
    addEventListener('scroll', schedule, { passive: true, signal });
    addEventListener('resize', () => (measure(), schedule()), { passive: true, signal });
    signal.addEventListener('abort', () => cancelAnimationFrame(frame));
  }

  teardown = () => {
    controller.abort();
    observers.forEach((observer) => observer.disconnect());
    root.classList.remove('motion-ready');
    document.querySelectorAll<HTMLElement>('[data-depth]').forEach((layer) => {
      layer.style.removeProperty('translate');
    });
  };
}

enhance();
motion.addEventListener('change', enhance);
wide.addEventListener('change', enhance);
addEventListener('pagehide', (event) => {
  if (!event.persisted) teardown();
});
