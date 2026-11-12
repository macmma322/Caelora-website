// Site-wide navigation behaviour. Every link works without this script.
const header = document.querySelector<HTMLElement>('.site-header');
const menu = document.querySelector<HTMLDetailsElement>('.mobile-nav');
const chapterLinks = [...document.querySelectorAll<HTMLAnchorElement>('a[data-chapter]')];

menu?.querySelectorAll('a').forEach((link) =>
  link.addEventListener('click', () => {
    menu.open = false;
  }),
);
menu?.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  menu.open = false;
  menu.querySelector('summary')?.focus();
});
document.addEventListener('click', (event) => {
  if (menu?.open && event.target instanceof Node && !menu.contains(event.target)) menu.open = false;
});

// Header becomes solid once the opening scene has scrolled away (pages without one start solid).
const opening = document.querySelector<HTMLElement>('[data-opening]');
if (opening && 'IntersectionObserver' in window) {
  new IntersectionObserver(
    ([entry]) => header?.classList.toggle('is-scrolled', !entry.isIntersecting),
    { rootMargin: '-90px 0px 0px' },
  ).observe(opening);
} else {
  header?.classList.add('is-scrolled');
}

// Mark the chapter currently in view so in-page navigation reflects position.
export function setCurrentChapter(id: string) {
  chapterLinks.forEach((link) => {
    if (link.dataset.chapter === id) link.setAttribute('aria-current', 'location');
    else if (link.getAttribute('aria-current') === 'location') link.removeAttribute('aria-current');
  });
}
const chapters = chapterLinks
  .map((link) => document.getElementById(link.dataset.chapter ?? ''))
  .filter((section): section is HTMLElement => section !== null);
if (chapters.length && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) if (entry.isIntersecting) setCurrentChapter(entry.target.id);
    },
    { rootMargin: '-20% 0px -65%' },
  );
  chapters.forEach((section) => observer.observe(section));
}

// Keyboard users get instant transitions and scrolling (see base.css [data-keyboard]).
document.addEventListener('keydown', (event) => {
  if (event.key === 'Tab' || event.key.startsWith('Arrow'))
    document.documentElement.dataset.keyboard = '';
});
document.addEventListener('pointerdown', () => delete document.documentElement.dataset.keyboard, {
  passive: true,
});
