/**
 * 等距円筒図法（viewBox 0 0 100 52）で描いた大陸の輪郭。
 * HUD のミニマップと 3D ホログラム地球儀の両方で共有する。
 */
export const WORLD_OUTLINE_PATHS: string[] = [
  'M6 15 C8 12 12 10 16 10 L20 11 L23 13 L24 16 L22 18 L19 19 L17 22 L13 23 L10 22 L8 20 L7 17 Z',
  'M17 11 C20 8 24 6 29 6 L34 7 L38 9 L40 12 L39 15 L36 16 L33 18 L30 18 L28 21 L24 20 L21 18 L19 15 Z',
  'M28 21 L30 23 L31 27 L31 31 L30 36 L28 42 L26 45 L24 42 L23 36 L23 30 L24 25 L26 22 Z',
  'M44 10 L47 9 L50 10 L51 12 L49 13 L46 13 L44 12 Z',
  'M48 12 C52 10 58 8 64 8 L71 9 L77 11 L82 14 L86 18 L85 20 L81 21 L78 19 L74 19 L71 20 L69 22 L66 22 L63 21 L60 19 L57 18 L54 18 L51 16 Z',
  'M58 21 L61 22 L64 25 L66 29 L66 33 L64 37 L62 39 L60 36 L58 31 L57 26 Z',
  'M79 33 L82 33 L85 35 L87 38 L86 40 L83 41 L80 40 L78 37 Z',
];

export const OUTLINE_VIEWBOX = {
  width: 100,
  height: 52,
} as const;

export type OutlinePoint = {
  lat: number;
  lng: number;
};

let cachedOutline: OutlinePoint[][] | null = null;

/**
 * SVG パス文字列を等間隔にサンプリングして緯度経度の折れ線に変換する。
 * ブラウザのパス演算を借りるだけなので、輪郭データを二重に持たずに済む。
 */
export function sampleWorldOutline(step = 0.9): OutlinePoint[][] {
  if (cachedOutline) {
    return cachedOutline;
  }

  const svgNs = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNs, 'svg');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.position = 'absolute';
  svg.style.opacity = '0';
  svg.style.pointerEvents = 'none';
  document.body.appendChild(svg);

  const result: OutlinePoint[][] = [];

  try {
    for (const definition of WORLD_OUTLINE_PATHS) {
      const path = document.createElementNS(svgNs, 'path');
      path.setAttribute('d', definition);
      svg.appendChild(path);

      const total = path.getTotalLength();
      if (!Number.isFinite(total) || total <= 0) {
        continue;
      }

      const points: OutlinePoint[] = [];
      const count = Math.max(8, Math.ceil(total / step));

      for (let index = 0; index <= count; index += 1) {
        const point = path.getPointAtLength((index / count) * total);
        points.push({
          lat: 90 - (point.y / OUTLINE_VIEWBOX.height) * 180,
          lng: (point.x / OUTLINE_VIEWBOX.width) * 360 - 180,
        });
      }

      result.push(points);
    }
  } finally {
    svg.remove();
  }

  cachedOutline = result;
  return result;
}
