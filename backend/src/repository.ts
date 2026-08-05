import { loadCache, saveCache } from './cache.js';
import { seedDinosaurs, type SeedDinosaur } from './data/seedDinosaurs.js';
import { mapWithConcurrency } from './external/http.js';
import {
  fetchPbdbOccurrences,
  fetchPbdbReference,
  fetchPbdbTaxon,
  pbdbTaxonUrl,
  type PbdbOccurrenceRecord,
  type PbdbReferenceRecord,
  type PbdbTaxonRecord,
} from './external/pbdb.js';
import { fetchWikidataEntity } from './external/wikidata.js';
import { fetchArticleImages, fetchWikipediaSummaries, type WikipediaSummary } from './external/wikipedia.js';
import type { DinosaurDetail, GalleryImage, LocalityDetail, ReferenceEntry } from './types.js';

/** 外部 API を一斉に叩くとレート制限に当たるため、同時実行はこの数までに抑える。 */
const FETCH_CONCURRENCY = Number(process.env.EXTERNAL_CONCURRENCY ?? 4);
const REFRESH_INTERVAL_MS = Number(process.env.REFRESH_INTERVAL_MS ?? 1000 * 60 * 60 * 6);

const records = new Map<string, DinosaurDetail>();
let refreshing: Promise<void> | null = null;
let lastRefreshAt: string | null = null;

export type RepositoryStatus = {
  total: number;
  loaded: number;
  withImages: number;
  refreshing: boolean;
  lastRefreshAt: string | null;
};

export function getStatus(): RepositoryStatus {
  const loaded = [...records.values()];
  return {
    total: seedDinosaurs.length,
    loaded: loaded.length,
    withImages: loaded.filter((record) => record.images.length > 0).length,
    refreshing: refreshing !== null,
    lastRefreshAt,
  };
}

/** 起動時にディスクキャッシュを読み、足りない分をバックグラウンドで取りに行く。 */
export async function initializeRepository(): Promise<void> {
  const cached = await loadCache();
  for (const [id, record] of cached) {
    records.set(id, record);
  }

  console.log(`cache loaded: ${records.size}/${seedDinosaurs.length} records`);

  void refreshAll();
  setInterval(() => void refreshAll(), REFRESH_INTERVAL_MS);
}

export function listDinosaurs(): DinosaurDetail[] {
  return seedDinosaurs.map((seed) => records.get(seed.id) ?? buildFallbackDetail(seed));
}

export function findDinosaur(id: string): DinosaurDetail | undefined {
  const seed = seedDinosaurs.find((item) => item.id === id);
  if (!seed) {
    return undefined;
  }
  return records.get(id) ?? buildFallbackDetail(seed);
}

export function refreshAll(): Promise<void> {
  if (refreshing) {
    return refreshing;
  }

  refreshing = (async () => {
    const results = await mapWithConcurrency(seedDinosaurs, FETCH_CONCURRENCY, (seed) => buildDinosaurDetail(seed));

    let updated = 0;
    results.forEach((result, index) => {
      const seed = seedDinosaurs[index];
      if (result.status === 'fulfilled') {
        records.set(seed.id, result.value);
        updated += 1;
        return;
      }

      // 取得に失敗しても、以前取れていたレコードは捨てない。
      if (!records.has(seed.id)) {
        records.set(seed.id, buildFallbackDetail(seed));
      }
    });

    lastRefreshAt = new Date().toISOString();
    console.log(`refresh finished: ${updated}/${seedDinosaurs.length} records updated`);

    try {
      await saveCache(listDinosaurs());
    } catch (error) {
      console.error('failed to persist cache:', error);
    }
  })().finally(() => {
    refreshing = null;
  });

  return refreshing;
}

