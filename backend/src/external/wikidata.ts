import { fetchJson } from './http.js';

const WIKIDATA_BASE = process.env.WIKIDATA_BASE ?? 'https://www.wikidata.org';
const COMMONS_BASE = process.env.COMMONS_BASE ?? 'https://commons.wikimedia.org';

type WikidataSearchResponse = {
  search?: Array<{ id?: string; label?: string; description?: string }>;
};

type WikidataEntityPayload = {
  labels?: Record<string, { value: string }>;
  descriptions?: Record<string, { value: string }>;
  claims?: Record<string, Array<{ mainsnak?: { datavalue?: { value?: unknown } } }>>;
};

type WikidataEntityResponse = {
  entities?: Record<string, WikidataEntityPayload>;
};

export type WikidataEntity = {
  wikidataId?: string;
  nameJa?: string;
  description?: string;
  /** P18（画像）から得た Commons のファイル URL。 */
  imageUrl?: string;
};

function pickLocalizedValue(record?: Record<string, { value: string }>): string | undefined {
  return record?.ja?.value ?? record?.en?.value;
}

function readImageClaim(claims?: WikidataEntityPayload['claims']): string | undefined {
  const fileName = claims?.P18?.[0]?.mainsnak?.datavalue?.value;
  if (typeof fileName !== 'string' || fileName.length === 0) {
    return undefined;
  }
  return `${COMMONS_BASE}/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=960`;
}

export async function fetchWikidataEntity(searchName: string): Promise<WikidataEntity> {
  const searchUrl = `${WIKIDATA_BASE}/w/api.php?action=wbsearchentities&format=json&language=en&type=item&limit=5&search=${encodeURIComponent(searchName)}&origin=*`;
  const search = await fetchJson<WikidataSearchResponse>(searchUrl);
  const qid = search.search?.[0]?.id;

  if (!qid) {
    return {};
  }

  const entityUrl = `${WIKIDATA_BASE}/w/api.php?action=wbgetentities&format=json&ids=${qid}&languages=ja|en&props=labels|descriptions|claims&origin=*`;
  const entities = await fetchJson<WikidataEntityResponse>(entityUrl);
  const entity = entities.entities?.[qid];

  return {
    wikidataId: qid,
    nameJa: pickLocalizedValue(entity?.labels),
    description: pickLocalizedValue(entity?.descriptions),
    imageUrl: readImageClaim(entity?.claims),
  };
}
