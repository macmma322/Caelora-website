// Accessible artwork viewer. Links work as plain image links without JavaScript.
const viewer = document.querySelector<HTMLDialogElement>('.art-viewer');
const links = [...document.querySelectorAll<HTMLAnchorElement>('a[data-artwork]')];
const image = viewer?.querySelector<HTMLImageElement>('#viewer-image');
const heading = viewer?.querySelector<HTMLElement>('#viewer-title');
const statusLine = viewer?.querySelector<HTMLElement>('.viewer-status');
const position = viewer?.querySelector<HTMLElement>('.viewer-position');
const error = viewer?.querySelector<HTMLElement>('.viewer-error');
let current = 0;
let generation = 0;
let trigger: HTMLElement | null = null;

async function show(index: number) {
  if (!links.length || !image || !heading || !statusLine || !position || !error) return;
  current = (index + links.length) % links.length;
  const link = links[current];
  const request = ++generation;
  error.hidden = true;
  image.hidden = true;
  heading.textContent = link.dataset.title ?? 'Study';
  statusLine.textContent = [link.dataset.status, link.dataset.source].filter(Boolean).join(' · ');
  position.textContent = `${current + 1} / ${links.length}`;
  const preload = new Image();
  preload.src = link.href;
  try {
    await preload.decode();
    if (request !== generation) return;
    image.width = preload.naturalWidth;
    image.height = preload.naturalHeight;
    image.src = preload.src;
    image.alt = link.dataset.alt ?? '';
    image.hidden = false;
  } catch {
    if (request === generation) error.hidden = false;
  }
}

if (viewer) {
  links.forEach((link, index) =>
    link.addEventListener('click', (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      trigger = link;
      void show(index);
      viewer.showModal();
    }),
  );
  viewer.querySelector('.viewer-close')?.addEventListener('click', () => viewer.close());
  viewer
    .querySelectorAll<HTMLButtonElement>('[data-direction]')
    .forEach((button) =>
      button.addEventListener('click', () => void show(current + Number(button.dataset.direction))),
    );
  viewer.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    event.preventDefault();
    void show(current + (event.key === 'ArrowRight' ? 1 : -1));
  });
  // A pointer click on the backdrop (outside the dialog box) closes; padding and content do not.
  viewer.addEventListener('click', (event) => {
    if (event.target !== viewer) return;
    const box = viewer.getBoundingClientRect();
    const outside =
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom;
    if (outside) viewer.close();
  });
  viewer.addEventListener('close', () => {
    generation++;
    trigger?.focus({ preventScroll: true });
  });
}

export {};
