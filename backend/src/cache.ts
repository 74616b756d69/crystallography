import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import type { DinosaurDetail } from './types.js';

const CACHE_VERSION = 2;
const cachePath = resolve(process.env.DINO_CACHE_PATH ?? 'data/dinosaur-cache.json');

type CacheFile = {
  version: number;
  savedAt: string;
  records: DinosaurDetail[];
};

/**
 * 取得済みデータをディスクに残しておくためのストア。
 * 会場のネットワークが落ちていても、前回取得できた図鑑をそのまま出せるようにする。
 */
export async function loadCache(): Promise<Map<string, DinosaurDetail>> {
  try {
    const raw = await readFile(cachePath, 'utf8');
    const parsed = JSON.parse(raw) as CacheFile;

    if (parsed.version !== CACHE_VERSION || !Array.isArray(parsed.records)) {
      return new Map();
    }

    return new Map(parsed.records.map((record) => [record.id, record]));
  } catch {
    return new Map();
  }
}

/** 書き込み途中で読まれないよう、一時ファイルに書いてから置き換える。 */
export async function saveCache(records: DinosaurDetail[]): Promise<void> {
  const payload: CacheFile = {
    version: CACHE_VERSION,
    savedAt: new Date().toISOString(),
    records,
  };

  const temporaryPath = `${cachePath}.tmp`;
  await mkdir(dirname(cachePath), { recursive: true });
  await writeFile(temporaryPath, JSON.stringify(payload, null, 2), 'utf8');
  await rename(temporaryPath, cachePath);
}

export function describeCacheLocation(): string {
  return cachePath;
}
