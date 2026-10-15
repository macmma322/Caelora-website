const header = document.querySelector<HTMLElement>('.site-header');
const hero = document.querySelector<HTMLElement>('.hero');
if (hero) {
  const observer = new IntersectionObserver(
    ([entry]) => {
      header?.classList.toggle('is-scrolled', !entry.isIntersecting);
    },
    { rootMargin: '-90px 0px 0px', threshold: 0 },
  );
  observer.observe(hero);
  window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
} else {
  header?.classList.add('is-scrolled');
}
const sections = [...document.querySelectorAll<HTMLElement>('main section[id], main article[id]')];
const links = [...document.querySelectorAll<HTMLAnchorElement>('.desktop-nav a, .mobile-nav a')];
const sectionObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      links.forEach((link) => {
        if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }
  },
  { rootMargin: '-15% 0px -60%', threshold: 0 },
);
sections.forEach((section) => sectionObserver.observe(section));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Tab' || event.key.startsWith('Arrow'))
    document.documentElement.dataset.keyboard = '';
});
document.addEventListener('pointerdown', () => delete document.documentElement.dataset.keyboard, {
  passive: true,
});
window.addEventListener('pagehide', () => sectionObserver.disconnect(), { once: true });

export function setCurrentChapter(id: string) {
  links.forEach((link) => {
    if (link.hash === `#${id}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}
