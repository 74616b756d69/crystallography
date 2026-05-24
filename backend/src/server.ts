import cors from 'cors';
import express, { type Request, type Response } from 'express';

import { additionalSeedDinosaurs } from './additionalSeedDinosaurs.js';

type GeoPoint = {
  lat: number;
  lng: number;
};

type ReferenceEntry = {
  title: string;
  authors: string;
  year: number;
  journal: string;
  doi?: string;
  url: string;
  source: 'pbdb' | 'wikidata' | 'wikipedia-ja';
  kind: 'original-description' | 'redescription' | 'review' | 'database';
};

type ImageAsset = {
  imageUrl: string;
  pageUrl: string;
  title: string;
  source: 'wikipedia-ja';
  attribution: string;
};

type LocalitySummary = {
  label: string;
  country: string;
  formation: string;
  age: string;
  coordinates: GeoPoint;
};

type LocalityDetail = LocalitySummary & {
  note: string;
};

type DinosaurSummary = {
  id: string;
  nameJa: string;
  nameEn: string;
  clade: 'Saurischia' | 'Ornithischia';
  subgroup: string;
  diet: 'Carnivore' | 'Herbivore' | 'Omnivore';
  period: string;
  region: string;
  summary: string;
  localities: LocalitySummary[];
};

type DinosaurDetail = Omit<DinosaurSummary, 'localities'> & {
  meaning: string;
  detailedDescription: string;
  heroImage?: ImageAsset;
  ageMa: string;
  lengthMeters: number;
  massEstimateKg: number;
  significance: string;
  localities: LocalityDetail[];
  references: ReferenceEntry[];
};

type FilterResponse = {
  clades: string[];
  subgroups: string[];
  diets: string[];
  periods: string[];
  regions: string[];
};

type SeedDinosaur = {
  id: string;
  scientificName: string;
  pbdbName: string;
  fallbackNameJa: string;
  meaning: string;
  clade: DinosaurSummary['clade'];
  subgroup: string;
  diet: DinosaurSummary['diet'];
  region: string;
  lengthMeters: number;
  massEstimateKg: number;
};

type WikidataEntityResponse = {
  entities?: Record<
    string,
    {
      labels?: Record<string, { value: string }>;
      descriptions?: Record<string, { value: string }>;
      sitelinks?: Record<string, { title: string }>;
    }
  >;
};

type WikidataSearchResponse = {
  search?: Array<{
    id?: string;
    label?: string;
    description?: string;
  }>;
};

type PbdbTaxonRecord = {
  taxon_name?: string;
  reference_no?: string;
  n_occs?: number;
  early_interval?: string;
  late_interval?: string;
  firstapp_max_ma?: number;
  lastapp_min_ma?: number;
};

type PbdbTaxonResponse = {
  records?: PbdbTaxonRecord[];
};