async function buildDinosaurDetail(seed: SeedDinosaur): Promise<DinosaurDetail> {
  const [wikipediaResult, wikidataResult, taxonResult, occurrencesResult] = await Promise.allSettled([
    fetchWikipediaSummaries(seed.scientificName, seed.fallbackNameJa),
    fetchWikidataEntity(seed.scientificName),
    fetchPbdbTaxon(seed.pbdbName),
    fetchPbdbOccurrences(seed.pbdbName),
  ]);

  const wikipedia = wikipediaResult.status === 'fulfilled' ? wikipediaResult.value : {};
  const wikidata = wikidataResult.status === 'fulfilled' ? wikidataResult.value : undefined;
  const taxon = taxonResult.status === 'fulfilled' ? taxonResult.value : undefined;
  const occurrences = occurrencesResult.status === 'fulfilled' ? occurrencesResult.value : [];

  const images = await collectImages(wikipedia.ja, wikipedia.en, wikidata?.imageUrl);
  const localities = buildLocalities(occurrences);
  const references = await buildReferences(seed, taxon, occurrences, wikidata?.wikidataId);

  const description = wikipedia.ja?.extract ?? wikipedia.en?.extract ?? wikidata?.description;
  const period = buildPeriodLabel(taxon);
  const occurrenceCount = taxon?.n_occs ?? occurrences.length;

  return {
    id: seed.id,
    nameJa: wikidata?.nameJa ?? seed.fallbackNameJa,
    nameEn: seed.scientificName,
    meaning: seed.meaning,
    clade: seed.clade,
    subgroup: seed.subgroup,
    diet: seed.diet,
    period,
    ageMa: buildAgeLabel(taxon),
    ageStartMa: taxon?.firstapp_max_ma,
    ageEndMa: taxon?.lastapp_min_ma,
    lengthMeters: seed.lengthMeters,
    massEstimateKg: seed.massEstimateKg,
    region: seed.region,
    summary: buildSummary(seed, description),
    significance: buildSignificance(seed, taxon, occurrenceCount, localities.length),
    namedBy: taxon?.taxon_attr,
    taxonomy: buildTaxonomy(taxon, seed),
    occurrenceCount,
    imageUrl: images[0]?.url,
    images,
    localities: localities.length > 0 ? localities : [fallbackLocality(seed)],
    references: references.length > 0 ? references : fallbackReferences(seed),
  };
}

/**
 * 画像は 1系統だと取りこぼしが多いので、記事の図版 → 要約のサムネ → Wikidata P18 の順に
 * かき集めて重複を除く。
 */
async function collectImages(
  ja: WikipediaSummary | undefined,
  en: WikipediaSummary | undefined,
  wikidataImage: string | undefined,
): Promise<GalleryImage[]> {
  const collected: GalleryImage[] = [];

  const articleSources: Array<{ lang: 'ja' | 'en'; title: string }> = [];
  if (ja?.title) {
    articleSources.push({ lang: 'ja', title: ja.title });
  }
  if (en?.title) {
    articleSources.push({ lang: 'en', title: en.title });
  }

  for (const source of articleSources) {
    try {
      collected.push(...(await fetchArticleImages(source.lang, source.title)));
    } catch {
      // 図版が拾えなくても要約側の画像で成立させる。
    }
  }

  for (const summary of [ja, en]) {
    if (summary?.imageUrl) {
      collected.push({
        url: summary.imageUrl,
        thumbUrl: summary.thumbUrl ?? summary.imageUrl,
        sourceUrl: summary.pageUrl,
        credit: `Wikipedia (${summary.lang})`,
      });
    }
  }

  if (wikidataImage) {
    collected.push({ url: wikidataImage, thumbUrl: wikidataImage, credit: 'Wikimedia Commons' });
  }

  const deduped = new Map<string, GalleryImage>();
  for (const image of collected) {
    const key = image.url.split('/').pop() ?? image.url;
    if (!deduped.has(key)) {
      deduped.set(key, image);
    }
  }

  return [...deduped.values()].slice(0, 6);
}

async function buildReferences(
  seed: SeedDinosaur,
  taxon: PbdbTaxonRecord | undefined,
  occurrences: PbdbOccurrenceRecord[],
  wikidataId: string | undefined,
): Promise<ReferenceEntry[]> {
  const referenceNos = new Set<string>();
  if (taxon?.reference_no) {
    referenceNos.add(taxon.reference_no);
  }
  for (const occurrence of occurrences) {
    if (occurrence.reference_no && referenceNos.size < 5) {
      referenceNos.add(occurrence.reference_no);
    }
  }

  const fetched = await mapWithConcurrency([...referenceNos], 2, (referenceNo) => fetchPbdbReference(referenceNo));
  const references: ReferenceEntry[] = [];

  fetched.forEach((result, index) => {
    if (result.status !== 'fulfilled' || !result.value) {
      return;
    }
    references.push(toReferenceEntry(result.value, index === 0 ? 'original-description' : 'review'));
  });

  references.push(...buildDatabaseReferences(seed, taxon, wikidataId));
  return references;
}

