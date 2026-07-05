// 全恐竜の写真を Wikidata(P18) → Wikimedia Commons から一括取得し、
// frontend/public/assets/images/ に保存 + manifest.json を更新するスクリプト。
//
// 使い方（Wikimedia に到達できるネットワークで実行）:
//   node scripts/fetch-images.mjs
//   node scripts/fetch-images.mjs --force   # 既存ファイルも取り直す
//   node scripts/fetch-images.mjs --limit 10 # 先頭10種だけ試す
//
// - 既に手動登録済み / 取得済みの画像は既定でスキップ（--force で上書き）
// - ライセンス表記(著作者 / ライセンス)も一緒に manifest へ記録
// - 取得できなかった種はプレースホルダー(シルエット)のまま

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SERVER_TS = join(ROOT, 'backend', 'src', 'server.ts');
const IMAGES_DIR = join(ROOT, 'frontend', 'public', 'assets', 'images');
const MANIFEST_PATH = join(IMAGES_DIR, 'manifest.json');

const UA = 'DinosaurFieldNotes/1.0 (school festival exhibit; contact: akahori.t.24kdgn@gmail.com)';
const THUMB_WIDTH = 900;

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx >= 0 ? Number(args[limitIdx + 1]) : Infinity;

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA } });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json();
}

function stripHtml(value) {
  if (!value) return undefined;
  const text = value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 0 ? text : undefined;
}

// backend のシード配列から (id, scientificName) を抽出する（単一ソース）。
async function loadSpecies() {
  const source = await readFile(SERVER_TS, 'utf8');
  const regex = /\bid:\s*'([^']+)',\s*\n\s*scientificName:\s*'([^']+)'/g;
  const species = [];
  let match;
  while ((match = regex.exec(source)) !== null) {
    species.push({ id: match[1], scientificName: match[2] });
  }
  return species;
}

async function resolveImageForName(name) {
  const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&type=item&limit=5&search=${encodeURIComponent(name)}&origin=*`;
  const search = await fetchJson(searchUrl);
  const match = search.search?.find((e) => e.label?.toLowerCase() === name.toLowerCase()) ?? search.search?.[0];
  if (!match?.id) return undefined;

  const entityUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=${match.id}&props=claims&origin=*`;
  const entity = await fetchJson(entityUrl);
  const filename = entity.entities?.[match.id]?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
  if (typeof filename !== 'string' || filename.length === 0) return undefined;

  const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=${THUMB_WIDTH}&titles=${encodeURIComponent('File:' + filename)}&origin=*`;
  const info = await fetchJson(infoUrl);
  const page = info.query?.pages ? Object.values(info.query.pages)[0] : undefined;
  const ii = page?.imageinfo?.[0];
  const url = ii?.thumburl ?? ii?.url;
  if (!url) return undefined;

  const meta = ii?.extmetadata ?? {};
  return {
    url,
    credit: stripHtml(meta.Artist?.value) ?? 'Wikimedia Commons contributors',
    license: stripHtml(meta.LicenseShortName?.value),
    sourceUrl: ii?.descriptionurl ?? `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(filename)}`,
  };
}

function extFromUrl(url) {
  const m = url.split('?')[0].match(/\.(jpe?g|png|webp|gif)$/i);
  return m ? `.${m[1].toLowerCase().replace('jpeg', 'jpg')}` : '.jpg';
}

async function downloadTo(url, filePath) {
  const response = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!response.ok) throw new Error(`download ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(filePath, buffer);
}

async function loadManifest() {
  if (!existsSync(MANIFEST_PATH)) return { images: {} };
  try {
    const data = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
    if (!data.images) data.images = {};
    return data;
  } catch {
    return { images: {} };
  }
}

async function main() {
  await mkdir(IMAGES_DIR, { recursive: true });
  const species = (await loadSpecies()).slice(0, LIMIT);
  const manifest = await loadManifest();
  console.log(`対象 ${species.length} 種。取得を開始します…\n`);

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const { id, scientificName } of species) {
    const existing = manifest.images[id];
    // 手動登録(_example を除く)や取得済みは既定でスキップ。
    if (!FORCE && existing && !id.startsWith('_') && existing.file && existsSync(join(IMAGES_DIR, existing.file))) {
      skipped += 1;
      console.log(`- skip  ${id}（既に画像あり）`);
      continue;
    }

    try {
      const image = await resolveImageForName(scientificName);
      if (!image) {
        failed += 1;
        console.log(`× none  ${id}（${scientificName}）Wikidata に画像なし`);
        continue;
      }
      const file = `${id}${extFromUrl(image.url)}`;
      await downloadTo(image.url, join(IMAGES_DIR, file));
      manifest.images[id] = {
        file,
        credit: image.credit,
        license: image.license,
        source: 'Wikimedia Commons',
        sourceUrl: image.sourceUrl,
      };
      ok += 1;
      console.log(`✓ save  ${id}  [${image.license ?? 'license?'}] ${image.credit ?? ''}`.trim());
    } catch (error) {
      failed += 1;
      console.log(`× fail  ${id}: ${error.message}`);
    }

    // Wikimedia への配慮で軽くウェイト。
    await new Promise((r) => setTimeout(r, 250));
  }

  // _example 系のサンプルキーは manifest から掃除。
  for (const key of Object.keys(manifest.images)) {
    if (key.startsWith('_')) delete manifest.images[key];
  }

  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`\n完了: 取得 ${ok} / スキップ ${skipped} / 失敗 ${failed}（全 ${species.length} 種）`);
  console.log(`manifest: ${MANIFEST_PATH}`);
}

main().catch((error) => {
  console.error('スクリプトが失敗しました:', error);
  process.exit(1);
});