type PbdbOccurrenceRecord = {
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

type PbdbOccurrenceResponse = {
  records?: PbdbOccurrenceRecord[];
};

type PbdbReferenceRecord = {
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

type PbdbReferenceResponse = {
  records?: PbdbReferenceRecord[];
};

type ExternalSnapshot = {
  wikidataId?: string;
  nameJa?: string;
  description?: string;
  wikipediaSummaryJa?: string;
  wikipediaArticleUrl?: string;
  heroImage?: ImageAsset;
  pbdbTaxon?: PbdbTaxonRecord;
  localities: LocalityDetail[];
  references: ReferenceEntry[];
};

type WikipediaSummaryResponse = {
  extract?: string;
  title?: string;
  thumbnail?: {
    source?: string;
  };
  originalimage?: {
    source?: string;
  };
  content_urls?: {
    desktop?: {
      page?: string;
    };
  };
};

type WikipediaSummaryResult = {
  extract?: string;
  articleUrl?: string;
  heroImage?: ImageAsset;
};

type CrossrefWorkResponse = {
  message?: {
    title?: string[];
    author?: Array<{
      family?: string;
      given?: string;
    }>;
    'container-title'?: string[];
    DOI?: string;
    URL?: string;
    published?: {
      'date-parts'?: number[][];
    };
    'published-print'?: {
      'date-parts'?: number[][];
    };
    'published-online'?: {
      'date-parts'?: number[][];
    };
  };
};

type CrossrefMessage = NonNullable<CrossrefWorkResponse['message']>;
type CrossrefAuthor = NonNullable<CrossrefMessage['author']>[number];

const app = express();
const port = Number(process.env.PORT ?? 3000);
const cacheTtlMs = 1000 * 60 * 60 * 6;
const detailCache = new Map<string, { expiresAt: number; value: Promise<DinosaurDetail> }>();

const seedDinosaurs: SeedDinosaur[] = [
  {
    id: 'tyrannosaurus-rex',
    scientificName: 'Tyrannosaurus rex',
    pbdbName: 'Tyrannosaurus rex',
    fallbackNameJa: 'ティラノサウルス',
    meaning: '暴君トカゲの王',
    clade: 'Saurischia',
    subgroup: 'Theropoda',
    diet: 'Carnivore',
    region: 'North America',
    lengthMeters: 12.3,
    massEstimateKg: 8000,
  },
  {
    id: 'brachiosaurus-altithorax',
    scientificName: 'Brachiosaurus',
    pbdbName: 'Brachiosaurus altithorax',
    fallbackNameJa: 'ブラキオサウルス',
    meaning: '腕トカゲ',
    clade: 'Saurischia',
    subgroup: 'Sauropodomorpha',
    diet: 'Herbivore',
    region: 'North America',
    lengthMeters: 22,
    massEstimateKg: 35000,
  },
  {
    id: 'triceratops-horridus',
    scientificName: 'Triceratops',
    pbdbName: 'Triceratops horridus',
    fallbackNameJa: 'トリケラトプス',
    meaning: '三本角の顔',
    clade: 'Ornithischia',
    subgroup: 'Ceratopsia',
    diet: 'Herbivore',
    region: 'North America',
    lengthMeters: 8.5,
    massEstimateKg: 8000,
  },
  {
    id: 'iguanodon-bernissartensis',
    scientificName: 'Iguanodon',
    pbdbName: 'Iguanodon bernissartensis',
    fallbackNameJa: 'イグアノドン',
    meaning: 'イグアナの歯',
    clade: 'Ornithischia',
    subgroup: 'Ornithopoda',
    diet: 'Herbivore',
    region: 'Europe',
    lengthMeters: 10,
    massEstimateKg: 3500,
  },
  {
    id: 'spinosaurus-aegyptiacus',
    scientificName: 'Spinosaurus',
    pbdbName: 'Spinosaurus aegyptiacus',
    fallbackNameJa: 'スピノサウルス',
    meaning: 'エジプトの棘トカゲ',
    clade: 'Saurischia',
    subgroup: 'Theropoda',
    diet: 'Carnivore',
    region: 'North Africa',
    lengthMeters: 14,
    massEstimateKg: 7400,
  },
  {
    id: 'parasaurolophus-walkeri',
    scientificName: 'Parasaurolophus',
    pbdbName: 'Parasaurolophus walkeri',
    fallbackNameJa: 'パラサウロロフス',
    meaning: '近くの隆起したトカゲ',
    clade: 'Ornithischia',
    subgroup: 'Hadrosauridae',
    diet: 'Herbivore',
    region: 'North America',
    lengthMeters: 9.5,
    massEstimateKg: 2500,
  },
  {
    id: 'velociraptor-mongoliensis',
    scientificName: 'Velociraptor mongoliensis',
    pbdbName: 'Velociraptor mongoliensis',
    fallbackNameJa: 'ヴェロキラプトル',
    meaning: '素早い略奪者',
    clade: 'Saurischia',
    subgroup: 'Theropoda',
    diet: 'Carnivore',
    region: 'Asia',
    lengthMeters: 2.1,
    massEstimateKg: 15,
  },
  {
    id: 'allosaurus-fragilis',
    scientificName: 'Allosaurus fragilis',
    pbdbName: 'Allosaurus fragilis',
    fallbackNameJa: 'アロサウルス',
    meaning: '異なるトカゲ',
    clade: 'Saurischia',
    subgroup: 'Theropoda',
    diet: 'Carnivore',
    region: 'North America',
    lengthMeters: 9.7,
    massEstimateKg: 2300,
  },
  {
    id: 'carnotaurus-sastrei',
    scientificName: 'Carnotaurus sastrei',
    pbdbName: 'Carnotaurus sastrei',
    fallbackNameJa: 'カルノタウルス',
    meaning: '肉食の雄牛',
    clade: 'Saurischia',
    subgroup: 'Theropoda',
    diet: 'Carnivore',
    region: 'South America',
    lengthMeters: 8,
    massEstimateKg: 1500,
  },
  {
    id: 'deinonychus-antirrhopus',
    scientificName: 'Deinonychus antirrhopus',
    pbdbName: 'Deinonychus antirrhopus',
    fallbackNameJa: 'デイノニクス',
    meaning: '恐ろしい鉤爪',
    clade: 'Saurischia',
    subgroup: 'Theropoda',
    diet: 'Carnivore',
    region: 'North America',
    lengthMeters: 3.4,
    massEstimateKg: 80,
  },
  {
    id: 'diplodocus-cnegii',
    scientificName: 'Diplodocus carnegii',
    pbdbName: 'Diplodocus carnegii',
    fallbackNameJa: 'ディプロドクス',
    meaning: '二重の梁',
    clade: 'Saurischia',
    subgroup: 'Sauropodomorpha',
    diet: 'Herbivore',
    region: 'North America',
    lengthMeters: 24,
    massEstimateKg: 15000,
  },
  {
    id: 'apatosaurus-louisae',
    scientificName: 'Apatosaurus louisae',
    pbdbName: 'Apatosaurus louisae',
    fallbackNameJa: 'アパトサウルス',
    meaning: '欺くトカゲ',
    clade: 'Saurischia',
    subgroup: 'Sauropodomorpha',
    diet: 'Herbivore',
    region: 'North America',
    lengthMeters: 21,
    massEstimateKg: 23000,
  },
  {
    id: 'argentinosaurus-huinculensis',
    scientificName: 'Argentinosaurus huinculensis',
    pbdbName: 'Argentinosaurus huinculensis',
    fallbackNameJa: 'アルゼンチノサウルス',
    meaning: 'アルゼンチンのトカゲ',
    clade: 'Saurischia',
    subgroup: 'Sauropodomorpha',
    diet: 'Herbivore',
    region: 'South America',
    lengthMeters: 30,
    massEstimateKg: 65000,
  },
  {
    id: 'stegosaurus-stenops',
    scientificName: 'Stegosaurus stenops',
    pbdbName: 'Stegosaurus stenops',
    fallbackNameJa: 'ステゴサウルス',
    meaning: '屋根のあるトカゲ',
    clade: 'Ornithischia',
    subgroup: 'Stegosauria',
    diet: 'Herbivore',
    region: 'North America',
    lengthMeters: 9,
    massEstimateKg: 5000,
  },
  {
    id: 'ankylosaurus-magniventris',
    scientificName: 'Ankylosaurus magniventris',
    pbdbName: 'Ankylosaurus magniventris',
    fallbackNameJa: 'アンキロサウルス',
    meaning: '癒合したトカゲ',
    clade: 'Ornithischia',
    subgroup: 'Ankylosauria',
    diet: 'Herbivore',
    region: 'North America',
    lengthMeters: 6.5,
    massEstimateKg: 6000,
  },
  {
    id: 'protoceratops-andrewsi',
    scientificName: 'Protoceratops andrewsi',
    pbdbName: 'Protoceratops andrewsi',
    fallbackNameJa: 'プロトケラトプス',
    meaning: '最初の角のある顔',
    clade: 'Ornithischia',
    subgroup: 'Ceratopsia',
    diet: 'Herbivore',
    region: 'Asia',
    lengthMeters: 2,
    massEstimateKg: 180,
  },
  {
    id: 'pachycephalosaurus-wyomingensis',
    scientificName: 'Pachycephalosaurus wyomingensis',
    pbdbName: 'Pachycephalosaurus wyomingensis',
    fallbackNameJa: 'パキケファロサウルス',
    meaning: '分厚い頭のトカゲ',
    clade: 'Ornithischia',
    subgroup: 'Pachycephalosauria',
    diet: 'Herbivore',
    region: 'North America',
    lengthMeters: 4.5,
    massEstimateKg: 450,
  },
  {
    id: 'edmontosaurus-annectens',
    scientificName: 'Edmontosaurus annectens',
    pbdbName: 'Edmontosaurus annectens',
    fallbackNameJa: 'エドモントサウルス',
    meaning: 'エドモントンのトカゲ',
    clade: 'Ornithischia',
    subgroup: 'Hadrosauridae',
    diet: 'Herbivore',
    region: 'North America',
    lengthMeters: 12,
    massEstimateKg: 4000,
  },
  {
    id: 'giganotosaurus-carolinii',
    scientificName: 'Giganotosaurus carolinii',
    pbdbName: 'Giganotosaurus carolinii',
    fallbackNameJa: 'ギガノトサウルス',
    meaning: '巨大な南のトカゲ',
    clade: 'Saurischia',
    subgroup: 'Theropoda',
    diet: 'Carnivore',
    region: 'South America',
    lengthMeters: 13,
    massEstimateKg: 8000,
  },
  {
    id: 'ceratosaurus-nasicornis',
    scientificName: 'Ceratosaurus nasicornis',
    pbdbName: 'Ceratosaurus nasicornis',
    fallbackNameJa: 'ケラトサウルス',
    meaning: '角のあるトカゲ',
    clade: 'Saurischia',
    subgroup: 'Theropoda',
    diet: 'Carnivore',
    region: 'North America',
    lengthMeters: 6.7,
    massEstimateKg: 1000,
  },
  {
    id: 'acrocanthosaurus-atokensis',
    scientificName: 'Acrocanthosaurus atokensis',
    pbdbName: 'Acrocanthosaurus atokensis',
    fallbackNameJa: 'アクロカントサウルス',
    meaning: '高い棘のあるトカゲ',
    clade: 'Saurischia',
    subgroup: 'Theropoda',
    diet: 'Carnivore',
    region: 'North America',
    lengthMeters: 11.5,
    massEstimateKg: 6200,
  },
  {
    id: 'megalosaurus-bucklandii',
    scientificName: 'Megalosaurus bucklandii',
    pbdbName: 'Megalosaurus bucklandii',
    fallbackNameJa: 'メガロサウルス',
    meaning: '大きなトカゲ',
    clade: 'Saurischia',
    subgroup: 'Theropoda',
    diet: 'Carnivore',
    region: 'Europe',
    lengthMeters: 9,
    massEstimateKg: 1000,
  },
  {
    id: 'coelophysis-bauri',
    scientificName: 'Coelophysis bauri',
    pbdbName: 'Coelophysis bauri',
    fallbackNameJa: 'コエロフィシス',
    meaning: '中空の体形',
    clade: 'Saurischia',
    subgroup: 'Theropoda',
    diet: 'Carnivore',
    region: 'North America',
    lengthMeters: 3,
    massEstimateKg: 20,
  },
  {
    id: 'dilophosaurus-wetherilli',
    scientificName: 'Dilophosaurus wetherilli',
    pbdbName: 'Dilophosaurus wetherilli',
    fallbackNameJa: 'ディロフォサウルス',
    meaning: '二つの冠を持つトカゲ',
    clade: 'Saurischia',
    subgroup: 'Theropoda',
    diet: 'Carnivore',
    region: 'North America',
    lengthMeters: 7,
    massEstimateKg: 400,
  },
  {
    id: 'oviraptor-philoceratops',
    scientificName: 'Oviraptor philoceratops',
    pbdbName: 'Oviraptor philoceratops',
    fallbackNameJa: 'オヴィラプトル',
    meaning: '卵泥棒',
    clade: 'Saurischia',
    subgroup: 'Theropoda',
    diet: 'Omnivore',
    region: 'Asia',
    lengthMeters: 2,
    massEstimateKg: 33,
  },
  {
    id: 'troodon-formosus',
    scientificName: 'Troodon formosus',
    pbdbName: 'Troodon formosus',
    fallbackNameJa: 'トロオドン',
    meaning: '傷つける歯',
    clade: 'Saurischia',
    subgroup: 'Theropoda',
    diet: 'Carnivore',
    region: 'North America',
    lengthMeters: 2.4,
    massEstimateKg: 50,
  },
  {
    id: 'albertosaurus-sarcophagus',
    scientificName: 'Albertosaurus sarcophagus',
    pbdbName: 'Albertosaurus sarcophagus',
    fallbackNameJa: 'アルバートサウルス',
    meaning: 'アルバータのトカゲ',
    clade: 'Saurischia',
    subgroup: 'Theropoda',
    diet: 'Carnivore',
    region: 'North America',
    lengthMeters: 9,
    massEstimateKg: 2500,
  },
  {
    id: 'tarbosaurus-bataar',
    scientificName: 'Tarbosaurus bataar',
    pbdbName: 'Tarbosaurus bataar',
    fallbackNameJa: 'タルボサウルス',
    meaning: '恐るべきトカゲ',
    clade: 'Saurischia',
    subgroup: 'Theropoda',
    diet: 'Carnivore',
    region: 'Asia',
    lengthMeters: 11,
    massEstimateKg: 5000,
  },
  {
    id: 'concavenator-corcovatus',
    scientificName: 'Concavenator corcovatus',
    pbdbName: 'Concavenator corcovatus',
    fallbackNameJa: 'コンカヴェナトル',
    meaning: 'クエンカの狩人',
    clade: 'Saurischia',
    subgroup: 'Theropoda',
    diet: 'Carnivore',
    region: 'Europe',
    lengthMeters: 6,
    massEstimateKg: 400,
  },
  {
    id: 'majungasaurus-creanatissimus',
    scientificName: 'Majungasaurus crenatissimus',
    pbdbName: 'Majungasaurus crenatissimus',
    fallbackNameJa: 'マジュンガサウルス',
    meaning: 'マジュンガのトカゲ',
    clade: 'Saurischia',
    subgroup: 'Theropoda',
    diet: 'Carnivore',
    region: 'Africa',
    lengthMeters: 7,
    massEstimateKg: 1100,
  },
  {
    id: 'suchomimus-tenerensis',
    scientificName: 'Suchomimus tenerensis',
    pbdbName: 'Suchomimus tenerensis',
    fallbackNameJa: 'スコミムス',
    meaning: 'ワニもどき',
    clade: 'Saurischia',
    subgroup: 'Theropoda',
    diet: 'Carnivore',
    region: 'Africa',
    lengthMeters: 11,
    massEstimateKg: 3500,
  },
  {
    id: 'baryonyx-walkeri',
    scientificName: 'Baryonyx walkeri',
    pbdbName: 'Baryonyx walkeri',
    fallbackNameJa: 'バリオニクス',
    meaning: '重い鉤爪',
    clade: 'Saurischia',
    subgroup: 'Theropoda',
    diet: 'Carnivore',
    region: 'Europe',
    lengthMeters: 8.5,
    massEstimateKg: 1700,
  },
  {
    id: 'utahraptor-ostrommaysorum',
    scientificName: 'Utahraptor ostrommaysorum',
    pbdbName: 'Utahraptor ostrommaysorum',
    fallbackNameJa: 'ユタラプトル',
    meaning: 'ユタの略奪者',
    clade: 'Saurischia',
    subgroup: 'Theropoda',
    diet: 'Carnivore',
    region: 'North America',
    lengthMeters: 6,
    massEstimateKg: 500,
  },
  {
    id: 'mononykus-olecranus',
    scientificName: 'Mononykus olecranus',
    pbdbName: 'Mononykus olecranus',
    fallbackNameJa: 'モノニクス',
    meaning: '一本の鉤爪',
    clade: 'Saurischia',
    subgroup: 'Theropoda',
    diet: 'Carnivore',
    region: 'Asia',
    lengthMeters: 1,
    massEstimateKg: 3,
  },
  {
    id: 'therizinosaurus-cheloniformis',
    scientificName: 'Therizinosaurus cheloniformis',
    pbdbName: 'Therizinosaurus cheloniformis',
    fallbackNameJa: 'テリジノサウルス',
    meaning: '鎌トカゲ',
    clade: 'Saurischia',
    subgroup: 'Theropoda',
    diet: 'Herbivore',
    region: 'Asia',
    lengthMeters: 10,
    massEstimateKg: 5000,
  },
  {
    id: 'compsognathus-longipes',
    scientificName: 'Compsognathus longipes',
    pbdbName: 'Compsognathus longipes',
    fallbackNameJa: 'コンプソグナトゥス',
    meaning: '上品な顎',
    clade: 'Saurischia',
    subgroup: 'Theropoda',
    diet: 'Carnivore',
    region: 'Europe',
    lengthMeters: 1.2,
    massEstimateKg: 3,
  },
  {
    id: 'camarasaurus-supremus',
    scientificName: 'Camarasaurus supremus',
    pbdbName: 'Camarasaurus supremus',
    fallbackNameJa: 'カマラサウルス',
    meaning: '部屋のあるトカゲ',
    clade: 'Saurischia',
    subgroup: 'Sauropodomorpha',
    diet: 'Herbivore',
    region: 'North America',
    lengthMeters: 18,
    massEstimateKg: 20000,
  },
  {
    id: 'saltasaurus-loricatus',
    scientificName: 'Saltasaurus loricatus',
    pbdbName: 'Saltasaurus loricatus',
    fallbackNameJa: 'サルタサウルス',
    meaning: 'サルタのトカゲ',
    clade: 'Saurischia',
    subgroup: 'Sauropodomorpha',
    diet: 'Herbivore',
    region: 'South America',
    lengthMeters: 12,
    massEstimateKg: 7000,
  },
  {
    id: 'patagotitan-mayorum',
    scientificName: 'Patagotitan mayorum',
    pbdbName: 'Patagotitan mayorum',
    fallbackNameJa: 'パタゴティタン',
    meaning: 'パタゴニアの巨人',
    clade: 'Saurischia',
    subgroup: 'Sauropodomorpha',
    diet: 'Herbivore',
    region: 'South America',
    lengthMeters: 31,
    massEstimateKg: 57000,
  },
  {
    id: 'mamenchisaurus-youngi',
    scientificName: 'Mamenchisaurus youngi',
    pbdbName: 'Mamenchisaurus youngi',
    fallbackNameJa: 'マメンチサウルス',
    meaning: '馬鳴渓のトカゲ',
    clade: 'Saurischia',
    subgroup: 'Sauropodomorpha',
    diet: 'Herbivore',
    region: 'Asia',
    lengthMeters: 22,
    massEstimateKg: 26000,
  },
  {
    id: 'amargasaurus-cazaui',
    scientificName: 'Amargasaurus cazaui',
    pbdbName: 'Amargasaurus cazaui',
    fallbackNameJa: 'アマルガサウルス',
    meaning: 'ラ・アマルガのトカゲ',
    clade: 'Saurischia',
    subgroup: 'Sauropodomorpha',
    diet: 'Herbivore',
    region: 'South America',
    lengthMeters: 10,
    massEstimateKg: 2600,
  },
  {
    id: 'euhelopus-zdanskyi',
    scientificName: 'Euhelopus zdanskyi',
    pbdbName: 'Euhelopus zdanskyi',
    fallbackNameJa: 'エウヘロプス',
    meaning: '真の沼の足',
    clade: 'Saurischia',
    subgroup: 'Sauropodomorpha',
    diet: 'Herbivore',
    region: 'Asia',
    lengthMeters: 15,
    massEstimateKg: 15000,
  },
  {
    id: 'shunosaurus-lii',
    scientificName: 'Shunosaurus lii',
    pbdbName: 'Shunosaurus lii',
    fallbackNameJa: 'シュノサウルス',
    meaning: '蜀のトカゲ',
    clade: 'Saurischia',
    subgroup: 'Sauropodomorpha',
    diet: 'Herbivore',
    region: 'Asia',
    lengthMeters: 10,
    massEstimateKg: 3000,
  },
  {
    id: 'opisthocoelicaudia-skarzynskii',
    scientificName: 'Opisthocoelicaudia skarzynskii',
    pbdbName: 'Opisthocoelicaudia skarzynskii',
    fallbackNameJa: 'オピストコエリカウディア',
    meaning: '後ろが空洞の尾',
    clade: 'Saurischia',
    subgroup: 'Sauropodomorpha',
    diet: 'Herbivore',
    region: 'Asia',
    lengthMeters: 12,
    massEstimateKg: 11000,
  },
  {
    id: 'dreadnoughtus-schrani',
    scientificName: 'Dreadnoughtus schrani',
    pbdbName: 'Dreadnoughtus schrani',
    fallbackNameJa: 'ドレッドノータス',
    meaning: '何ものも恐れない者',
    clade: 'Saurischia',
    subgroup: 'Sauropodomorpha',
    diet: 'Herbivore',
    region: 'South America',
    lengthMeters: 26,
    massEstimateKg: 49000,
  },
  {
    id: 'plateosaurus-engelhardti',
    scientificName: 'Plateosaurus engelhardti',
    pbdbName: 'Plateosaurus engelhardti',
    fallbackNameJa: 'プラテオサウルス',
    meaning: '平らなトカゲ',
    clade: 'Saurischia',
    subgroup: 'Sauropodomorpha',
    diet: 'Herbivore',
    region: 'Europe',
    lengthMeters: 8,
    massEstimateKg: 2000,
  },
  {
    id: 'dryosaurus-altus',
    scientificName: 'Dryosaurus altus',
    pbdbName: 'Dryosaurus altus',
    fallbackNameJa: 'ドリオサウルス',
    meaning: '樹木のトカゲ',
    clade: 'Ornithischia',
    subgroup: 'Ornithopoda',
    diet: 'Herbivore',
    region: 'North America',
    lengthMeters: 4,
    massEstimateKg: 100,
  },
  {
    id: 'tenontosaurus-tilletti',
    scientificName: 'Tenontosaurus tilletti',
    pbdbName: 'Tenontosaurus tilletti',
    fallbackNameJa: 'テノントサウルス',
    meaning: '腱のあるトカゲ',
    clade: 'Ornithischia',
    subgroup: 'Ornithopoda',
    diet: 'Herbivore',
    region: 'North America',
    lengthMeters: 8,
    massEstimateKg: 1000,
  },
  {
    id: 'leaellynasaura-amicagraphica',
    scientificName: 'Leaellynasaura amicagraphica',
    pbdbName: 'Leaellynasaura amicagraphica',
    fallbackNameJa: 'レアエリナサウラ',
    meaning: 'リアリーンのトカゲ',
    clade: 'Ornithischia',
    subgroup: 'Ornithopoda',
    diet: 'Herbivore',
    region: 'Oceania',
    lengthMeters: 2.3,
    massEstimateKg: 40,
  },
  {
    id: 'ouranosaurus-nigeriensis',
    scientificName: 'Ouranosaurus nigeriensis',
    pbdbName: 'Ouranosaurus nigeriensis',
    fallbackNameJa: 'オウラノサウルス',
    meaning: '勇敢なトカゲ',
    clade: 'Ornithischia',
    subgroup: 'Ornithopoda',
    diet: 'Herbivore',
    region: 'Africa',
    lengthMeters: 7,
    massEstimateKg: 4000,
  },
  {
    id: 'lambeosaurus-lambei',
    scientificName: 'Lambeosaurus lambei',
    pbdbName: 'Lambeosaurus lambei',
    fallbackNameJa: 'ランベオサウルス',
    meaning: 'ランベのトカゲ',
    clade: 'Ornithischia',
    subgroup: 'Hadrosauridae',
    diet: 'Herbivore',
    region: 'North America',
    lengthMeters: 9.5,
    massEstimateKg: 5000,
  },
  {
    id: 'corythosaurus-casuaris',
    scientificName: 'Corythosaurus casuarius',
    pbdbName: 'Corythosaurus casuarius',
    fallbackNameJa: 'コリトサウルス',
    meaning: '兜をかぶったトカゲ',
    clade: 'Ornithischia',
    subgroup: 'Hadrosauridae',
    diet: 'Herbivore',
    region: 'North America',
    lengthMeters: 9,
    massEstimateKg: 3400,
  },
  {
    id: 'hadrosaurus-foulkii',
    scientificName: 'Hadrosaurus foulkii',
    pbdbName: 'Hadrosaurus foulkii',
    fallbackNameJa: 'ハドロサウルス',
    meaning: '頑丈なトカゲ',
    clade: 'Ornithischia',
    subgroup: 'Hadrosauridae',
    diet: 'Herbivore',
    region: 'North America',
    lengthMeters: 8,
    massEstimateKg: 3000,
  },
  {
    id: 'styracosaurus-albertensis',
    scientificName: 'Styracosaurus albertensis',
    pbdbName: 'Styracosaurus albertensis',
    fallbackNameJa: 'スティラコサウルス',
    meaning: '棘のあるトカゲ',
    clade: 'Ornithischia',
    subgroup: 'Ceratopsia',
    diet: 'Herbivore',
    region: 'North America',
    lengthMeters: 5.5,
    massEstimateKg: 3000,
  },
  {
    id: 'centrosaurus-apertus',
    scientificName: 'Centrosaurus apertus',
    pbdbName: 'Centrosaurus apertus',
    fallbackNameJa: 'セントロサウルス',
    meaning: '尖った角のトカゲ',
    clade: 'Ornithischia',
    subgroup: 'Ceratopsia',
    diet: 'Herbivore',
    region: 'North America',
    lengthMeters: 5.5,
    massEstimateKg: 2500,
  },
  {
    id: 'torosaurus-latus',
    scientificName: 'Torosaurus latus',
    pbdbName: 'Torosaurus latus',
    fallbackNameJa: 'トロサウルス',
    meaning: '穴のあいた顔のトカゲ',
    clade: 'Ornithischia',
    subgroup: 'Ceratopsia',
    diet: 'Herbivore',
    region: 'North America',
    lengthMeters: 8,
    massEstimateKg: 6000,
  },
  {
    id: 'pentaceratops-sternbergii',
    scientificName: 'Pentaceratops sternbergii',
    pbdbName: 'Pentaceratops sternbergii',
    fallbackNameJa: 'ペンタケラトプス',
    meaning: '五つの角の顔',
    clade: 'Ornithischia',
    subgroup: 'Ceratopsia',
    diet: 'Herbivore',
    region: 'North America',
    lengthMeters: 6,
    massEstimateKg: 5000,
  },
  {
    id: 'psittacosaurus-mongoliensis',
    scientificName: 'Psittacosaurus mongoliensis',
    pbdbName: 'Psittacosaurus mongoliensis',
    fallbackNameJa: 'プシッタコサウルス',
    meaning: 'オウムトカゲ',
    clade: 'Ornithischia',
    subgroup: 'Ceratopsia',
    diet: 'Herbivore',
    region: 'Asia',
    lengthMeters: 2,
    massEstimateKg: 20,
  },
  {
    id: 'stegoceras-validum',
    scientificName: 'Stegoceras validum',
    pbdbName: 'Stegoceras validum',
    fallbackNameJa: 'ステゴケラス',
    meaning: '屋根のある角',
    clade: 'Ornithischia',
    subgroup: 'Pachycephalosauria',
    diet: 'Herbivore',
    region: 'North America',
    lengthMeters: 2.4,
    massEstimateKg: 40,
  },
  {
    id: 'euoplocephalus-tutus',
    scientificName: 'Euoplocephalus tutus',
    pbdbName: 'Euoplocephalus tutus',
    fallbackNameJa: 'エウオプロケファルス',
    meaning: 'よく武装した頭',
    clade: 'Ornithischia',
    subgroup: 'Ankylosauria',
    diet: 'Herbivore',
    region: 'North America',
    lengthMeters: 6,
    massEstimateKg: 2000,
  },
  {
    id: 'daspletosaurus-torosus',
    scientificName: 'Daspletosaurus torosus',
    pbdbName: 'Daspletosaurus torosus',
    fallbackNameJa: 'ダスプレトサウルス',
    meaning: '恐るべき近縁トカゲ',
    clade: 'Saurischia',
    subgroup: 'Theropoda',
    diet: 'Carnivore',
    region: 'North America',
    lengthMeters: 9,
    massEstimateKg: 2500,
  },
  {
    id: 'carcharodontosaurus-saharicus',
    scientificName: 'Carcharodontosaurus saharicus',
    pbdbName: 'Carcharodontosaurus saharicus',
    fallbackNameJa: 'カルカロドントサウルス',
    meaning: 'サメの歯を持つトカゲ',
    clade: 'Saurischia',
    subgroup: 'Theropoda',
    diet: 'Carnivore',
    region: 'North Africa',
    lengthMeters: 13,
    massEstimateKg: 6000,
  },
  {
    id: 'sinraptor-dongi',
    scientificName: 'Sinraptor dongi',
    pbdbName: 'Sinraptor dongi',
    fallbackNameJa: 'シンラプトル',
    meaning: '中国の略奪者',
    clade: 'Saurischia',
    subgroup: 'Theropoda',
    diet: 'Carnivore',
    region: 'Asia',
    lengthMeters: 7.5,
    massEstimateKg: 1000,
  },
  {
    id: 'achillobator-giganticus',
    scientificName: 'Achillobator giganticus',
    pbdbName: 'Achillobator giganticus',
    fallbackNameJa: 'アキロバトル',
    meaning: 'アキレスの英雄',
    clade: 'Saurischia',
    subgroup: 'Theropoda',
    diet: 'Carnivore',
    region: 'Asia',
    lengthMeters: 5,
    massEstimateKg: 300,
  },
  {
    id: 'microraptor-gui',
    scientificName: 'Microraptor gui',
    pbdbName: 'Microraptor gui',
    fallbackNameJa: 'ミクロラプトル',
    meaning: '小さな略奪者',
    clade: 'Saurischia',
    subgroup: 'Theropoda',
    diet: 'Carnivore',
    region: 'Asia',
    lengthMeters: 0.8,
    massEstimateKg: 1,
  },
  {
    id: 'deinocheirus-mirificus',
    scientificName: 'Deinocheirus mirificus',
    pbdbName: 'Deinocheirus mirificus',
    fallbackNameJa: 'デイノケイルス',
    meaning: '恐ろしい手',
    clade: 'Saurischia',
    subgroup: 'Theropoda',
    diet: 'Omnivore',
    region: 'Asia',
    lengthMeters: 11,
    massEstimateKg: 6000,
  },
  {
    id: 'gallimimus-bullatus',
    scientificName: 'Gallimimus bullatus',
    pbdbName: 'Gallimimus bullatus',
    fallbackNameJa: 'ガリミムス',
    meaning: 'ニワトリもどき',
    clade: 'Saurischia',
    subgroup: 'Theropoda',
    diet: 'Omnivore',
    region: 'Asia',
    lengthMeters: 6,
    massEstimateKg: 450,
  },
  {
    id: 'ornithomimus-velox',
    scientificName: 'Ornithomimus velox',
    pbdbName: 'Ornithomimus velox',
    fallbackNameJa: 'オルニトミムス',
    meaning: '鳥のまねをする者',
    clade: 'Saurischia',
    subgroup: 'Theropoda',
    diet: 'Omnivore',
    region: 'North America',
    lengthMeters: 3.8,
    massEstimateKg: 170,
  },
  {
    id: 'dromaeosaurus-albertensis',
    scientificName: 'Dromaeosaurus albertensis',
    pbdbName: 'Dromaeosaurus albertensis',
    fallbackNameJa: 'ドロマエオサウルス',
    meaning: '走るトカゲ',
    clade: 'Saurischia',
    subgroup: 'Theropoda',
    diet: 'Carnivore',
    region: 'North America',
    lengthMeters: 2,
    massEstimateKg: 15,
  },
  {
    id: 'cryolophosaurus-ellioti',
    scientificName: 'Cryolophosaurus ellioti',
    pbdbName: 'Cryolophosaurus ellioti',
    fallbackNameJa: 'クリオロフォサウルス',
    meaning: '冷たい冠のトカゲ',
    clade: 'Saurischia',
    subgroup: 'Theropoda',
    diet: 'Carnivore',
    region: 'Antarctica',
    lengthMeters: 6.5,
    massEstimateKg: 450,
  },
  {
    id: 'herrerasaurus-ischigualastensis',
    scientificName: 'Herrerasaurus ischigualastensis',
    pbdbName: 'Herrerasaurus ischigualastensis',
    fallbackNameJa: 'ヘレラサウルス',
    meaning: 'ヘレラのトカゲ',
    clade: 'Saurischia',
    subgroup: 'Theropoda',
    diet: 'Carnivore',
    region: 'South America',
    lengthMeters: 6,
    massEstimateKg: 350,
  },
  {
    id: 'eoraptor-lunensis',
    scientificName: 'Eoraptor lunensis',
    pbdbName: 'Eoraptor lunensis',
    fallbackNameJa: 'エオラプトル',
    meaning: '夜明けの略奪者',
    clade: 'Saurischia',
    subgroup: 'Theropoda',
    diet: 'Omnivore',
    region: 'South America',
    lengthMeters: 1,
    massEstimateKg: 10,
  },
  {
    id: 'yangchuanosaurus-shangyouensis',
    scientificName: 'Yangchuanosaurus shangyouensis',
    pbdbName: 'Yangchuanosaurus shangyouensis',
    fallbackNameJa: 'ヤンチュアノサウルス',
    meaning: '永川のトカゲ',
    clade: 'Saurischia',
    subgroup: 'Theropoda',
    diet: 'Carnivore',
    region: 'Asia',
    lengthMeters: 10,
    massEstimateKg: 3400,
  },
  {
    id: 'rugops-primus',
    scientificName: 'Rugops primus',
    pbdbName: 'Rugops primus',
    fallbackNameJa: 'ルゴプス',
    meaning: 'しわだらけの顔',
    clade: 'Saurischia',
    subgroup: 'Theropoda',
    diet: 'Carnivore',
    region: 'Africa',
    lengthMeters: 6,
    massEstimateKg: 750,
  },
  {
    id: 'mapusaurus-roseae',
    scientificName: 'Mapusaurus roseae',
    pbdbName: 'Mapusaurus roseae',
    fallbackNameJa: 'マプサウルス',
    meaning: '大地のトカゲ',
    clade: 'Saurischia',
    subgroup: 'Theropoda',
    diet: 'Carnivore',
    region: 'South America',
    lengthMeters: 12,
    massEstimateKg: 4500,
  },
  {
    id: 'torvosaurus-tanneri',
    scientificName: 'Torvosaurus tanneri',
    pbdbName: 'Torvosaurus tanneri',
    fallbackNameJa: 'トルヴォサウルス',
    meaning: '獰猛なトカゲ',
    clade: 'Saurischia',
    subgroup: 'Theropoda',
    diet: 'Carnivore',
    region: 'North America',
    lengthMeters: 10,
    massEstimateKg: 2000,
  },
  {
    id: 'europasaurus-holgeri',
    scientificName: 'Europasaurus holgeri',
    pbdbName: 'Europasaurus holgeri',
    fallbackNameJa: 'エウロパサウルス',
    meaning: 'ヨーロッパのトカゲ',
    clade: 'Saurischia',
    subgroup: 'Sauropodomorpha',
    diet: 'Herbivore',
    region: 'Europe',
    lengthMeters: 6.2,
    massEstimateKg: 800,
  },
  {
    id: 'vulcanodon-karibaensis',
    scientificName: 'Vulcanodon karibaensis',
    pbdbName: 'Vulcanodon karibaensis',
    fallbackNameJa: 'ヴルカノドン',
    meaning: '火山の歯',
    clade: 'Saurischia',
    subgroup: 'Sauropodomorpha',
    diet: 'Herbivore',
    region: 'Africa',
    lengthMeters: 6.5,
    massEstimateKg: 3500,
  },
  {
    id: 'rapetosaurus-krausei',
    scientificName: 'Rapetosaurus krausei',
    pbdbName: 'Rapetosaurus krausei',
    fallbackNameJa: 'ラペトサウルス',
    meaning: 'いたずら好きのトカゲ',
    clade: 'Saurischia',
    subgroup: 'Sauropodomorpha',
    diet: 'Herbivore',
    region: 'Africa',
    lengthMeters: 15,
    massEstimateKg: 10000,
  },
  {
    id: 'alamosaurus-sanjuanensis',
    scientificName: 'Alamosaurus sanjuanensis',
    pbdbName: 'Alamosaurus sanjuanensis',
    fallbackNameJa: 'アラモサウルス',
    meaning: 'アラモのトカゲ',
    clade: 'Saurischia',
    subgroup: 'Sauropodomorpha',
    diet: 'Herbivore',
    region: 'North America',
    lengthMeters: 27,
    massEstimateKg: 30000,
  },
  {
    id: 'giraffatitan-brancai',
    scientificName: 'Giraffatitan brancai',
    pbdbName: 'Giraffatitan brancai',
    fallbackNameJa: 'ギラッファティタン',
    meaning: 'キリンの巨人',
    clade: 'Saurischia',
    subgroup: 'Sauropodomorpha',
    diet: 'Herbivore',
    region: 'Africa',
    lengthMeters: 23,
    massEstimateKg: 35000,
  },
  {
    id: 'mussaurus-patagonicus',
    scientificName: 'Mussaurus patagonicus',
    pbdbName: 'Mussaurus patagonicus',
    fallbackNameJa: 'ムッサウルス',
    meaning: 'ネズミトカゲ',
    clade: 'Saurischia',
    subgroup: 'Sauropodomorpha',
    diet: 'Herbivore',
    region: 'South America',
    lengthMeters: 6,
    massEstimateKg: 1000,
  },
  {
    id: 'isisaurus-colberti',
    scientificName: 'Isisaurus colberti',
    pbdbName: 'Isisaurus colberti',
    fallbackNameJa: 'イシサウルス',
    meaning: 'インド統計研究所のトカゲ',
    clade: 'Saurischia',
    subgroup: 'Sauropodomorpha',
    diet: 'Herbivore',
    region: 'Asia',
    lengthMeters: 18,
    massEstimateKg: 15000,
  },
  {
    id: 'cedarosaurus-weiskopfae',
    scientificName: 'Cedarosaurus weiskopfae',
    pbdbName: 'Cedarosaurus weiskopfae',
    fallbackNameJa: 'シーダロサウルス',
    meaning: 'シーダー山のトカゲ',
    clade: 'Saurischia',
    subgroup: 'Sauropodomorpha',
    diet: 'Herbivore',
    region: 'North America',
    lengthMeters: 16,
    massEstimateKg: 9000,
  },
  {
    id: 'kentrosaurus-aethiopicus',
    scientificName: 'Kentrosaurus aethiopicus',
    pbdbName: 'Kentrosaurus aethiopicus',
    fallbackNameJa: 'ケントロサウルス',
    meaning: '尖ったトカゲ',
    clade: 'Ornithischia',
    subgroup: 'Stegosauria',
    diet: 'Herbivore',
    region: 'Africa',
    lengthMeters: 4.5,
    massEstimateKg: 1200,
  },
  {
    id: 'huayangosaurus-taibaii',
    scientificName: 'Huayangosaurus taibaii',
    pbdbName: 'Huayangosaurus taibaii',
    fallbackNameJa: 'フアヤンゴサウルス',
    meaning: '華陽のトカゲ',
    clade: 'Ornithischia',
    subgroup: 'Stegosauria',
    diet: 'Herbivore',
    region: 'Asia',
    lengthMeters: 4.5,
    massEstimateKg: 1000,
  },
  {
    id: 'miragaia-longicollum',
    scientificName: 'Miragaia longicollum',
    pbdbName: 'Miragaia longicollum',
    fallbackNameJa: 'ミラガイア',
    meaning: '長い首を持つミラガイア',
    clade: 'Ornithischia',
    subgroup: 'Stegosauria',
    diet: 'Herbivore',
    region: 'Europe',
    lengthMeters: 6,
    massEstimateKg: 2000,
  },
  {
    id: 'sauropelta-edwardsorum',
    scientificName: 'Sauropelta edwardsorum',
    pbdbName: 'Sauropelta edwardsorum',
    fallbackNameJa: 'サウロペルタ',
    meaning: 'トカゲの盾',
    clade: 'Ornithischia',
    subgroup: 'Ankylosauria',
    diet: 'Herbivore',
    region: 'North America',
    lengthMeters: 5.2,
    massEstimateKg: 1500,
  },
  {
    id: 'borealopelta-markmitchelli',
    scientificName: 'Borealopelta markmitchelli',
    pbdbName: 'Borealopelta markmitchelli',
    fallbackNameJa: 'ボレアロペルタ',
    meaning: '北の盾',
    clade: 'Ornithischia',
    subgroup: 'Ankylosauria',
    diet: 'Herbivore',
    region: 'North America',
    lengthMeters: 5.5,
    massEstimateKg: 1300,
  },
  {
    id: 'nodosaurus-textilis',
    scientificName: 'Nodosaurus textilis',
    pbdbName: 'Nodosaurus textilis',
    fallbackNameJa: 'ノドサウルス',
    meaning: '節くれだったトカゲ',
    clade: 'Ornithischia',
    subgroup: 'Ankylosauria',
    diet: 'Herbivore',
    region: 'North America',
    lengthMeters: 6,
    massEstimateKg: 3500,
  },
  {
    id: 'chasmosaurus-belli',
    scientificName: 'Chasmosaurus belli',
    pbdbName: 'Chasmosaurus belli',
    fallbackNameJa: 'カスモサウルス',
    meaning: '裂け目のあるトカゲ',
    clade: 'Ornithischia',
    subgroup: 'Ceratopsia',
    diet: 'Herbivore',
    region: 'North America',
    lengthMeters: 5,
    massEstimateKg: 1500,
  },
  {
    id: 'kosmoceratops-richardsoni',
    scientificName: 'Kosmoceratops richardsoni',
    pbdbName: 'Kosmoceratops richardsoni',
    fallbackNameJa: 'コスモケラトプス',
    meaning: '飾られた角の顔',
    clade: 'Ornithischia',
    subgroup: 'Ceratopsia',
    diet: 'Herbivore',
    region: 'North America',
    lengthMeters: 4.5,
    massEstimateKg: 1200,
  },
  {
    id: 'einiosaurus-procurvicornis',
    scientificName: 'Einiosaurus procurvicornis',
    pbdbName: 'Einiosaurus procurvicornis',
    fallbackNameJa: 'エイニオサウルス',
    meaning: '水牛のようなトカゲ',
    clade: 'Ornithischia',
    subgroup: 'Ceratopsia',
    diet: 'Herbivore',
    region: 'North America',
    lengthMeters: 4.5,
    massEstimateKg: 1300,
  },
  {
    id: 'leptoceratops-gracilis',
    scientificName: 'Leptoceratops gracilis',
    pbdbName: 'Leptoceratops gracilis',
    fallbackNameJa: 'レプトケラトプス',
    meaning: '小さな角の顔',
    clade: 'Ornithischia',
    subgroup: 'Ceratopsia',
    diet: 'Herbivore',
    region: 'North America',
    lengthMeters: 2,
    massEstimateKg: 200,
  },
  {
    id: 'prenocephale-prenes',
    scientificName: 'Prenocephale prenes',
    pbdbName: 'Prenocephale prenes',
    fallbackNameJa: 'プレノケファレ',
    meaning: '傾いた頭',
    clade: 'Ornithischia',
    subgroup: 'Pachycephalosauria',
    diet: 'Herbivore',
    region: 'Asia',
    lengthMeters: 2,
    massEstimateKg: 40,
  },
  {
    id: 'homalocephale-calathocercos',
    scientificName: 'Homalocephale calathocercos',
    pbdbName: 'Homalocephale calathocercos',
    fallbackNameJa: 'ホマロケファレ',
    meaning: '平たい頭',
    clade: 'Ornithischia',
    subgroup: 'Pachycephalosauria',
    diet: 'Herbivore',
    region: 'Asia',
    lengthMeters: 1.8,
    massEstimateKg: 30,
  },
  {
    id: 'hypsilophodon-foxii',
    scientificName: 'Hypsilophodon foxii',
    pbdbName: 'Hypsilophodon foxii',
    fallbackNameJa: 'ヒプシロフォドン',
    meaning: '高い稜を持つ歯',
    clade: 'Ornithischia',
    subgroup: 'Ornithopoda',
    diet: 'Herbivore',
    region: 'Europe',
    lengthMeters: 2.3,
    massEstimateKg: 20,
  },
  {
    id: 'lesothosaurus-diagnosticus',
    scientificName: 'Lesothosaurus diagnosticus',
    pbdbName: 'Lesothosaurus diagnosticus',
    fallbackNameJa: 'レソトサウルス',
    meaning: 'レソトのトカゲ',
    clade: 'Ornithischia',
    subgroup: 'Ornithopoda',
    diet: 'Herbivore',
    region: 'Africa',
    lengthMeters: 1,
    massEstimateKg: 10,
  },
  {
    id: 'maiasaura-peeblesorum',
    scientificName: 'Maiasaura peeblesorum',
    pbdbName: 'Maiasaura peeblesorum',
    fallbackNameJa: 'マイアサウラ',
    meaning: 'よい母トカゲ',
    clade: 'Ornithischia',
    subgroup: 'Hadrosauridae',
    diet: 'Herbivore',
    region: 'North America',
    lengthMeters: 9,
    massEstimateKg: 2500,
  },
  {
    id: 'gryposaurus-notabilis',
    scientificName: 'Gryposaurus notabilis',
    pbdbName: 'Gryposaurus notabilis',
    fallbackNameJa: 'グリポサウルス',
    meaning: '鉤鼻のトカゲ',
    clade: 'Ornithischia',
    subgroup: 'Hadrosauridae',
    diet: 'Herbivore',
    region: 'North America',
    lengthMeters: 8,
    massEstimateKg: 3000,
  },
  ...additionalSeedDinosaurs,
];

app.use(cors());

app.get('/api/health', (_request: Request, response: Response) => {
  response.json({ ok: true, sources: ['Wikidata', 'PaleoBioDB'] });
});

app.get('/api/dinosaurs/filters', async (_request: Request, response: Response<FilterResponse>) => {
  const dinosaurs = await getAllDinosaurs();
  response.json({
    clades: uniqueSorted(dinosaurs.map((item) => item.clade)),
    subgroups: uniqueSorted(dinosaurs.map((item) => item.subgroup)),
    diets: uniqueSorted(dinosaurs.map((item) => item.diet)),
    periods: uniqueSorted(dinosaurs.map((item) => item.period)),
    regions: uniqueSorted(dinosaurs.map((item) => item.region)),
  });
});

app.get('/api/dinosaurs', async (request: Request, response: Response<DinosaurSummary[] | { message: string }>) => {
  try {
    const q = String(request.query.q ?? '').trim().toLowerCase();
    const clade = String(request.query.clade ?? '').trim();
    const subgroup = String(request.query.subgroup ?? '').trim();
    const diet = String(request.query.diet ?? '').trim();
    const period = String(request.query.period ?? '').trim();
    const region = String(request.query.region ?? '').trim();

    const dinosaurs = await getAllDinosaurs();
    const results = dinosaurs.filter((item) => {
      const matchesQuery =
        q.length === 0 ||
        [item.nameJa, item.nameEn, item.summary, item.subgroup, item.period, item.region]
          .join(' ')
          .toLowerCase()
          .includes(q);

      return (
        matchesQuery &&
        matchesFilter(item.clade, clade) &&
        matchesFilter(item.subgroup, subgroup) &&
        matchesFilter(item.diet, diet) &&
        matchesFilter(item.period, period) &&
        matchesFilter(item.region, region)
      );
    });

    response.json(results.map(toSummary));
  } catch (error) {
    response.status(502).json({
      message: error instanceof Error ? error.message : 'Failed to load dinosaur data.',
    });
  }
});

app.get('/api/dinosaurs/:id', async (request: Request, response: Response<DinosaurDetail | { message: string }>) => {
  const seed = seedDinosaurs.find((item) => item.id === request.params.id);
  if (!seed) {
    response.status(404).json({ message: 'Dinosaur was not found.' });
    return;
  }

  try {
    const detail = await getDinosaurDetail(seed);
    response.json(detail);
  } catch (error) {
    response.status(502).json({
      message: error instanceof Error ? error.message : 'Failed to load dinosaur detail.',
    });
  }
});

async function getAllDinosaurs(): Promise<DinosaurDetail[]> {
  const results = await Promise.allSettled(seedDinosaurs.map((seed) => getDinosaurDetail(seed)));
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }

    const seed = seedDinosaurs[index];
    console.error(`Failed to load dinosaur detail for ${seed.id}:`, result.reason);
    return buildFallbackDetail(seed);
  });
}