function buildTaxonomy(taxon: PbdbTaxonRecord | undefined, seed: SeedDinosaur): string[] {
  const levels = [taxon?.phylum, taxon?.class, taxon?.order, taxon?.family, taxon?.genus].filter(
    (value): value is string => Boolean(value),
  );

  if (levels.length > 0) {
    return levels;
  }

  return ['Dinosauria', seed.clade, seed.subgroup];
}

function buildLocalities(records: PbdbOccurrenceRecord[]): LocalityDetail[] {
  const deduped = new Map<string, LocalityDetail>();

  for (const record of records) {
    const lat = Number(record.lat ?? '');
    const lng = Number(record.lng ?? '');
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      continue;
    }

    const label = buildLocalityLabel(record);
    const key = record.collection_no ?? `${label}:${lat}:${lng}`;
    if (deduped.has(key)) {
      continue;
    }

    deduped.set(key, {
      label,
      country: normalizeCountry(record.cc, record.state),
      formation: record.formation ?? record.geological_group ?? 'Unknown formation',
      age: record.early_interval ?? 'Unknown interval',
      coordinates: { lat, lng },
      note: record.geogcomments ?? 'PBDB 収録の産地メモです。',
    });
  }

  return [...deduped.values()].slice(0, 8);
}

function buildLocalityLabel(record: PbdbOccurrenceRecord): string {
  const formation = record.formation ?? record.geological_group;
  const country = normalizeCountry(record.cc, record.state);
  return formation ? `${formation} (${country})` : country;
}

function buildPeriodLabel(record?: PbdbTaxonRecord): string {
  if (!record?.early_interval && !record?.late_interval) {
    return 'Period data unavailable';
  }
  if (record.early_interval && record.late_interval && record.early_interval !== record.late_interval) {
    return `${record.early_interval} - ${record.late_interval}`;
  }
  return record.early_interval ?? record.late_interval ?? 'Period data unavailable';
}

function buildAgeLabel(record?: PbdbTaxonRecord): string {
  const start = formatMa(record?.firstapp_max_ma);
  const end = formatMa(record?.lastapp_min_ma);
  if (start && end) {
    return `${start} - ${end}`;
  }
  return start ?? end ?? 'Age data unavailable';
}

function buildSummary(seed: SeedDinosaur, description: string | undefined): string {
  if (description && description.length > 0) {
    return description;
  }

  const dietJa = seed.diet === 'Carnivore' ? '肉食性' : seed.diet === 'Herbivore' ? '草食性' : '雑食性';
  return `${seed.fallbackNameJa}（${seed.scientificName}）は${seed.region}の地層から産出した${seed.subgroup}の${dietJa}恐竜です。体長は約${seed.lengthMeters}m、推定体重は${seed.massEstimateKg.toLocaleString()}kg。`;
}

function buildSignificance(
  seed: SeedDinosaur,
  taxon: PbdbTaxonRecord | undefined,
  occurrenceCount: number | undefined,
  localityCount: number,
): string {
  const pieces = [
    taxon?.taxon_attr ? `命名は ${taxon.taxon_attr}` : undefined,
    occurrenceCount ? `PBDB に産出記録 ${occurrenceCount.toLocaleString()} 件` : undefined,
    localityCount > 0 ? `うち座標付きの産地 ${localityCount} 件` : undefined,
    `推定体長 ${seed.lengthMeters}m / 推定体重 ${seed.massEstimateKg.toLocaleString()}kg`,
  ].filter((value): value is string => Boolean(value));

  return `${pieces.join(' / ')}。`;
}

function buildDatabaseReferences(
  seed: SeedDinosaur,
  taxon: PbdbTaxonRecord | undefined,
  wikidataId: string | undefined,
): ReferenceEntry[] {
  const year = new Date().getFullYear();
  return [
    {
      title: `Wikidata item: ${seed.scientificName}`,
      authors: 'Wikidata contributors',
      year,
      journal: 'Wikidata',
      url: wikidataId
        ? `https://www.wikidata.org/wiki/${wikidataId}`
        : `https://www.wikidata.org/w/index.php?search=${encodeURIComponent(seed.scientificName)}`,
      kind: 'database',
    },
    {
      title: `PaleoBioDB taxon record: ${taxon?.taxon_name ?? seed.pbdbName}`,
      authors: 'PaleoBioDB contributors',
      year,
      journal: 'PaleoBioDB',
      url: pbdbTaxonUrl(seed.pbdbName),
      kind: 'database',
    },
  ];
}

