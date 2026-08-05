export type GeoPoint = {
  lat: number;
  lng: number;
};

export type ReferenceEntry = {
  title: string;
  authors: string;
  year: number;
  journal: string;
  doi?: string;
  url: string;
  kind: 'original-description' | 'redescription' | 'review' | 'database';
};

export type LocalitySummary = {
  label: string;
  country: string;
  formation: string;
  age: string;
  coordinates: GeoPoint;
};

export type LocalityDetail = LocalitySummary & {
  note: string;
};

/** 画像は出典・ライセンスとセットで持ち回る（ASSET_LICENSE_TRACKER.md の運用に合わせる）。 */
export type GalleryImage = {
  url: string;
  thumbUrl: string;
  credit?: string;
  license?: string;
  sourceUrl?: string;
};

export type DinosaurSummary = {
  id: string;
  nameJa: string;
  nameEn: string;
  clade: 'Saurischia' | 'Ornithischia';
  subgroup: string;
  diet: 'Carnivore' | 'Herbivore' | 'Omnivore';
  period: string;
  region: string;
  summary: string;
  imageUrl?: string;
  ageStartMa?: number;
  ageEndMa?: number;
  lengthMeters: number;
  localities: LocalitySummary[];
};

export type DinosaurDetail = Omit<DinosaurSummary, 'localities'> & {
  meaning: string;
  ageMa: string;
  lengthMeters: number;
  massEstimateKg: number;
  significance: string;
  /** PBDB の命名者表記（例: "Osborn 1905"）。 */
  namedBy?: string;
  /** 目〜属までの分類階層。取得できた階層だけが並ぶ。 */
  taxonomy?: string[];
  /** PBDB の産出記録件数。 */
  occurrenceCount?: number;
  images: GalleryImage[];
  localities: LocalityDetail[];
  references: ReferenceEntry[];
};

export type FilterResponse = {
  clades: string[];
  subgroups: string[];
  diets: string[];
  periods: string[];
  regions: string[];
};