async function getDinosaurDetail(seed: SeedDinosaur): Promise<DinosaurDetail> {
  const cached = detailCache.get(seed.id);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value.catch((error) => {
      detailCache.delete(seed.id);
      throw error;
    });
  }

  const value = buildDinosaurDetail(seed).catch((error) => {
    detailCache.delete(seed.id);
    console.error(`Falling back for ${seed.id}:`, error);
    return buildFallbackDetail(seed);
  });
  detailCache.set(seed.id, { expiresAt: Date.now() + cacheTtlMs, value });
  return value;
}

async function buildDinosaurDetail(seed: SeedDinosaur): Promise<DinosaurDetail> {
  const snapshot = await loadExternalSnapshot(seed);
  const pbdbTaxon = snapshot.pbdbTaxon;
  const period = buildPeriodLabel(pbdbTaxon);
  const ageMa = buildAgeLabel(pbdbTaxon);
  const occurrenceCount = pbdbTaxon?.n_occs ?? snapshot.localities.length;
  const summary = buildSummary(seed, snapshot.description, occurrenceCount, period);
  const detailedDescription = buildDetailedDescription(
    seed,
    snapshot.wikipediaSummaryJa,
    period,
    snapshot.localities.length,
    snapshot.references.length,
  );
  const significance = buildSignificance(seed, occurrenceCount, snapshot.localities.length, snapshot.references.length);

  return {
    id: seed.id,
    nameJa: snapshot.nameJa ?? seed.fallbackNameJa,
    nameEn: seed.scientificName,
    meaning: seed.meaning,
    detailedDescription,
    heroImage: snapshot.heroImage,
    clade: seed.clade,
    subgroup: seed.subgroup,
    diet: seed.diet,
    period,
    ageMa,
    lengthMeters: seed.lengthMeters,
    massEstimateKg: seed.massEstimateKg,
    region: seed.region,
    summary,
    significance,
    localities: snapshot.localities.length > 0 ? snapshot.localities : [fallbackLocality(seed)],
    references: snapshot.references.length > 0 ? snapshot.references : fallbackReferences(seed),
  };
}

