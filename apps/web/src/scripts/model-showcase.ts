import type * as Three from 'three';

const root = document.querySelector<HTMLElement>('[data-model-showcase]');
const stage = root?.querySelector<HTMLElement>('[data-model-stage]');
const canvas = stage?.querySelector<HTMLCanvasElement>('canvas');
const loading = stage?.querySelector<HTMLElement>('.model-loading');
if (!stage || !canvas || !loading) throw new Error('Model showcase markup is incomplete');
const showcaseStage = stage;
const showcaseCanvas = canvas;
const loadingLabel = loading;
const controls = [...showcaseStage.querySelectorAll<HTMLButtonElement>('[data-model-turn]')];
const motion = matchMedia('(prefers-reduced-motion: no-preference)');
let renderer: Three.WebGLRenderer | undefined;
let frame = 0;
let disposed = false;
let pointerDown = false;
let lastX = 0;
let targetRotation = 0;
let rotation = 0;

function fail() {
  showcaseStage.classList.add('model-failed');
  loadingLabel.textContent = 'The study is unavailable in this browser.';
}

async function start() {
  try {
    const THREE = await import('three');
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    renderer = new THREE.WebGLRenderer({
      canvas: showcaseCanvas,
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
    camera.position.set(0.8, 0.7, 3.4);
    camera.lookAt(0, 0.3, 0);
    scene.add(new THREE.HemisphereLight(0xc8d6d0, 0x1b2523, 2.1));
    const key = new THREE.DirectionalLight(0xf3d2a0, 3.2);
    key.position.set(-2, 3, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x8fb7b2, 2.2);
    rim.position.set(3, 1, -2);
    scene.add(rim);
    const group = new THREE.Group();
    scene.add(group);
    const loader = new GLTFLoader();
    const resize = () => {
      const rect = showcaseStage.getBoundingClientRect();
      if (!renderer || rect.width < 1 || rect.height < 1) return;
      renderer.setSize(rect.width, rect.height, false);
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
      render();
    };
    const render = () => {
      if (!renderer || disposed) return;
      rotation += (targetRotation - rotation) * 0.08;
      group.rotation.y = rotation;
      renderer.render(scene, camera);
      if (motion.matches && !document.hidden) frame = requestAnimationFrame(render);
    };
    loader.load(
      '/models/caelora-travel-cloak.glb',
      (gltf) => {
        if (disposed) return;
        gltf.scene.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.castShadow = false;
            object.receiveShadow = false;
          }
        });
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const scale = 1.28 / Math.max(size.x, size.y, size.z);
        gltf.scene.scale.setScalar(scale);
        gltf.scene.position.set(-center.x * scale, -center.y * scale - 0.25, -center.z * scale);
        group.add(gltf.scene);
        loadingLabel.hidden = true;
        resize();
        render();
      },
      undefined,
      fail,
    );
    const observer = new ResizeObserver(resize);
    observer.observe(showcaseStage);
    showcaseCanvas.addEventListener('pointerdown', (event) => {
      pointerDown = true;
      lastX = event.clientX;
      showcaseCanvas.setPointerCapture(event.pointerId);
    });
    showcaseCanvas.addEventListener('pointermove', (event) => {
      if (!pointerDown) return;
      targetRotation += (event.clientX - lastX) * 0.012;
      lastX = event.clientX;
    });
    showcaseCanvas.addEventListener('pointerup', () => {
      pointerDown = false;
    });
    showcaseCanvas.addEventListener('pointercancel', () => {
      pointerDown = false;
    });
    showcaseCanvas.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      targetRotation += event.key === 'ArrowLeft' ? -0.45 : 0.45;
    });
    controls.forEach((control) => {
      control.addEventListener('click', () => {
        targetRotation += Number(control.dataset.modelTurn ?? 0) * 0.45;
        showcaseCanvas.focus({ preventScroll: true });
      });
    });
    addEventListener('resize', resize, { passive: true });
    addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) cancelAnimationFrame(frame);
        else render();
      },
      { passive: true },
    );
    addEventListener(
      'pagehide',
      () => {
        disposed = true;
        cancelAnimationFrame(frame);
        observer.disconnect();
        renderer?.dispose();
      },
      { once: true },
    );
    motion.addEventListener('change', render);
  } catch {
    fail();
  }
}

const visibility = new IntersectionObserver(
  ([entry]) => {
    if (!entry.isIntersecting) return;
    visibility.disconnect();
    void start();
  },
  { rootMargin: '240px' },
);
visibility.observe(showcaseStage);
