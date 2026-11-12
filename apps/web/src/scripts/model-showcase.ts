import type * as Three from 'three';

// Poster-first 3D study. Nothing WebGL-related loads until the visitor presses "Inspect in 3D".
// Rendering is on demand: frames are scheduled only while the view is still easing toward its
// target, and never while the stage is off-screen or the tab is hidden.
const ZOOM_MIN = 0.7;
const ZOOM_MAX = 1.45;
const TURN_STEP = 0.45;
const ZOOM_STEP = 0.12;
const motion = matchMedia('(prefers-reduced-motion: no-preference)');

for (const root of document.querySelectorAll<HTMLElement>('[data-model-showcase]')) {
  const stage = root.querySelector<HTMLElement>('[data-model-stage]');
  const canvas = stage?.querySelector<HTMLCanvasElement>('canvas');
  const start = stage?.querySelector<HTMLButtonElement>('[data-model-start]');
  const controls = stage?.querySelector<HTMLElement>('.model-controls');
  const message = stage?.querySelector<HTMLElement>('.model-message');
  const model = root.dataset.model;
  if (!stage || !canvas || !start || !controls || !message || !model) continue;
  // The control only exists for visitors whose browser runs this script.
  start.closest<HTMLElement>('.model-start')?.removeAttribute('hidden');
  start.addEventListener(
    'click',
    () => void inspect({ stage, canvas, start, controls, message, model }),
    { once: true },
  );
}

interface Parts {
  stage: HTMLElement;
  canvas: HTMLCanvasElement;
  start: HTMLButtonElement;
  controls: HTMLElement;
  message: HTMLElement;
  model: string;
}