async function loadExternalSnapshot(seed: SeedDinosaur): Promise<ExternalSnapshot> {
  const [wikidataResult, pbdbTaxonResult, pbdbOccurrencesResult] = await Promise.allSettled([
    fetchWikidataEntity(seed.scientificName),
    fetchPbdbTaxon(seed.pbdbName),
    fetchPbdbOccurrences(seed.pbdbName),
  ]);

  const pbdbTaxon = pbdbTaxonResult.status === 'fulfilled' ? pbdbTaxonResult.value : undefined;
  const occurrences = pbdbOccurrencesResult.status === 'fulfilled' ? pbdbOccurrencesResult.value : [];
  const localities = buildLocalities(occurrences);

  const referenceNos = new Set<string>();
  if (pbdbTaxon?.reference_no) {
    referenceNos.add(pbdbTaxon.reference_no);
  }
  occurrences.forEach((occurrence) => {
    if (occurrence.reference_no && referenceNos.size < 5) {
      referenceNos.add(occurrence.reference_no);
    }
  });

  const literature = await fetchLiteratureReferenceEntries([...referenceNos]);

  const wikidata = wikidataResult.status === 'fulfilled' ? wikidataResult.value : undefined;
  const wikipediaSummary = await fetchJapaneseWikipediaSummary(seed, wikidata?.nameJa, wikidata?.jaWikipediaTitle);
  const databaseReferences = buildDatabaseReferenceEntries(
    seed,
    pbdbTaxon,
    wikidata?.wikidataId,
    wikipediaSummary?.articleUrl,
  );

  return {
    wikidataId: wikidata?.wikidataId,
    nameJa: wikidata?.nameJa,
    description: wikidata?.description,
    wikipediaSummaryJa: wikipediaSummary?.extract,
    wikipediaArticleUrl: wikipediaSummary?.articleUrl,
    heroImage: wikipediaSummary?.heroImage,
    pbdbTaxon,
    localities,
    references: dedupeReferenceEntries([...literature, ...databaseReferences]),
  };
}

