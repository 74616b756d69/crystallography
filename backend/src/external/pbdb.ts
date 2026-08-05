import { fetchJson } from './http.js';

const PBDB_BASE = process.env.PBDB_BASE ?? 'https://paleobiodb.org';

export type PbdbTaxonRecord = {
  taxon_name?: string;
  reference_no?: string;
  n_occs?: number;
  early_interval?: string;
  late_interval?: string;
  firstapp_max_ma?: number;
  lastapp_min_ma?: number;
  /** show=attr で付く命名者表記（例: "Osborn 1905"）。 */
  taxon_attr?: string;
  /** show=class で付く分類階層。 */
  phylum?: string;
  class?: string;
  order?: string;
  family?: string;
  genus?: string;
};

export type PbdbOccurrenceRecord = {
  collection_no?: string;
  reference_no?: string;
  early_interval?: string;
  max_ma?: number;
  min_ma?: number;
  cc?: string;
  state?: string;
  formation?: string;
  geological_group?: string;
  geogcomments?: string;
  lat?: string;
  lng?: string;
};

export type PbdbReferenceRecord = {
  reference_no?: string;
  reftitle?: string;
  pubyr?: string;
  pubtitle?: string;
  pubvol?: string;
  author1init?: string;
  author1last?: string;
  author2init?: string;
  author2last?: string;
  otherauthors?: string;
  doi?: string;
};

type PbdbResponse<T> = {
  records?: T[];
};

export const PBDB_TAXON_SHOW = 'attr,app,class';

export function pbdbTaxonUrl(name: string): string {
  return `${PBDB_BASE}/data1.2/taxa/single.json?name=${encodeURIComponent(name)}&show=${PBDB_TAXON_SHOW}&vocab=pbdb`;
}

export async function fetchPbdbTaxon(name: string): Promise<PbdbTaxonRecord | undefined> {
  const payload = await fetchJson<PbdbResponse<PbdbTaxonRecord>>(pbdbTaxonUrl(name));
  return payload.records?.[0];
}

export async function fetchPbdbOccurrences(name: string): Promise<PbdbOccurrenceRecord[]> {
  const url = `${PBDB_BASE}/data1.2/occs/list.json?base_name=${encodeURIComponent(name)}&show=loc,time,strat,ident,coords&vocab=pbdb&limit=12`;
  const payload = await fetchJson<PbdbResponse<PbdbOccurrenceRecord>>(url);
  return payload.records ?? [];
}

export async function fetchPbdbReference(referenceNo: string): Promise<PbdbReferenceRecord | undefined> {
  const url = `${PBDB_BASE}/data1.2/refs/single.json?id=ref:${encodeURIComponent(referenceNo)}&vocab=pbdb`;
  const payload = await fetchJson<PbdbResponse<PbdbReferenceRecord>>(url);
  return payload.records?.[0];
}
