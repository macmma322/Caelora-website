// The explorable valley. Everything here is enhancement: pins are plain links without it.
const valley = document.querySelector<HTMLElement>('[data-valley]');
const canvas = valley?.querySelector<HTMLElement>('[data-valley-canvas]');
const scroller = valley?.querySelector<HTMLElement>('[data-valley-scroller]');

if (valley && canvas && scroller) {
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const motion = matchMedia('(prefers-reduced-motion: no-preference)');
  let frame = 0;
  let target = { x: 44, y: 46 };

  // The lantern: a pool of light that follows the pointer (or the focused place) over a dusk veil.
  const place = (x: number, y: number) => {
    target = { x, y };
    if (!frame)
      frame = requestAnimationFrame(() => {
        frame = 0;
        canvas.style.setProperty('--lx', `${target.x}%`);
        canvas.style.setProperty('--ly', `${target.y}%`);
      });
  };
  const enableLantern = () => valley.classList.toggle('lantern-on', finePointer.matches);
  enableLantern();
  finePointer.addEventListener('change', enableLantern);
  valley.addEventListener(
    'pointermove',
    (event) => {
      if (!finePointer.matches) return;
      const box = canvas.getBoundingClientRect();
      place(
        ((event.clientX - box.left) / box.width) * 100,
        ((event.clientY - box.top) / box.height) * 100,
      );
    },
    { passive: true },
  );

  // Keyboard and hover on a pin bring the light to that place.
  const pins = [...canvas.querySelectorAll<HTMLAnchorElement>('.pin-link')];
  for (const pin of pins) {
    const toPin = () => {
      const box = canvas.getBoundingClientRect();
      const mark = pin.querySelector('.pin-mark')?.getBoundingClientRect();
      if (!mark) return;
      place(
        ((mark.left + mark.width / 2 - box.left) / box.width) * 100,
        ((mark.top + mark.height / 2 - box.top) / box.height) * 100,
      );
    };
    pin.addEventListener('focus', toPin);
    pin.addEventListener('pointerenter', toPin);
    // Make this place's region visible just before leaving, so the browser's view transition
    // zooms from the painting into the place page instead of fading.
    pin.addEventListener('click', (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      canvas.querySelector(`[data-zone="${pin.dataset.place}"]`)?.classList.add('is-leaving');
    });
  }
  // Coming back (bfcache), reset any zone left visible.
  addEventListener('pageshow', () =>
    canvas.querySelectorAll('.is-leaving').forEach((zone) => zone.classList.remove('is-leaving')),
  );

  // Narrow screens: the painting is a panorama. Start on the traveller rather than the left edge.
  const centre = () => {
    if (scroller.scrollWidth <= scroller.clientWidth) return;
    scroller.scrollTo({
      left: scroller.scrollWidth * 0.44 - scroller.clientWidth / 2,
      behavior: 'instant',
    });
  };
  centre();
  // Mobile browsers fire resize when the address bar moves; only re-centre on a real width change.
  let width = innerWidth;
  addEventListener(
    'resize',
    () => {
      if (innerWidth === width) return;
      width = innerWidth;
      centre();
    },
    { passive: true },
  );
  if (!motion.matches) valley.classList.add('lantern-still');
}