function toSummary(detail: DinosaurDetail): DinosaurSummary {
  return {
    id: detail.id,
    nameJa: detail.nameJa,
    nameEn: detail.nameEn,
    clade: detail.clade,
    subgroup: detail.subgroup,
    diet: detail.diet,
    period: detail.period,
    region: detail.region,
    summary: detail.summary,
    localities: detail.localities.map((locality) => ({
      label: locality.label,
      country: locality.country,
      formation: locality.formation,
      age: locality.age,
      coordinates: locality.coordinates,
    })),
  };
}

function buildLocalities(records: PbdbOccurrenceRecord[]): LocalityDetail[] {
  const deduped = new Map<string, LocalityDetail>();

  records.forEach((record) => {
    const lat = Number(record.lat ?? '');
    const lng = Number(record.lng ?? '');
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return;
    }

    const label = buildLocalityLabel(record);
    const key = record.collection_no ?? `${label}:${lat}:${lng}`;
    if (deduped.has(key)) {
      return;
    }

    deduped.set(key, {
      label,
      country: normalizeCountry(record.cc, record.state),
      formation: record.formation ?? record.geological_group ?? 'Unknown formation',
      age: record.early_interval ?? 'Unknown interval',
      coordinates: { lat, lng },
      note: record.geogcomments ?? 'PBDB 収録の産地メモです。',
    });
  });

  return [...deduped.values()].slice(0, 8);
}

