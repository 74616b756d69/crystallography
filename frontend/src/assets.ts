// 恐竜カードの画像 / 3D モデルの解決を担当するモジュール。
//
// 画像の優先順位:
//   1. ローカル差し替え (public/assets/images/manifest.json)
//   2. バックエンド経由の Wikidata / Commons 画像 (record.image)
//   3. プレースホルダー (呼び出し側で描画)
//
// 3D モデルはローカル manifest 登録があるものだけ実モデルを表示し、
// 無い場合はプレースホルダーの骨格シルエットを回す。

export type AssetCredit = {
  url: string;
  credit?: string;
  license?: string;
  source: string;
  sourceUrl?: string;
};

export type ModelAsset = AssetCredit & {
  autoRotate: boolean;
};

type ImageManifestEntry = {
  file: string;
  credit?: string;
  license?: string;
  source?: string;
  sourceUrl?: string;
};

type ModelManifestEntry = {
  file: string;
  credit?: string;
  license?: string;
  source?: string;
  sourceUrl?: string;
  autoRotate?: boolean;
};

type BackendImage = {
  url: string;
  credit?: string;
  license?: string;
  source?: string;
  sourceUrl?: string;
};

const IMAGE_BASE = '/assets/images/';
const MODEL_BASE = '/assets/models/';

let imageManifest: Record<string, ImageManifestEntry> = {};
let modelManifest: Record<string, ModelManifestEntry> = {};

async function fetchManifest<T>(url: string, key: string): Promise<Record<string, T>> {
  try {
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) {
      return {};
    }
    const payload = (await response.json()) as Record<string, unknown>;
    const table = payload[key];
    return table && typeof table === 'object' ? (table as Record<string, T>) : {};
  } catch {
    return {};
  }
}

// アプリ起動時に一度だけ呼ぶ。マニフェストが無くても落ちない。
export async function loadAssetManifests(): Promise<void> {
  const [images, models] = await Promise.all([
    fetchManifest<ImageManifestEntry>(`${IMAGE_BASE}manifest.json`, 'images'),
    fetchManifest<ModelManifestEntry>(`${MODEL_BASE}manifest.json`, 'models'),
  ]);
  imageManifest = images;
  modelManifest = models;
}

// 恐竜 id と（あれば）バックエンド画像から、表示すべき画像を決める。
export function resolveImage(id: string, backendImage?: BackendImage): AssetCredit | null {
  const local = imageManifest[id];
  if (local?.file) {
    return {
      url: `${IMAGE_BASE}${local.file}`,
      credit: local.credit,
      license: local.license,
      source: local.source ?? 'ローカル素材',
      sourceUrl: local.sourceUrl,
    };
  }

  if (backendImage?.url) {
    return {
      url: backendImage.url,
      credit: backendImage.credit,
      license: backendImage.license,
      source: backendImage.source ?? 'Wikimedia Commons',
      sourceUrl: backendImage.sourceUrl,
    };
  }

  return null;
}

// 3D モデルはローカル登録があるものだけ返す。
export function resolveModel(id: string): ModelAsset | null {
  const local = modelManifest[id];
  if (!local?.file) {
    return null;
  }
  return {
    url: `${MODEL_BASE}${local.file}`,
    credit: local.credit,
    license: local.license,
    source: local.source ?? 'ローカル素材',
    sourceUrl: local.sourceUrl,
    autoRotate: local.autoRotate ?? true,
  };
}

// クレジット表記文字列を組み立てる（CC BY などの帰属義務対応）。
export function formatCredit(asset: AssetCredit): string {
  const parts = [asset.credit, asset.license, asset.source].filter(Boolean);
  return parts.join(' / ');
}