export function buildFallbackDetail(seed: SeedDinosaur): DinosaurDetail {
  const dietJa = seed.diet === 'Carnivore' ? '肉食性' : seed.diet === 'Herbivore' ? '草食性' : '雑食性';
  return {
    id: seed.id,
    nameJa: seed.fallbackNameJa,
    nameEn: seed.scientificName,
    meaning: seed.meaning,
    clade: seed.clade,
    subgroup: seed.subgroup,
    diet: seed.diet,
    period: '詳細年代を調査中',
    ageMa: '---',
    lengthMeters: seed.lengthMeters,
    massEstimateKg: seed.massEstimateKg,
    region: seed.region,
    summary: `${seed.fallbackNameJa}（${seed.scientificName}）は${seed.region}の地層から産出した${seed.subgroup}の${dietJa}恐竜です。体長は約${seed.lengthMeters}m、推定体重は${seed.massEstimateKg.toLocaleString()}kg。`,
    significance: `推定体長 ${seed.lengthMeters}m / 推定体重 ${seed.massEstimateKg.toLocaleString()}kg。${seed.region}で発見された${seed.subgroup}の代表的な恐竜です。`,
    taxonomy: ['Dinosauria', seed.clade, seed.subgroup],
    images: [],
    localities: [fallbackLocality(seed)],
    references: fallbackReferences(seed),
  };
}

function fallbackLocality(seed: SeedDinosaur): LocalityDetail {
  return {
    label: `${seed.region} locality`,
    country: seed.region,
    formation: 'Pending PBDB fetch',
    age: 'Pending interval',
    coordinates: { lat: 0, lng: 0 },
    note: '外部 API が応答しなかったため、地域ベースのフォールバックを表示しています。',
  };
}

function fallbackReferences(seed: SeedDinosaur): ReferenceEntry[] {
  return [
    {
      title: `Wikidata item: ${seed.scientificName}`,
      authors: 'Wikidata contributors',
      year: new Date().getFullYear(),
      journal: 'Wikidata',
      url: `https://www.wikidata.org/w/index.php?search=${encodeURIComponent(seed.scientificName)}`,
      kind: 'database',
    },
  ];
}

function toReferenceEntry(record: PbdbReferenceRecord, kind: ReferenceEntry['kind']): ReferenceEntry {
  const year = Number(record.pubyr ?? '') || new Date().getFullYear();
  const journalParts = [record.pubtitle, record.pubvol].filter(Boolean);
  return {
    title: record.reftitle ?? 'Untitled PBDB reference',
    authors: buildAuthors(record),
    year,
    journal: journalParts.join(' ') || 'PaleoBioDB reference',
    doi: record.doi,
    url: `https://paleobiodb.org/data1.2/refs/single.json?id=ref:${record.reference_no ?? ''}&vocab=pbdb`,
    kind,
  };
}

function buildAuthors(record: PbdbReferenceRecord): string {
  const authors: string[] = [];

  if (record.author1last) {
    authors.push([record.author1last, record.author1init].filter(Boolean).join(' '));
  }
  if (record.author2last) {
    authors.push([record.author2last, record.author2init].filter(Boolean).join(' '));
  }
  if (record.otherauthors) {
    authors.push(record.otherauthors);
  }

  return authors.join(', ') || 'Unknown authors';
}

function normalizeCountry(code?: string, state?: string): string {
  const countries: Record<string, string> = {
    US: 'United States',
    CA: 'Canada',
    BE: 'Belgium',
    MA: 'Morocco',
    EG: 'Egypt',
    CN: 'China',
    MN: 'Mongolia',
    AR: 'Argentina',
    GB: 'United Kingdom',
    DE: 'Germany',
    FR: 'France',
    ES: 'Spain',
    PT: 'Portugal',
    AU: 'Australia',
    NZ: 'New Zealand',
    ZA: 'South Africa',
    TZ: 'Tanzania',
    NE: 'Niger',
    BR: 'Brazil',
    JP: 'Japan',
    IN: 'India',
    RO: 'Romania',
    AA: 'Antarctica',
  };

  const country = code ? countries[code] ?? code : 'Unknown country';
  return state ? `${country} / ${state}` : country;
}

function formatMa(value?: number): string | undefined {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return undefined;
  }
  return `${value.toFixed(1)} Ma`;
}