function buildLocalityLabel(record: PbdbOccurrenceRecord): string {
  const formation = record.formation ?? record.geological_group;
  const country = normalizeCountry(record.cc, record.state);
  if (formation) {
    return `${formation} (${country})`;
  }
  return country;
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
  if (!start && !end) {
    return 'Age data unavailable';
  }
  if (start && end) {
    return `${start} - ${end}`;
  }
  return start ?? end ?? 'Age data unavailable';
}

function buildSummary(seed: SeedDinosaur, description: string | undefined, occurrenceCount: number | undefined, period: string): string {
  const base = description ?? `${seed.scientificName} の外部データを統合したレコードです。`;
  if (!occurrenceCount || occurrenceCount <= 0) {
    return base;
  }
  return `${base} PaleoBioDB では ${occurrenceCount} 件の産出記録が確認でき、${period} の情報に接続できます。`;
}

function buildDetailedDescription(
  seed: SeedDinosaur,
  wikipediaSummaryJa: string | undefined,
  period: string,
  localityCount: number,
  referenceCount: number,
): string {
  const normalized = wikipediaSummaryJa?.replace(/\s+/g, ' ').trim();
  const supplement = buildDescriptionSupplement(seed, period, localityCount, referenceCount);

  if (normalized) {
    return `${normalized} ${supplement}`;
  }

  return `${seed.fallbackNameJa}は、${seed.meaning}として知られる恐竜です。${supplement}`;
}

