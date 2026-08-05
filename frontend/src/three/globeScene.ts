import * as THREE from 'three';

import { sampleWorldOutline } from '../data/worldOutline';

const CYAN = 0x45e0ff;
const AMBER = 0xffc94a;
const MAGENTA = 0xff4fd8;
const CORE = 0x040f1c;

export type GlobeMarker = {
  lat: number;
  lng: number;
  label: string;
};

export type GlobeHandle = {
  dispose(): void;
};

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lng + 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function createContinentLines(): THREE.Group {
  const group = new THREE.Group();
  const material = new THREE.LineBasicMaterial({
    color: CYAN,
    transparent: true,
    opacity: 0.9,
  });

  for (const outline of sampleWorldOutline()) {
    const points = outline.map((point) => latLngToVector3(point.lat, point.lng, 1.006));
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    group.add(new THREE.LineLoop(geometry, material));
  }

  return group;
}

function createGraticule(): THREE.LineSegments {
  const geometry = new THREE.WireframeGeometry(new THREE.SphereGeometry(1, 24, 12));
  const material = new THREE.LineBasicMaterial({
    color: CYAN,
    transparent: true,
    opacity: 0.14,
  });
  return new THREE.LineSegments(geometry, material);
}

function createCore(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(0.985, 48, 32);
  const material = new THREE.MeshBasicMaterial({
    color: CORE,
    transparent: true,
    opacity: 0.92,
  });
  return new THREE.Mesh(geometry, material);
}

function createAtmosphere(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(1.12, 48, 32);
  const material = new THREE.MeshBasicMaterial({
    color: CYAN,
    transparent: true,
    opacity: 0.07,
    side: THREE.BackSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.Mesh(geometry, material);
}

function createOrbitRing(radius: number, tube: number, color: number, opacity: number): THREE.Mesh {
  const geometry = new THREE.TorusGeometry(radius, tube, 6, 160);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  return new THREE.Mesh(geometry, material);
}

function createMarker(marker: GlobeMarker, index: number): THREE.Group {
  const group = new THREE.Group();
  const surface = latLngToVector3(marker.lat, marker.lng, 1);
  const color = index === 0 ? AMBER : MAGENTA;

  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 14, 14),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 }),
  );
  dot.position.copy(surface).multiplyScalar(1.02);

  const beamPoints = [surface.clone().multiplyScalar(1.0), surface.clone().multiplyScalar(1.22)];
  const beam = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(beamPoints),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.6 }),
  );

  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.06, 0.092, 28),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  halo.position.copy(surface).multiplyScalar(1.012);
  halo.lookAt(surface.clone().multiplyScalar(2));

  group.add(dot, beam, halo);
  group.userData.halo = halo;
  group.userData.phase = index * 0.7;
  return group;
}

/**
 * 産地座標をマーカーとして表示するホログラム地球儀を描画する。
 * ドラッグで回転、放置すると自動回転に戻る。
 */
export function mountGlobe(canvas: HTMLCanvasElement, markers: GlobeMarker[]): GlobeHandle {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 40);
  camera.position.set(0, 0.5, 3.15);
  camera.lookAt(0, 0, 0);

  const globe = new THREE.Group();
  globe.rotation.x = THREE.MathUtils.degToRad(14);
  globe.add(createCore(), createGraticule(), createContinentLines());

  const markerGroups = markers.slice(0, 8).map((marker, index) => {
    const group = createMarker(marker, index);
    globe.add(group);
    return group;
  });

  const outerRing = createOrbitRing(1.42, 0.004, CYAN, 0.45);
  outerRing.rotation.x = Math.PI / 2;
  const tiltedRing = createOrbitRing(1.62, 0.0025, MAGENTA, 0.32);
  tiltedRing.rotation.set(Math.PI / 2.4, 0.4, 0);

  scene.add(createAtmosphere(), globe, outerRing, tiltedRing);

  const disposables: { dispose(): void }[] = [];
  scene.traverse((object) => {
    if (
      object instanceof THREE.Mesh ||
      object instanceof THREE.Line ||
      object instanceof THREE.LineSegments ||
      object instanceof THREE.LineLoop
    ) {
      disposables.push(object.geometry);
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      disposables.push(...materials);
    }
  });

  let dragging = false;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let spin = 0.16;
  let idleTimer = 0;

  const handlePointerDown = (event: PointerEvent): void => {
    dragging = true;
    idleTimer = 0;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent): void => {
    if (!dragging) {
      return;
    }
    const deltaX = event.clientX - lastPointerX;
    const deltaY = event.clientY - lastPointerY;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    globe.rotation.y += deltaX * 0.006;
    globe.rotation.x = THREE.MathUtils.clamp(globe.rotation.x + deltaY * 0.004, -1.1, 1.1);
    spin = 0;
  };

  const handlePointerUp = (event: PointerEvent): void => {
    dragging = false;
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  };

  canvas.addEventListener('pointerdown', handlePointerDown);
  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerup', handlePointerUp);
  canvas.addEventListener('pointercancel', handlePointerUp);

  /** 器の縦横比が変わってもリングごと収まる距離までカメラを引く。 */
  const resize = (): void => {
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;

    const verticalFov = THREE.MathUtils.degToRad(camera.fov);
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
    const framedRadius = 1.35;
    camera.position.z = Math.max(
      framedRadius / Math.tan(verticalFov / 2),
      framedRadius / Math.tan(horizontalFov / 2),
    );
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  };

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);

  const clock = new THREE.Clock();
  const reduced = prefersReducedMotion();
  let frameId = 0;
  let running = !reduced;

  const renderFrame = (): void => {
    const delta = Math.min(clock.getDelta(), 0.05);
    const elapsed = clock.elapsedTime;

    if (!dragging) {
      idleTimer += delta;
      if (idleTimer > 1.4) {
        spin = THREE.MathUtils.lerp(spin, 0.16, 0.02);
      }
      globe.rotation.y += spin * delta;
    }

    outerRing.rotation.z = elapsed * 0.18;
    tiltedRing.rotation.z = -elapsed * 0.12;

    for (const group of markerGroups) {
      const halo = group.userData.halo as THREE.Mesh;
      const phase = group.userData.phase as number;
      const pulse = 1 + Math.sin(elapsed * 2.2 + phase) * 0.28;
      halo.scale.setScalar(pulse);
      const material = halo.material as THREE.MeshBasicMaterial;
      material.opacity = 0.7 - (pulse - 1) * 0.6;
    }

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
    if (!reduced && !running) {
      running = true;
      clock.getDelta();
      loop();
    }
  };

  document.addEventListener('visibilitychange', handleVisibility);
  resize();

  if (reduced) {
    renderer.render(scene, camera);
  } else {
    loop();
  }

  return {
    dispose() {
      running = false;
      cancelAnimationFrame(frameId);
      observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerUp);
      for (const item of disposables) {
        item.dispose();
      }
      renderer.dispose();
    },
  };
}
