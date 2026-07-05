// 詳細画面の 3D 骨格ビューア。
// ローカル manifest に .glb 登録があればそれを読み込み、無ければ
// 手続き生成の「骨格プレースホルダー」をゆっくり回して見せる。
// どちらも OrbitControls でドラッグ回転・ホイール拡大できる。

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { ModelAsset } from './assets';

const BONE_COLOR = 0xe9dcc0;
const ACCENT_COLOR = 0x8a6030;

export type Viewer3D = {
  dispose: () => void;
};

type MountOptions = {
  model: ModelAsset | null;
  onStatus?: (status: 'loading' | 'ready' | 'placeholder' | 'error') => void;
};

export function mountViewer3D(container: HTMLElement, options: MountOptions): Viewer3D {
  const width = container.clientWidth || 320;
  const height = container.clientHeight || 240;

  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(2.6, 1.6, 3.4);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  container.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xfff6e5, 0x4a3a24, 1.1));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
  keyLight.position.set(3, 5, 4);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0xffe0b0, 0.6);
  rimLight.position.set(-4, 2, -3);
  scene.add(rimLight);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 1.5;
  controls.maxDistance = 8;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.2;

  const content = new THREE.Group();
  scene.add(content);

  let disposed = false;
  const loader = new GLTFLoader();

  if (options.model) {
    options.onStatus?.('loading');
    controls.autoRotate = options.model.autoRotate;
    loader.load(
      options.model.url,
      (gltf) => {
        if (disposed) {
          return;
        }
        fitToView(gltf.scene, content, camera, controls);
        content.add(gltf.scene);
        options.onStatus?.('ready');
      },
      undefined,
      () => {
        if (disposed) {
          return;
        }
        // 読み込み失敗時はプレースホルダーへフォールバック。
        buildPlaceholderSkeleton(content);
        options.onStatus?.('error');
      },
    );
  } else {
    buildPlaceholderSkeleton(content);
    options.onStatus?.('placeholder');
  }

  const clock = new THREE.Clock();
  let frameId = 0;

  function renderLoop(): void {
    if (disposed) {
      return;
    }
    frameId = requestAnimationFrame(renderLoop);
    const t = clock.getElapsedTime();
    // プレースホルダーは軽く上下に揺らして「浮遊感」を出す。
    if (!options.model) {
      content.position.y = Math.sin(t * 1.2) * 0.05;
    }
    controls.update();
    renderer.render(scene, camera);
  }
  renderLoop();

  const resizeObserver = new ResizeObserver(() => {
    const w = container.clientWidth || width;
    const h = container.clientHeight || height;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
  resizeObserver.observe(container);

  return {
    dispose(): void {
      disposed = true;
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      controls.dispose();
      disposeObject(scene);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

// 読み込んだモデルを画面内に収まるよう中心化・スケール調整する。
function fitToView(
  object: THREE.Object3D,
  content: THREE.Group,
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
): void {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const scale = 2.4 / maxDim;
  object.scale.setScalar(scale);
  object.position.sub(center.multiplyScalar(scale));
  content.position.set(0, 0, 0);
  controls.target.set(0, 0, 0);
  camera.position.set(2.6, 1.6, 3.4);
}

// 手続き生成の骨格プレースホルダー: 背骨(椎骨の連なり) + 頭骨 + 肋骨。
function buildPlaceholderSkeleton(content: THREE.Group): void {
  const boneMat = new THREE.MeshStandardMaterial({ color: BONE_COLOR, roughness: 0.7, metalness: 0.05 });
  const accentMat = new THREE.MeshStandardMaterial({ color: ACCENT_COLOR, roughness: 0.6, metalness: 0.1 });

  // 背骨カーブ（ゆるやかな S 字）。
  const spineCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.4, 0.2, 0),
    new THREE.Vector3(-0.7, 0.55, 0),
    new THREE.Vector3(0.1, 0.5, 0),
    new THREE.Vector3(0.8, 0.2, 0),
    new THREE.Vector3(1.4, -0.25, 0),
  ]);

  // 椎骨を等間隔に並べる。
  const vertebraeCount = 14;
  for (let i = 0; i < vertebraeCount; i += 1) {
    const t = i / (vertebraeCount - 1);
    const point = spineCurve.getPointAt(t);
    const vertebra = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.05, 8, 16), boneMat);
    vertebra.position.copy(point);
    vertebra.rotation.y = Math.PI / 2;
    vertebra.rotation.z = (t - 0.5) * 0.8;
    content.add(vertebra);
  }

  // 肋骨（背骨の中央付近から下向きに）。
  const ribCount = 6;
  for (let i = 0; i < ribCount; i += 1) {
    const t = 0.28 + (i / (ribCount - 1)) * 0.34;
    const point = spineCurve.getPointAt(t);
    for (const side of [-1, 1]) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.028, 6, 20, Math.PI * 0.9), boneMat);
      rib.position.set(point.x, point.y - 0.28, side * 0.05);
      rib.rotation.z = side > 0 ? Math.PI * 0.15 : Math.PI * 0.85;
      rib.rotation.x = side * 0.5;
      content.add(rib);
    }
  }

  // 頭骨（背骨の前端）。
  const skullBase = spineCurve.getPointAt(0);
  const skull = new THREE.Mesh(new THREE.IcosahedronGeometry(0.24, 1), boneMat);
  skull.position.set(skullBase.x - 0.28, skullBase.y + 0.05, 0);
  skull.scale.set(1.25, 0.9, 0.8);
  content.add(skull);
  const jaw = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.34, 8), accentMat);
  jaw.position.set(skullBase.x - 0.5, skullBase.y - 0.08, 0);
  jaw.rotation.z = Math.PI / 2;
  content.add(jaw);

  // 台座（骨格が浮いて見えないように薄い円盤）。
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 1.6, 0.06, 40),
    new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.9, transparent: true, opacity: 0.35 }),
  );
  base.position.y = -0.75;
  content.add(base);

  content.position.y = 0.1;
}

function disposeObject(root: THREE.Object3D): void {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(material)) {
      material.forEach((entry) => entry.dispose());
    } else if (material) {
      material.dispose();
    }
  });
}