function buildDescriptionSupplement(seed: SeedDinosaur, period: string, localityCount: number, referenceCount: number): string {
  const diet = formatDietLabel(seed.diet);
  const majorClade = formatMajorCladeLabel(seed.clade);
  const clade = formatSubgroupLabel(seed.subgroup, seed.clade);
  const region = formatRegionLabel(seed.region);
  const periodText = period === 'Period data unavailable' ? '時代の詳細は調査中です。' : `${period} ごろに知られています。`;
  const localityText = localityCount > 0
    ? `現在は ${localityCount} 件の産地情報と ${referenceCount} 件の参考文献・データベース導線を合わせて確認できます。`
    : `参考文献・データベース導線は ${referenceCount} 件まとまっています。`;

  return `${seed.fallbackNameJa}は、${majorClade}に属する${diet}の${clade}として扱われています。学名の意味は「${seed.meaning}」で、主な産地は${region}です。${periodText} 体長は約${seed.lengthMeters.toFixed(1)}m、推定体重は約${Math.round(seed.massEstimateKg).toLocaleString()}kgです。${localityText}`;
}

function formatMajorCladeLabel(clade: DinosaurSummary['clade']): string {
  if (clade === 'Saurischia') {
    return '竜盤類';
  }

  return '鳥盤類';
}
function buildSignificance(seed: SeedDinosaur, occurrenceCount: number | undefined, localityCount: number, referenceCount: number): string {
  const pieces = [
    occurrenceCount ? `PBDB occurrence ${occurrenceCount} 件` : undefined,
    localityCount > 0 ? `地図表示用の産地 ${localityCount} 件` : undefined,
    referenceCount > 0 ? `文献導線 ${referenceCount} 件` : undefined,
  ].filter(Boolean);

  if (pieces.length === 0) {
    return `${seed.scientificName} の外部メタデータは一部のみ取得できました。`;
  }

  return `${pieces.join(' / ')} をライブ取得しています。`;
}

async function fetchLiteratureReferenceEntries(referenceNos: string[]): Promise<ReferenceEntry[]> {
  const pbdbEntries = await fetchPbdbReferenceEntries(referenceNos);
  return enrichReferenceEntriesWithCrossref(pbdbEntries);
}

async function fetchPbdbReferenceEntries(referenceNos: string[]): Promise<ReferenceEntry[]> {
  const fetchedReferences = await Promise.allSettled(referenceNos.map((referenceNo) => fetchPbdbReference(referenceNo)));
  return fetchedReferences.flatMap((entry, index) => {
    if (entry.status !== 'fulfilled' || !entry.value) {
      return [];
    }

    return [toPbdbReferenceEntry(entry.value, index === 0 ? 'original-description' : 'review')];
  });
}

async function enrichReferenceEntriesWithCrossref(entries: ReferenceEntry[]): Promise<ReferenceEntry[]> {
  const uniqueDois = [...new Set(entries.map((entry) => entry.doi?.trim()).filter((doi): doi is string => Boolean(doi)))];
  if (uniqueDois.length === 0) {
    return entries;
  }

  const crossrefResults = await Promise.allSettled(uniqueDois.map((doi) => fetchCrossrefWork(doi)));
  const crossrefByDoi = new Map<string, CrossrefWorkResponse['message']>();

  crossrefResults.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value) {
      crossrefByDoi.set(uniqueDois[index].toLowerCase(), result.value);
    }
  });

  return entries.map((entry) => mergeCrossrefIntoReference(entry, crossrefByDoi.get(entry.doi?.toLowerCase() ?? '')));
}

function mergeCrossrefIntoReference(
  entry: ReferenceEntry,
  crossref?: CrossrefMessage,
): ReferenceEntry {
  if (!crossref) {
    return entry;
  }

  const crossrefTitle = crossref.title?.[0]?.trim();
  const crossrefAuthors = formatCrossrefAuthors(crossref.author);
  const crossrefJournal = crossref['container-title']?.[0]?.trim();
  const crossrefYear = readCrossrefYear(crossref);

  return {
    ...entry,
    title: crossrefTitle || entry.title,
    authors: crossrefAuthors || entry.authors,
    journal: crossrefJournal || entry.journal,
    year: crossrefYear ?? entry.year,
    doi: crossref.DOI || entry.doi,
  };
}

function buildDatabaseReferenceEntries(
  seed: SeedDinosaur,
  pbdbTaxon?: PbdbTaxonRecord,
  wikidataId?: string,
  wikipediaArticleUrl?: string,
): ReferenceEntry[] {
  const pbdbQuery = `https://paleobiodb.org/data1.2/taxa/single.json?name=${encodeURIComponent(seed.pbdbName)}&show=attr,app&vocab=pbdb`;
  return [
    wikipediaArticleUrl
      ? {
          title: `Japanese Wikipedia: ${seed.fallbackNameJa}`,
          authors: 'Wikipedia contributors',
          year: new Date().getFullYear(),
          journal: 'Japanese Wikipedia',
          url: wikipediaArticleUrl,
          source: 'wikipedia-ja',
          kind: 'database' as const,
        }
      : undefined,
    {
      title: `Wikidata item: ${seed.scientificName}`,
      authors: 'Wikidata contributors',
      year: new Date().getFullYear(),
      journal: 'Wikidata',
      url: wikidataId ? `https://www.wikidata.org/wiki/${wikidataId}` : `https://www.wikidata.org/w/index.php?search=${encodeURIComponent(seed.scientificName)}`,
      source: 'wikidata',
      kind: 'database',
    },
    {
      title: `PaleoBioDB taxon record: ${pbdbTaxon?.taxon_name ?? seed.pbdbName}`,
      authors: 'PaleoBioDB contributors',
      year: new Date().getFullYear(),
      journal: 'PaleoBioDB',
      url: pbdbQuery,
      source: 'pbdb',
      kind: 'database',
    },
  ].filter((reference): reference is ReferenceEntry => Boolean(reference));
}

