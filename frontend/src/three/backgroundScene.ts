import * as THREE from 'three';

const VOID_COLOR = 0x04070f;
const CYAN = 0x45e0ff;
const MAGENTA = 0xff4fd8;

const GRID_SIZE = 420;
const GRID_DIVISIONS = 84;
const GRID_CELL = GRID_SIZE / GRID_DIVISIONS;

type Disposable = {
  dispose(): void;
};

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** 既定の四角い点だと粒が目立つので、丸くぼかしたスプライトを生成して使う。 */
function createStarTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext('2d');
  if (context) {
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createStarField(): THREE.Points {
  const count = 1600;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const cyan = new THREE.Color(CYAN);
  const magenta = new THREE.Color(MAGENTA);
  const white = new THREE.Color(0xdff2ff);

  for (let index = 0; index < count; index += 1) {
    positions[index * 3] = (Math.random() - 0.5) * 320;
    positions[index * 3 + 1] = (Math.random() - 0.5) * 150;
    positions[index * 3 + 2] = -30 - Math.random() * (GRID_SIZE - 30);

    const roll = Math.random();
    const tint = roll > 0.88 ? magenta : roll > 0.5 ? cyan : white;
    colors[index * 3] = tint.r;
    colors[index * 3 + 1] = tint.g;
    colors[index * 3 + 2] = tint.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 1.5,
    map: createStarTexture(),
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  return new THREE.Points(geometry, material);
}

function createGrid(y: number, flip: boolean): THREE.GridHelper {
  const grid = new THREE.GridHelper(GRID_SIZE, GRID_DIVISIONS, CYAN, 0x1d6f92);
  grid.position.set(0, y, -GRID_SIZE / 2);
  if (flip) {
    grid.rotation.x = Math.PI;
  }

  const materials = Array.isArray(grid.material) ? grid.material : [grid.material];
  for (const material of materials) {
    material.transparent = true;
    material.opacity = flip ? 0.18 : 0.3;
    material.depthWrite = false;
  }

  return grid;
}

function createDistantStructure(): THREE.LineSegments {
  const geometry = new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(26, 1));
  const material = new THREE.LineBasicMaterial({
    color: MAGENTA,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
  });
  const mesh = new THREE.LineSegments(geometry, material);
  mesh.position.set(72, 26, -230);
  return mesh;
}

/**
 * 画面全体の背景となる「格子＋星屑」のシーンを起動する。
 * 戻り値を呼ぶと rAF とリスナー、GPU リソースを解放する。
 */
export function mountBackgroundScene(canvas: HTMLCanvasElement): () => void {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: window.devicePixelRatio < 2,
    alpha: true,
    powerPreference: 'low-power',
  });
  renderer.setClearColor(VOID_COLOR, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(VOID_COLOR, 0.0125);

  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 500);
  camera.position.set(0, 1.5, 12);

  const stars = createStarField();
  const floor = createGrid(-16, false);
  const ceiling = createGrid(20, true);
  const structure = createDistantStructure();
  scene.add(stars, floor, ceiling, structure);

  const disposables: Disposable[] = [];
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.LineSegments) {
      disposables.push(object.geometry);
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        disposables.push(material);
        if ('map' in material && material.map) {
          disposables.push(material.map);
        }
      }
    }
  });

  const pointer = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };

  const resize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  const handlePointerMove = (event: PointerEvent): void => {
    target.x = (event.clientX / window.innerWidth - 0.5) * 2;
    target.y = (event.clientY / window.innerHeight - 0.5) * 2;
  };

  const clock = new THREE.Clock();
  let frameId = 0;
  let running = true;
  let gridOffset = 0;

  const renderFrame = (): void => {
    const delta = Math.min(clock.getDelta(), 0.05);
    const elapsed = clock.elapsedTime;

    gridOffset = (gridOffset + delta * 9) % GRID_CELL;
    floor.position.z = -GRID_SIZE / 2 + gridOffset;
    ceiling.position.z = floor.position.z;

    stars.rotation.z = elapsed * 0.008;
    stars.position.y = Math.sin(elapsed * 0.12) * 1.6;

    structure.rotation.x = elapsed * 0.05;
    structure.rotation.y = elapsed * 0.08;

    pointer.x += (target.x - pointer.x) * 0.04;
    pointer.y += (target.y - pointer.y) * 0.04;
    camera.position.x = pointer.x * 3.2;
    camera.position.y = 1.5 - pointer.y * 1.8;
    camera.lookAt(0, 0, -60);

    renderer.render(scene, camera);
  };

  const loop = (): void => {
    if (!running) {
      return;
    }
    frameId = requestAnimationFrame(loop);
    renderFrame();
  };

  const handleVisibility = (): void => {
    if (document.hidden) {
      running = false;
      cancelAnimationFrame(frameId);
      return;
    }
    if (!running) {
      running = true;
      clock.getDelta();
      loop();
    }
  };

  resize();
  window.addEventListener('resize', resize);

  if (prefersReducedMotion()) {
    running = false;
    renderer.render(scene, camera);
  } else {
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('visibilitychange', handleVisibility);
    loop();
  }

  return () => {
    running = false;
    cancelAnimationFrame(frameId);
    window.removeEventListener('resize', resize);
    window.removeEventListener('pointermove', handlePointerMove);
    document.removeEventListener('visibilitychange', handleVisibility);
    for (const item of disposables) {
      item.dispose();
    }
    renderer.dispose();
  };
}