async function inspect({ stage, canvas, start, controls, message, model }: Parts) {
  start.setAttribute('aria-busy', 'true');
  start.disabled = true;
  message.textContent = 'Preparing the study…';
  let renderer: Three.WebGLRenderer | undefined;
  const fail = () => {
    renderer?.dispose();
    stage.classList.remove('is-live');
    canvas.hidden = true;
    controls.hidden = true;
    start.closest('.model-start')?.remove();
    message.textContent = 'The 3D view is unavailable in this browser. The still study remains.';
    // Keep keyboard focus on the explanation instead of dropping it to <body>.
    message.tabIndex = -1;
    message.focus({ preventScroll: true });
  };
  try {
    const THREE = await import('three');
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'low-power',
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 100);
    const home = new THREE.Vector3(0.75, 0.4, 3.35);
    const target = new THREE.Vector3(0, 0, 0);
    scene.add(new THREE.HemisphereLight(0xc8d6d0, 0x1b2523, 2.1));
    const key = new THREE.DirectionalLight(0xf3d2a0, 3.2);
    key.position.set(-2, 3, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x8fb7b2, 2.2);
    rim.position.set(3, 1, -2);
    scene.add(rim);
    const group = new THREE.Group();
    scene.add(group);

    const gltf = await new GLTFLoader().loadAsync(model);
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = 1.28 / Math.max(size.x, size.y, size.z);
    gltf.scene.scale.setScalar(scale);
    gltf.scene.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
    group.add(gltf.scene);

    const view = { yaw: 0, zoom: 1 };
    const goal = { yaw: 0, zoom: 1 };
    let frame = 0;
    let visible = true;
    const draw = () => {
      frame = 0;
      if (!renderer) return;
      const ease = motion.matches ? 0.14 : 1;
      view.yaw += (goal.yaw - view.yaw) * ease;
      view.zoom += (goal.zoom - view.zoom) * ease;
      group.rotation.y = view.yaw;
      camera.position.copy(home).sub(target).divideScalar(view.zoom).add(target);
      camera.lookAt(target);
      renderer.render(scene, camera);
      const settling =
        Math.abs(goal.yaw - view.yaw) > 0.0005 || Math.abs(goal.zoom - view.zoom) > 0.0005;
      if (settling) request();
    };
    const request = () => {
      if (!frame && visible && !document.hidden) frame = requestAnimationFrame(draw);
    };
    const turn = (amount: number) => {
      goal.yaw += amount;
      request();
    };
    const zoom = (amount: number) => {
      goal.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, goal.zoom + amount));
      request();
    };
    const reset = () => {
      goal.yaw = 0;
      goal.zoom = 1;
      request();
    };
    const resize = () => {
      const rect = stage.getBoundingClientRect();
      if (!renderer || rect.width < 1 || rect.height < 1) return;
      renderer.setSize(rect.width, rect.height, false);
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
      request();
    };

    // Pointer: one finger/mouse turns; two fingers pinch-zoom. Vertical page scroll stays native.
    const pointers = new Map<number, { x: number; y: number }>();
    let pinch = 0;
    canvas.addEventListener('pointerdown', (event) => {
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', (event) => {
      const last = pointers.get(event.pointerId);
      if (last === undefined) return;
      if (pointers.size === 1) turn((event.clientX - last.x) * 0.012);
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch) zoom((distance - pinch) * 0.004);
        pinch = distance;
      }
    });
    const release = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      if (pointers.size < 2) pinch = 0;
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    // Wheel zoom only for pinch gestures/ctrl-wheel, so ordinary scrolling is never captured.
    canvas.addEventListener(
      'wheel',
      (event) => {
        if (!event.ctrlKey) return;
        event.preventDefault();
        zoom(-Math.sign(event.deltaY) * ZOOM_STEP * 0.5);
      },
      { passive: false },
    );
    canvas.addEventListener('keydown', (event) => {
      // Never capture browser shortcuts (page zoom, history, OS keys).
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const actions: Record<string, () => void> = {
        ArrowLeft: () => turn(-TURN_STEP),
        ArrowRight: () => turn(TURN_STEP),
        '+': () => zoom(ZOOM_STEP),
        '=': () => zoom(ZOOM_STEP),
        '-': () => zoom(-ZOOM_STEP),
        '0': reset,
        Home: reset,
      };
      const action = actions[event.key];
      if (!action) return;
      event.preventDefault();
      action();
    });
    controls
      .querySelectorAll<HTMLButtonElement>('[data-model-turn]')
      .forEach((button) =>
        button.addEventListener('click', () => turn(Number(button.dataset.modelTurn) * TURN_STEP)),
      );
    controls
      .querySelectorAll<HTMLButtonElement>('[data-model-zoom]')
      .forEach((button) =>
        button.addEventListener('click', () => zoom(Number(button.dataset.modelZoom) * ZOOM_STEP)),
      );
    controls.querySelector('[data-model-reset]')?.addEventListener('click', reset);

    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) request();
      else if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    });
    visibility.observe(stage);
    const sizes = new ResizeObserver(resize);
    sizes.observe(stage);
    const lifetime = new AbortController();
    document.addEventListener('visibilitychange', request, { signal: lifetime.signal });
    // A bfcache pagehide (persisted) keeps everything alive for the restore; only a real unload
    // releases the GPU context.
    addEventListener(
      'pagehide',
      (event) => {
        if (event.persisted) return;
        cancelAnimationFrame(frame);
        visibility.disconnect();
        sizes.disconnect();
        lifetime.abort();
        renderer?.dispose();
      },
      { signal: lifetime.signal },
    );
    canvas.addEventListener(
      'webglcontextlost',
      (event) => {
        event.preventDefault();
        lifetime.abort();
        fail();
      },
      { signal: lifetime.signal },
    );

    canvas.hidden = false;
    controls.hidden = false;
    stage.classList.add('is-live');
    start.closest('.model-start')?.remove();
    message.textContent = 'The 3D study is ready. Drag to turn it.';
    resize();
    canvas.focus({ preventScroll: true });
  } catch {
    fail();
  }
}