function buildFallbackDetail(seed: SeedDinosaur): DinosaurDetail {
  return {
    id: seed.id,
    nameJa: seed.fallbackNameJa,
    nameEn: seed.scientificName,
    meaning: seed.meaning,
    detailedDescription: `${seed.fallbackNameJa}は、${seed.meaning}として知られる恐竜です。${buildDescriptionSupplement(seed, 'Period data unavailable', 1, fallbackReferences(seed).length)} ${seed.scientificName} のライブデータ取得に失敗したため、ローカルのフォールバック情報を表示しています。`,
    clade: seed.clade,
    subgroup: seed.subgroup,
    diet: seed.diet,
    period: 'Period data unavailable',
    ageMa: 'Age data unavailable',
    lengthMeters: seed.lengthMeters,
    massEstimateKg: seed.massEstimateKg,
    region: seed.region,
    summary: `${seed.scientificName} のライブデータ取得に失敗したため、ローカルのフォールバック情報を表示しています。`,
    significance: '外部 API が不安定な場合でも一覧と詳細が落ちないようにフォールバックしています。',
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
      title: `Japanese Wikipedia search: ${seed.fallbackNameJa}`,
      authors: 'Wikipedia contributors',
      year: new Date().getFullYear(),
      journal: 'Japanese Wikipedia',
      url: `https://ja.wikipedia.org/w/index.php?search=${encodeURIComponent(seed.fallbackNameJa)}`,
      source: 'wikipedia-ja',
      kind: 'database',
    },
    {
      title: `Wikidata item: ${seed.scientificName}`,
      authors: 'Wikidata contributors',
      year: new Date().getFullYear(),
      journal: 'Wikidata',
      url: `https://www.wikidata.org/w/index.php?search=${encodeURIComponent(seed.scientificName)}`,
      source: 'wikidata',
      kind: 'database',
    },
  ];
}

function toPbdbReferenceEntry(record: PbdbReferenceRecord, kind: ReferenceEntry['kind']): ReferenceEntry {
  const year = Number(record.pubyr ?? '') || new Date().getFullYear();
  const authors = buildAuthors(record);
  const journalParts = [record.pubtitle, record.pubvol].filter(Boolean);
  return {
    title: record.reftitle ?? 'Untitled PBDB reference',
    authors,
    year,
    journal: journalParts.join(' ') || 'PaleoBioDB reference',
    doi: record.doi,
    url: `https://paleobiodb.org/data1.2/refs/single.json?id=ref:${record.reference_no ?? ''}&vocab=pbdb`,
    source: 'pbdb',
    kind,
  };
}

function dedupeReferenceEntries(entries: ReferenceEntry[]): ReferenceEntry[] {
  const deduped = new Map<string, ReferenceEntry>();

  entries.forEach((entry) => {
    const key = entry.doi?.toLowerCase() ?? `${entry.title.toLowerCase()}::${entry.year}`;
    if (!deduped.has(key)) {
      deduped.set(key, entry);
    }
  });

  return [...deduped.values()];
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
  };

  const country = code ? countries[code] ?? code : 'Unknown country';
  if (!state) {
    return country;
  }
  return `${country} / ${state}`;
}

function formatMa(value?: number): string | undefined {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return undefined;
  }
  return `${value.toFixed(1)} Ma`;
}

function matchesFilter(actual: string, expected: string): boolean {
  return expected.length === 0 || actual === expected;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

async function fetchWikidataEntity(
  searchName: string,
): Promise<{ wikidataId?: string; nameJa?: string; description?: string; jaWikipediaTitle?: string }> {
  const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&type=item&limit=5&search=${encodeURIComponent(searchName)}&origin=*`;
  const searchPayload = await fetchJson<WikidataSearchResponse>(searchUrl);
  const match =
    searchPayload.search?.find((entry) => entry.label?.toLowerCase() === searchName.toLowerCase()) ??
    searchPayload.search?.[0];

  if (!match?.id) {
    return {
      description: searchPayload.search?.[0]?.description,
    };
  }

  const qid = match.id;
  const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=${qid}&languages=ja|en&props=labels|descriptions|sitelinks&origin=*`;
  const payload = await fetchJson<WikidataEntityResponse>(url);
  const entity = payload.entities?.[qid];
  return {
    wikidataId: qid,
    nameJa: pickLocalizedValue(entity?.labels),
    description: pickLocalizedValue(entity?.descriptions) ?? match.description,
    jaWikipediaTitle: entity?.sitelinks?.jawiki?.title,
  };
}

async function fetchWikipediaSummary(title: string): Promise<WikipediaSummaryResult> {
  const url = `https://ja.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const payload = await fetchJson<WikipediaSummaryResponse>(url);
  const imageUrl = payload.originalimage?.source ?? payload.thumbnail?.source;

  return {
    extract: payload.extract,
    articleUrl: payload.content_urls?.desktop?.page,
    heroImage: imageUrl && payload.content_urls?.desktop?.page
      ? {
          imageUrl,
          pageUrl: payload.content_urls.desktop.page,
          title: payload.title ?? title,
          source: 'wikipedia-ja',
          attribution: 'Japanese Wikipedia',
        }
      : undefined,
  };
}

async function fetchJapaneseWikipediaSummary(
  seed: SeedDinosaur,
  localizedName?: string,
  jaWikipediaTitle?: string,
): Promise<WikipediaSummaryResult | undefined> {
  const candidates = [seed.fallbackNameJa, localizedName, jaWikipediaTitle, seed.scientificName]
    .filter((value): value is string => Boolean(value?.trim()))
    .filter((value, index, values) => values.indexOf(value) === index);

  for (const candidate of candidates) {
    const summary = await fetchWikipediaSummary(candidate).catch(() => undefined);
    if (summary?.extract) {
      return summary;
    }
  }

  return undefined;
}

async function fetchPbdbTaxon(name: string): Promise<PbdbTaxonRecord | undefined> {
  const url = `https://paleobiodb.org/data1.2/taxa/single.json?name=${encodeURIComponent(name)}&show=attr,app&vocab=pbdb`;
  const payload = await fetchJson<PbdbTaxonResponse>(url);
  return payload.records?.[0];
}

async function fetchPbdbOccurrences(name: string): Promise<PbdbOccurrenceRecord[]> {
  const url = `https://paleobiodb.org/data1.2/occs/list.json?base_name=${encodeURIComponent(name)}&show=loc,time,strat,ident,coords&vocab=pbdb&limit=8`;
  const payload = await fetchJson<PbdbOccurrenceResponse>(url);
  return payload.records ?? [];
}

async function fetchPbdbReference(referenceNo: string): Promise<PbdbReferenceRecord | undefined> {
  const url = `https://paleobiodb.org/data1.2/refs/single.json?id=ref:${encodeURIComponent(referenceNo)}&vocab=pbdb`;
  const payload = await fetchJson<PbdbReferenceResponse>(url);
  return payload.records?.[0];
}

async function fetchCrossrefWork(doi: string): Promise<CrossrefWorkResponse['message'] | undefined> {
  const url = `https://api.crossref.org/works/${encodeURIComponent(doi)}`;
  const payload = await fetchJson<CrossrefWorkResponse>(url);
  return payload.message;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`External request failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

function pickLocalizedValue(record?: Record<string, { value: string }>): string | undefined {
  return record?.ja?.value ?? record?.en?.value;
}

function formatCrossrefAuthors(authors?: CrossrefAuthor[]): string | undefined {
  const names = authors
    ?.map((author: CrossrefAuthor) => [author.family, author.given].filter(Boolean).join(' ').trim())
    .filter(Boolean);

  if (!names || names.length === 0) {
    return undefined;
  }

  return names.join(', ');
}

function formatDietLabel(diet: SeedDinosaur['diet']): string {
  if (diet === 'Carnivore') {
    return '肉食';
  }
  if (diet === 'Herbivore') {
    return '草食';
  }
  return '雑食';
}

function formatSubgroupLabel(subgroup: string, clade: SeedDinosaur['clade']): string {
  const value = subgroup.toLowerCase();

  if (value.includes('theropoda')) {
    return '獣脚類';
  }
  if (value.includes('sauropodomorpha')) {
    return '竜脚形類';
  }
  if (value.includes('ceratopsia')) {
    return '角竜類';
  }
  if (value.includes('hadrosauridae')) {
    return 'ハドロサウルス科';
  }
  if (value.includes('ankylosauria')) {
    return '鎧竜類';
  }
  if (value.includes('stegosauria')) {
    return '剣竜類';
  }
  if (value.includes('ornithopoda')) {
    return '鳥脚類';
  }
  if (value.includes('pachycephalosauria')) {
    return '堅頭竜類';
  }

  return clade === 'Saurischia' ? '竜盤類' : '鳥盤類';
}

function formatRegionLabel(region: string): string {
  const value = region.toLowerCase();

  if (value.includes('north america')) {
    return '北アメリカ';
  }
  if (value.includes('south america')) {
    return '南アメリカ';
  }
  if (value.includes('europe')) {
    return 'ヨーロッパ';
  }
  if (value.includes('asia')) {
    return 'アジア';
  }
  if (value.includes('africa')) {
    return 'アフリカ';
  }
  if (value.includes('oceania') || value.includes('australia')) {
    return 'オーストラリア';
  }
  if (value.includes('antarctica')) {
    return '南極';
  }

  return region;
}

function readCrossrefYear(message?: CrossrefMessage): number | undefined {
  const year = message?.published?.['date-parts']?.[0]?.[0]
    ?? message?.['published-print']?.['date-parts']?.[0]?.[0]
    ?? message?.['published-online']?.['date-parts']?.[0]?.[0];

  return typeof year === 'number' ? year : undefined;
}

app.listen(port, () => {
  console.log(`backend listening on ${port}`);
});