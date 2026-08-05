/**
 * 全恐竜の説明文・豆知識を Claude Haiku で一括生成するスクリプト。
 * 実行: npm run generate --workspace backend
 *
 * 環境変数 ANTHROPIC_API_KEY が必要です。
 * 途中で止めても再実行すると未処理分だけ続きを生成します。
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { additionalSeedDinosaurs } from './additionalSeedDinosaurs.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, 'generatedDescriptions.json');

type MinimalSeed = {
  id: string;
  nameJa: string;
  scientificName: string;
  meaning: string;
  diet: 'Carnivore' | 'Herbivore' | 'Omnivore';
  subgroup: string;
  region: string;
  lengthMeters: number;
  massEstimateKg: number;
};

export type GeneratedEntry = {
  ecology: string;
  trivia: string;
};

type GeneratedDescriptions = Record<string, GeneratedEntry>;

// ===== メインの seed リスト (server.ts の seedDinosaurs と同期) =====
const mainSeeds: MinimalSeed[] = [
  { id: 'tyrannosaurus-rex', nameJa: 'ティラノサウルス', scientificName: 'Tyrannosaurus rex', meaning: '暴君トカゲの王', diet: 'Carnivore', subgroup: 'Theropoda', region: 'North America', lengthMeters: 12.3, massEstimateKg: 8000 },
  { id: 'brachiosaurus-altithorax', nameJa: 'ブラキオサウルス', scientificName: 'Brachiosaurus', meaning: '腕トカゲ', diet: 'Herbivore', subgroup: 'Sauropodomorpha', region: 'North America', lengthMeters: 22, massEstimateKg: 35000 },
  { id: 'triceratops-horridus', nameJa: 'トリケラトプス', scientificName: 'Triceratops', meaning: '三本角の顔', diet: 'Herbivore', subgroup: 'Ceratopsia', region: 'North America', lengthMeters: 8.5, massEstimateKg: 8000 },
  { id: 'iguanodon-bernissartensis', nameJa: 'イグアノドン', scientificName: 'Iguanodon', meaning: 'イグアナの歯', diet: 'Herbivore', subgroup: 'Ornithopoda', region: 'Europe', lengthMeters: 10, massEstimateKg: 3500 },
  { id: 'spinosaurus-aegyptiacus', nameJa: 'スピノサウルス', scientificName: 'Spinosaurus', meaning: 'エジプトの棘トカゲ', diet: 'Carnivore', subgroup: 'Theropoda', region: 'North Africa', lengthMeters: 14, massEstimateKg: 7400 },
  { id: 'parasaurolophus-walkeri', nameJa: 'パラサウロロフス', scientificName: 'Parasaurolophus', meaning: '近くの隆起したトカゲ', diet: 'Herbivore', subgroup: 'Hadrosauridae', region: 'North America', lengthMeters: 9.5, massEstimateKg: 2500 },
  { id: 'velociraptor-mongoliensis', nameJa: 'ヴェロキラプトル', scientificName: 'Velociraptor mongoliensis', meaning: '素早い略奪者', diet: 'Carnivore', subgroup: 'Theropoda', region: 'Asia', lengthMeters: 2.1, massEstimateKg: 15 },
  { id: 'allosaurus-fragilis', nameJa: 'アロサウルス', scientificName: 'Allosaurus fragilis', meaning: '異なるトカゲ', diet: 'Carnivore', subgroup: 'Theropoda', region: 'North America', lengthMeters: 9.7, massEstimateKg: 2300 },
  { id: 'carnotaurus-sastrei', nameJa: 'カルノタウルス', scientificName: 'Carnotaurus sastrei', meaning: '肉食の雄牛', diet: 'Carnivore', subgroup: 'Theropoda', region: 'South America', lengthMeters: 8, massEstimateKg: 1500 },
  { id: 'deinonychus-antirrhopus', nameJa: 'デイノニクス', scientificName: 'Deinonychus antirrhopus', meaning: '恐ろしい鉤爪', diet: 'Carnivore', subgroup: 'Theropoda', region: 'North America', lengthMeters: 3.4, massEstimateKg: 80 },
  { id: 'diplodocus-cnegii', nameJa: 'ディプロドクス', scientificName: 'Diplodocus carnegii', meaning: '二重の梁', diet: 'Herbivore', subgroup: 'Sauropodomorpha', region: 'North America', lengthMeters: 24, massEstimateKg: 15000 },
  { id: 'apatosaurus-louisae', nameJa: 'アパトサウルス', scientificName: 'Apatosaurus louisae', meaning: '欺くトカゲ', diet: 'Herbivore', subgroup: 'Sauropodomorpha', region: 'North America', lengthMeters: 21, massEstimateKg: 23000 },
  { id: 'argentinosaurus-huinculensis', nameJa: 'アルゼンチノサウルス', scientificName: 'Argentinosaurus huinculensis', meaning: 'アルゼンチンのトカゲ', diet: 'Herbivore', subgroup: 'Sauropodomorpha', region: 'South America', lengthMeters: 30, massEstimateKg: 65000 },
  { id: 'stegosaurus-stenops', nameJa: 'ステゴサウルス', scientificName: 'Stegosaurus stenops', meaning: '屋根のあるトカゲ', diet: 'Herbivore', subgroup: 'Stegosauria', region: 'North America', lengthMeters: 9, massEstimateKg: 5000 },
  { id: 'ankylosaurus-magniventris', nameJa: 'アンキロサウルス', scientificName: 'Ankylosaurus magniventris', meaning: '癒合したトカゲ', diet: 'Herbivore', subgroup: 'Ankylosauria', region: 'North America', lengthMeters: 6.5, massEstimateKg: 6000 },
  { id: 'protoceratops-andrewsi', nameJa: 'プロトケラトプス', scientificName: 'Protoceratops andrewsi', meaning: '最初の角のある顔', diet: 'Herbivore', subgroup: 'Ceratopsia', region: 'Asia', lengthMeters: 2, massEstimateKg: 180 },
  { id: 'pachycephalosaurus-wyomingensis', nameJa: 'パキケファロサウルス', scientificName: 'Pachycephalosaurus wyomingensis', meaning: '分厚い頭のトカゲ', diet: 'Herbivore', subgroup: 'Pachycephalosauria', region: 'North America', lengthMeters: 4.5, massEstimateKg: 450 },
  { id: 'edmontosaurus-annectens', nameJa: 'エドモントサウルス', scientificName: 'Edmontosaurus annectens', meaning: 'エドモントンのトカゲ', diet: 'Herbivore', subgroup: 'Hadrosauridae', region: 'North America', lengthMeters: 12, massEstimateKg: 4000 },
  { id: 'giganotosaurus-carolinii', nameJa: 'ギガノトサウルス', scientificName: 'Giganotosaurus carolinii', meaning: '巨大な南のトカゲ', diet: 'Carnivore', subgroup: 'Theropoda', region: 'South America', lengthMeters: 13, massEstimateKg: 8000 },
  { id: 'ceratosaurus-nasicornis', nameJa: 'ケラトサウルス', scientificName: 'Ceratosaurus nasicornis', meaning: '角のあるトカゲ', diet: 'Carnivore', subgroup: 'Theropoda', region: 'North America', lengthMeters: 6.7, massEstimateKg: 1000 },
  { id: 'acrocanthosaurus-atokensis', nameJa: 'アクロカントサウルス', scientificName: 'Acrocanthosaurus atokensis', meaning: '高い棘のあるトカゲ', diet: 'Carnivore', subgroup: 'Theropoda', region: 'North America', lengthMeters: 11.5, massEstimateKg: 6200 },
  { id: 'megalosaurus-bucklandii', nameJa: 'メガロサウルス', scientificName: 'Megalosaurus bucklandii', meaning: '大きなトカゲ', diet: 'Carnivore', subgroup: 'Theropoda', region: 'Europe', lengthMeters: 9, massEstimateKg: 1000 },
  { id: 'coelophysis-bauri', nameJa: 'コエロフィシス', scientificName: 'Coelophysis bauri', meaning: '中空の体形', diet: 'Carnivore', subgroup: 'Theropoda', region: 'North America', lengthMeters: 3, massEstimateKg: 20 },
  { id: 'dilophosaurus-wetherilli', nameJa: 'ディロフォサウルス', scientificName: 'Dilophosaurus wetherilli', meaning: '二つの冠を持つトカゲ', diet: 'Carnivore', subgroup: 'Theropoda', region: 'North America', lengthMeters: 7, massEstimateKg: 400 },
  { id: 'oviraptor-philoceratops', nameJa: 'オヴィラプトル', scientificName: 'Oviraptor philoceratops', meaning: '卵泥棒', diet: 'Omnivore', subgroup: 'Theropoda', region: 'Asia', lengthMeters: 2, massEstimateKg: 33 },
  { id: 'troodon-formosus', nameJa: 'トロオドン', scientificName: 'Troodon formosus', meaning: '傷つける歯', diet: 'Carnivore', subgroup: 'Theropoda', region: 'North America', lengthMeters: 2.4, massEstimateKg: 50 },
  { id: 'albertosaurus-sarcophagus', nameJa: 'アルバートサウルス', scientificName: 'Albertosaurus sarcophagus', meaning: 'アルバータのトカゲ', diet: 'Carnivore', subgroup: 'Theropoda', region: 'North America', lengthMeters: 9, massEstimateKg: 2500 },
  { id: 'tarbosaurus-bataar', nameJa: 'タルボサウルス', scientificName: 'Tarbosaurus bataar', meaning: '恐るべきトカゲ', diet: 'Carnivore', subgroup: 'Theropoda', region: 'Asia', lengthMeters: 11, massEstimateKg: 5000 },
  { id: 'concavenator-corcovatus', nameJa: 'コンカヴェナトル', scientificName: 'Concavenator corcovatus', meaning: 'クエンカの狩人', diet: 'Carnivore', subgroup: 'Theropoda', region: 'Europe', lengthMeters: 6, massEstimateKg: 400 },
  { id: 'majungasaurus-creanatissimus', nameJa: 'マジュンガサウルス', scientificName: 'Majungasaurus crenatissimus', meaning: 'マジュンガのトカゲ', diet: 'Carnivore', subgroup: 'Theropoda', region: 'Africa', lengthMeters: 7, massEstimateKg: 1100 },
  { id: 'suchomimus-tenerensis', nameJa: 'スコミムス', scientificName: 'Suchomimus tenerensis', meaning: 'ワニもどき', diet: 'Carnivore', subgroup: 'Theropoda', region: 'Africa', lengthMeters: 11, massEstimateKg: 3500 },
  { id: 'baryonyx-walkeri', nameJa: 'バリオニクス', scientificName: 'Baryonyx walkeri', meaning: '重い鉤爪', diet: 'Carnivore', subgroup: 'Theropoda', region: 'Europe', lengthMeters: 8.5, massEstimateKg: 1700 },
  { id: 'utahraptor-ostrommaysorum', nameJa: 'ユタラプトル', scientificName: 'Utahraptor ostrommaysorum', meaning: 'ユタの略奪者', diet: 'Carnivore', subgroup: 'Theropoda', region: 'North America', lengthMeters: 6, massEstimateKg: 500 },
  { id: 'mononykus-olecranus', nameJa: 'モノニクス', scientificName: 'Mononykus olecranus', meaning: '一本の鉤爪', diet: 'Carnivore', subgroup: 'Theropoda', region: 'Asia', lengthMeters: 1, massEstimateKg: 3 },
  { id: 'therizinosaurus-cheloniformis', nameJa: 'テリジノサウルス', scientificName: 'Therizinosaurus cheloniformis', meaning: '鎌トカゲ', diet: 'Herbivore', subgroup: 'Theropoda', region: 'Asia', lengthMeters: 10, massEstimateKg: 5000 },
  { id: 'compsognathus-longipes', nameJa: 'コンプソグナトゥス', scientificName: 'Compsognathus longipes', meaning: '上品な顎', diet: 'Carnivore', subgroup: 'Theropoda', region: 'Europe', lengthMeters: 1.2, massEstimateKg: 3 },
  { id: 'camarasaurus-supremus', nameJa: 'カマラサウルス', scientificName: 'Camarasaurus supremus', meaning: '部屋のあるトカゲ', diet: 'Herbivore', subgroup: 'Sauropodomorpha', region: 'North America', lengthMeters: 18, massEstimateKg: 20000 },
  { id: 'saltasaurus-loricatus', nameJa: 'サルタサウルス', scientificName: 'Saltasaurus loricatus', meaning: 'サルタのトカゲ', diet: 'Herbivore', subgroup: 'Sauropodomorpha', region: 'South America', lengthMeters: 12, massEstimateKg: 7000 },
  { id: 'patagotitan-mayorum', nameJa: 'パタゴティタン', scientificName: 'Patagotitan mayorum', meaning: 'パタゴニアの巨人', diet: 'Herbivore', subgroup: 'Sauropodomorpha', region: 'South America', lengthMeters: 31, massEstimateKg: 57000 },
  { id: 'mamenchisaurus-youngi', nameJa: 'マメンチサウルス', scientificName: 'Mamenchisaurus youngi', meaning: '馬鳴渓のトカゲ', diet: 'Herbivore', subgroup: 'Sauropodomorpha', region: 'Asia', lengthMeters: 22, massEstimateKg: 26000 },
  { id: 'amargasaurus-cazaui', nameJa: 'アマルガサウルス', scientificName: 'Amargasaurus cazaui', meaning: 'ラ・アマルガのトカゲ', diet: 'Herbivore', subgroup: 'Sauropodomorpha', region: 'South America', lengthMeters: 10, massEstimateKg: 2600 },
  { id: 'euhelopus-zdanskyi', nameJa: 'エウヘロプス', scientificName: 'Euhelopus zdanskyi', meaning: '真の沼の足', diet: 'Herbivore', subgroup: 'Sauropodomorpha', region: 'Asia', lengthMeters: 15, massEstimateKg: 15000 },
  { id: 'shunosaurus-lii', nameJa: 'シュノサウルス', scientificName: 'Shunosaurus lii', meaning: '蜀のトカゲ', diet: 'Herbivore', subgroup: 'Sauropodomorpha', region: 'Asia', lengthMeters: 10, massEstimateKg: 3000 },
  { id: 'opisthocoelicaudia-skarzynskii', nameJa: 'オピストコエリカウディア', scientificName: 'Opisthocoelicaudia skarzynskii', meaning: '後ろが空洞の尾', diet: 'Herbivore', subgroup: 'Sauropodomorpha', region: 'Asia', lengthMeters: 12, massEstimateKg: 11000 },
  { id: 'dreadnoughtus-schrani', nameJa: 'ドレッドノータス', scientificName: 'Dreadnoughtus schrani', meaning: '何ものも恐れない者', diet: 'Herbivore', subgroup: 'Sauropodomorpha', region: 'South America', lengthMeters: 26, massEstimateKg: 49000 },
  { id: 'plateosaurus-engelhardti', nameJa: 'プラテオサウルス', scientificName: 'Plateosaurus engelhardti', meaning: '平らなトカゲ', diet: 'Herbivore', subgroup: 'Sauropodomorpha', region: 'Europe', lengthMeters: 8, massEstimateKg: 2000 },
  { id: 'dryosaurus-altus', nameJa: 'ドリオサウルス', scientificName: 'Dryosaurus altus', meaning: '樹木のトカゲ', diet: 'Herbivore', subgroup: 'Ornithopoda', region: 'North America', lengthMeters: 4, massEstimateKg: 100 },
  { id: 'tenontosaurus-tilletti', nameJa: 'テノントサウルス', scientificName: 'Tenontosaurus tilletti', meaning: '腱のあるトカゲ', diet: 'Herbivore', subgroup: 'Ornithopoda', region: 'North America', lengthMeters: 8, massEstimateKg: 1000 },
  { id: 'leaellynasaura-amicagraphica', nameJa: 'レアエリナサウラ', scientificName: 'Leaellynasaura amicagraphica', meaning: 'リアリーンのトカゲ', diet: 'Herbivore', subgroup: 'Ornithopoda', region: 'Oceania', lengthMeters: 2.3, massEstimateKg: 40 },
  { id: 'ouranosaurus-nigeriensis', nameJa: 'オウラノサウルス', scientificName: 'Ouranosaurus nigeriensis', meaning: '勇敢なトカゲ', diet: 'Herbivore', subgroup: 'Ornithopoda', region: 'Africa', lengthMeters: 7, massEstimateKg: 4000 },
  { id: 'lambeosaurus-lambei', nameJa: 'ランベオサウルス', scientificName: 'Lambeosaurus lambei', meaning: 'ランベのトカゲ', diet: 'Herbivore', subgroup: 'Hadrosauridae', region: 'North America', lengthMeters: 9.5, massEstimateKg: 5000 },
  { id: 'corythosaurus-casuaris', nameJa: 'コリトサウルス', scientificName: 'Corythosaurus casuarius', meaning: '兜をかぶったトカゲ', diet: 'Herbivore', subgroup: 'Hadrosauridae', region: 'North America', lengthMeters: 9, massEstimateKg: 3400 },
  { id: 'hadrosaurus-foulkii', nameJa: 'ハドロサウルス', scientificName: 'Hadrosaurus foulkii', meaning: '頑丈なトカゲ', diet: 'Herbivore', subgroup: 'Hadrosauridae', region: 'North America', lengthMeters: 8, massEstimateKg: 3000 },
  { id: 'styracosaurus-albertensis', nameJa: 'スティラコサウルス', scientificName: 'Styracosaurus albertensis', meaning: '棘のあるトカゲ', diet: 'Herbivore', subgroup: 'Ceratopsia', region: 'North America', lengthMeters: 5.5, massEstimateKg: 3000 },
  { id: 'centrosaurus-apertus', nameJa: 'セントロサウルス', scientificName: 'Centrosaurus apertus', meaning: '尖った角のトカゲ', diet: 'Herbivore', subgroup: 'Ceratopsia', region: 'North America', lengthMeters: 5.5, massEstimateKg: 2500 },
  { id: 'torosaurus-latus', nameJa: 'トロサウルス', scientificName: 'Torosaurus latus', meaning: '穴のあいた顔のトカゲ', diet: 'Herbivore', subgroup: 'Ceratopsia', region: 'North America', lengthMeters: 8, massEstimateKg: 6000 },
  { id: 'pentaceratops-sternbergii', nameJa: 'ペンタケラトプス', scientificName: 'Pentaceratops sternbergii', meaning: '五つの角の顔', diet: 'Herbivore', subgroup: 'Ceratopsia', region: 'North America', lengthMeters: 6, massEstimateKg: 5000 },
  { id: 'psittacosaurus-mongoliensis', nameJa: 'プシッタコサウルス', scientificName: 'Psittacosaurus mongoliensis', meaning: 'オウムトカゲ', diet: 'Herbivore', subgroup: 'Ceratopsia', region: 'Asia', lengthMeters: 2, massEstimateKg: 20 },
  { id: 'stegoceras-validum', nameJa: 'ステゴケラス', scientificName: 'Stegoceras validum', meaning: '屋根のある角', diet: 'Herbivore', subgroup: 'Pachycephalosauria', region: 'North America', lengthMeters: 2.4, massEstimateKg: 40 },
  { id: 'euoplocephalus-tutus', nameJa: 'エウオプロケファルス', scientificName: 'Euoplocephalus tutus', meaning: 'よく武装した頭', diet: 'Herbivore', subgroup: 'Ankylosauria', region: 'North America', lengthMeters: 6, massEstimateKg: 2000 },
  { id: 'daspletosaurus-torosus', nameJa: 'ダスプレトサウルス', scientificName: 'Daspletosaurus torosus', meaning: '恐るべき近縁トカゲ', diet: 'Carnivore', subgroup: 'Theropoda', region: 'North America', lengthMeters: 9, massEstimateKg: 2500 },
  { id: 'carcharodontosaurus-saharicus', nameJa: 'カルカロドントサウルス', scientificName: 'Carcharodontosaurus saharicus', meaning: 'サメの歯を持つトカゲ', diet: 'Carnivore', subgroup: 'Theropoda', region: 'North Africa', lengthMeters: 13, massEstimateKg: 6000 },
  { id: 'sinraptor-dongi', nameJa: 'シンラプトル', scientificName: 'Sinraptor dongi', meaning: '中国の略奪者', diet: 'Carnivore', subgroup: 'Theropoda', region: 'Asia', lengthMeters: 7.5, massEstimateKg: 1000 },
  { id: 'achillobator-giganticus', nameJa: 'アキロバトル', scientificName: 'Achillobator giganticus', meaning: 'アキレスの英雄', diet: 'Carnivore', subgroup: 'Theropoda', region: 'Asia', lengthMeters: 5, massEstimateKg: 300 },
  { id: 'microraptor-gui', nameJa: 'ミクロラプトル', scientificName: 'Microraptor gui', meaning: '小さな略奪者', diet: 'Carnivore', subgroup: 'Theropoda', region: 'Asia', lengthMeters: 0.8, massEstimateKg: 1 },
  { id: 'deinocheirus-mirificus', nameJa: 'デイノケイルス', scientificName: 'Deinocheirus mirificus', meaning: '恐ろしい手', diet: 'Omnivore', subgroup: 'Theropoda', region: 'Asia', lengthMeters: 11, massEstimateKg: 6000 },
  { id: 'gallimimus-bullatus', nameJa: 'ガリミムス', scientificName: 'Gallimimus bullatus', meaning: 'ニワトリもどき', diet: 'Omnivore', subgroup: 'Theropoda', region: 'Asia', lengthMeters: 6, massEstimateKg: 450 },
  { id: 'ornithomimus-velox', nameJa: 'オルニトミムス', scientificName: 'Ornithomimus velox', meaning: '鳥のまねをする者', diet: 'Omnivore', subgroup: 'Theropoda', region: 'North America', lengthMeters: 3.8, massEstimateKg: 170 },
  { id: 'dromaeosaurus-albertensis', nameJa: 'ドロマエオサウルス', scientificName: 'Dromaeosaurus albertensis', meaning: '走るトカゲ', diet: 'Carnivore', subgroup: 'Theropoda', region: 'North America', lengthMeters: 2, massEstimateKg: 15 },
  { id: 'cryolophosaurus-ellioti', nameJa: 'クリオロフォサウルス', scientificName: 'Cryolophosaurus ellioti', meaning: '冷たい冠のトカゲ', diet: 'Carnivore', subgroup: 'Theropoda', region: 'Antarctica', lengthMeters: 6.5, massEstimateKg: 450 },
  { id: 'herrerasaurus-ischigualastensis', nameJa: 'ヘレラサウルス', scientificName: 'Herrerasaurus ischigualastensis', meaning: 'ヘレラのトカゲ', diet: 'Carnivore', subgroup: 'Theropoda', region: 'South America', lengthMeters: 6, massEstimateKg: 350 },
  { id: 'eoraptor-lunensis', nameJa: 'エオラプトル', scientificName: 'Eoraptor lunensis', meaning: '夜明けの略奪者', diet: 'Omnivore', subgroup: 'Theropoda', region: 'South America', lengthMeters: 1, massEstimateKg: 10 },
  { id: 'yangchuanosaurus-shangyouensis', nameJa: 'ヤンチュアノサウルス', scientificName: 'Yangchuanosaurus shangyouensis', meaning: '永川のトカゲ', diet: 'Carnivore', subgroup: 'Theropoda', region: 'Asia', lengthMeters: 10, massEstimateKg: 3400 },
  { id: 'rugops-primus', nameJa: 'ルゴプス', scientificName: 'Rugops primus', meaning: 'しわだらけの顔', diet: 'Carnivore', subgroup: 'Theropoda', region: 'Africa', lengthMeters: 6, massEstimateKg: 750 },
  { id: 'mapusaurus-roseae', nameJa: 'マプサウルス', scientificName: 'Mapusaurus roseae', meaning: '大地のトカゲ', diet: 'Carnivore', subgroup: 'Theropoda', region: 'South America', lengthMeters: 12, massEstimateKg: 4500 },
  { id: 'torvosaurus-tanneri', nameJa: 'トルヴォサウルス', scientificName: 'Torvosaurus tanneri', meaning: '獰猛なトカゲ', diet: 'Carnivore', subgroup: 'Theropoda', region: 'North America', lengthMeters: 10, massEstimateKg: 2000 },
  { id: 'europasaurus-holgeri', nameJa: 'エウロパサウルス', scientificName: 'Europasaurus holgeri', meaning: 'ヨーロッパのトカゲ', diet: 'Herbivore', subgroup: 'Sauropodomorpha', region: 'Europe', lengthMeters: 6.2, massEstimateKg: 800 },
  { id: 'vulcanodon-karibaensis', nameJa: 'ヴルカノドン', scientificName: 'Vulcanodon karibaensis', meaning: '火山の歯', diet: 'Herbivore', subgroup: 'Sauropodomorpha', region: 'Africa', lengthMeters: 6.5, massEstimateKg: 3500 },
  { id: 'rapetosaurus-krausei', nameJa: 'ラペトサウルス', scientificName: 'Rapetosaurus krausei', meaning: 'いたずら好きのトカゲ', diet: 'Herbivore', subgroup: 'Sauropodomorpha', region: 'Africa', lengthMeters: 15, massEstimateKg: 10000 },
  { id: 'alamosaurus-sanjuanensis', nameJa: 'アラモサウルス', scientificName: 'Alamosaurus sanjuanensis', meaning: 'アラモのトカゲ', diet: 'Herbivore', subgroup: 'Sauropodomorpha', region: 'North America', lengthMeters: 27, massEstimateKg: 30000 },
  { id: 'giraffatitan-brancai', nameJa: 'ギラッファティタン', scientificName: 'Giraffatitan brancai', meaning: 'キリンの巨人', diet: 'Herbivore', subgroup: 'Sauropodomorpha', region: 'Africa', lengthMeters: 23, massEstimateKg: 35000 },
  { id: 'mussaurus-patagonicus', nameJa: 'ムッサウルス', scientificName: 'Mussaurus patagonicus', meaning: 'ネズミトカゲ', diet: 'Herbivore', subgroup: 'Sauropodomorpha', region: 'South America', lengthMeters: 6, massEstimateKg: 1000 },
  { id: 'isisaurus-colberti', nameJa: 'イシサウルス', scientificName: 'Isisaurus colberti', meaning: 'インド統計研究所のトカゲ', diet: 'Herbivore', subgroup: 'Sauropodomorpha', region: 'Asia', lengthMeters: 18, massEstimateKg: 15000 },
  { id: 'cedarosaurus-weiskopfae', nameJa: 'シーダロサウルス', scientificName: 'Cedarosaurus weiskopfae', meaning: 'シーダー山のトカゲ', diet: 'Herbivore', subgroup: 'Sauropodomorpha', region: 'North America', lengthMeters: 16, massEstimateKg: 9000 },
  { id: 'kentrosaurus-aethiopicus', nameJa: 'ケントロサウルス', scientificName: 'Kentrosaurus aethiopicus', meaning: '尖ったトカゲ', diet: 'Herbivore', subgroup: 'Stegosauria', region: 'Africa', lengthMeters: 4.5, massEstimateKg: 1200 },
  { id: 'huayangosaurus-taibaii', nameJa: 'フアヤンゴサウルス', scientificName: 'Huayangosaurus taibaii', meaning: '華陽のトカゲ', diet: 'Herbivore', subgroup: 'Stegosauria', region: 'Asia', lengthMeters: 4.5, massEstimateKg: 1000 },
  { id: 'miragaia-longicollum', nameJa: 'ミラガイア', scientificName: 'Miragaia longicollum', meaning: '長い首を持つミラガイア', diet: 'Herbivore', subgroup: 'Stegosauria', region: 'Europe', lengthMeters: 6, massEstimateKg: 2000 },
  { id: 'sauropelta-edwardsorum', nameJa: 'サウロペルタ', scientificName: 'Sauropelta edwardsorum', meaning: 'トカゲの盾', diet: 'Herbivore', subgroup: 'Ankylosauria', region: 'North America', lengthMeters: 5.2, massEstimateKg: 1500 },
  { id: 'borealopelta-markmitchelli', nameJa: 'ボレアロペルタ', scientificName: 'Borealopelta markmitchelli', meaning: '北の盾', diet: 'Herbivore', subgroup: 'Ankylosauria', region: 'North America', lengthMeters: 5.5, massEstimateKg: 1300 },
  { id: 'nodosaurus-textilis', nameJa: 'ノドサウルス', scientificName: 'Nodosaurus textilis', meaning: '節くれだったトカゲ', diet: 'Herbivore', subgroup: 'Ankylosauria', region: 'North America', lengthMeters: 6, massEstimateKg: 3500 },
  { id: 'chasmosaurus-belli', nameJa: 'カスモサウルス', scientificName: 'Chasmosaurus belli', meaning: '裂け目のあるトカゲ', diet: 'Herbivore', subgroup: 'Ceratopsia', region: 'North America', lengthMeters: 5, massEstimateKg: 1500 },
  { id: 'kosmoceratops-richardsoni', nameJa: 'コスモケラトプス', scientificName: 'Kosmoceratops richardsoni', meaning: '飾られた角の顔', diet: 'Herbivore', subgroup: 'Ceratopsia', region: 'North America', lengthMeters: 4.5, massEstimateKg: 1200 },
  { id: 'einiosaurus-procurvicornis', nameJa: 'エイニオサウルス', scientificName: 'Einiosaurus procurvicornis', meaning: '水牛のようなトカゲ', diet: 'Herbivore', subgroup: 'Ceratopsia', region: 'North America', lengthMeters: 4.5, massEstimateKg: 1300 },
  { id: 'leptoceratops-gracilis', nameJa: 'レプトケラトプス', scientificName: 'Leptoceratops gracilis', meaning: '小さな角の顔', diet: 'Herbivore', subgroup: 'Ceratopsia', region: 'North America', lengthMeters: 2, massEstimateKg: 200 },
  { id: 'prenocephale-prenes', nameJa: 'プレノケファレ', scientificName: 'Prenocephale prenes', meaning: '傾いた頭', diet: 'Herbivore', subgroup: 'Pachycephalosauria', region: 'Asia', lengthMeters: 2, massEstimateKg: 40 },
  { id: 'homalocephale-calathocercos', nameJa: 'ホマロケファレ', scientificName: 'Homalocephale calathocercos', meaning: '平たい頭', diet: 'Herbivore', subgroup: 'Pachycephalosauria', region: 'Asia', lengthMeters: 1.8, massEstimateKg: 30 },
  { id: 'hypsilophodon-foxii', nameJa: 'ヒプシロフォドン', scientificName: 'Hypsilophodon foxii', meaning: '高い稜を持つ歯', diet: 'Herbivore', subgroup: 'Ornithopoda', region: 'Europe', lengthMeters: 2.3, massEstimateKg: 20 },
  { id: 'lesothosaurus-diagnosticus', nameJa: 'レソトサウルス', scientificName: 'Lesothosaurus diagnosticus', meaning: 'レソトのトカゲ', diet: 'Herbivore', subgroup: 'Ornithopoda', region: 'Africa', lengthMeters: 1, massEstimateKg: 10 },
  { id: 'maiasaura-peeblesorum', nameJa: 'マイアサウラ', scientificName: 'Maiasaura peeblesorum', meaning: 'よい母トカゲ', diet: 'Herbivore', subgroup: 'Hadrosauridae', region: 'North America', lengthMeters: 9, massEstimateKg: 2500 },
  { id: 'gryposaurus-notabilis', nameJa: 'グリポサウルス', scientificName: 'Gryposaurus notabilis', meaning: '鉤鼻のトカゲ', diet: 'Herbivore', subgroup: 'Hadrosauridae', region: 'North America', lengthMeters: 8, massEstimateKg: 3000 },
];

// ===== additionalSeedDinosaurs から変換 =====
const additionalSeeds: MinimalSeed[] = additionalSeedDinosaurs.map((s) => ({
  id: s.id,
  nameJa: s.fallbackNameJa,
  scientificName: s.scientificName,
  meaning: s.meaning,
  diet: s.diet,
  subgroup: s.subgroup,
  region: s.region,
  lengthMeters: s.lengthMeters,
  massEstimateKg: s.massEstimateKg,
}));

const allSeeds: MinimalSeed[] = [...mainSeeds, ...additionalSeeds];

// ===== ユーティリティ =====

function loadExisting(): GeneratedDescriptions {
  try {
    return JSON.parse(readFileSync(OUTPUT_PATH, 'utf-8')) as GeneratedDescriptions;
  } catch {
    return {};
  }
}

function save(data: GeneratedDescriptions): void {
  writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function dietLabel(diet: MinimalSeed['diet']): string {
  if (diet === 'Carnivore') return '肉食性';
  if (diet === 'Herbivore') return '草食性';
  return '雑食性';
}

function subgroupLabel(subgroup: string): string {
  const v = subgroup.toLowerCase();
  if (v.includes('theropoda')) return '獣脚類';
  if (v.includes('sauropodomorpha')) return '竜脚形類';
  if (v.includes('ceratopsia')) return '角竜類';
  if (v.includes('hadrosauridae')) return 'ハドロサウルス科';
  if (v.includes('ankylosauria')) return '鎧竜類';
  if (v.includes('stegosauria')) return '剣竜類';
  if (v.includes('ornithopoda')) return '鳥脚類';
  if (v.includes('pachycephalosauria')) return '堅頭竜類';
  return subgroup;
}

// ===== Claude API 呼び出し =====

async function generate(client: Anthropic, seed: MinimalSeed): Promise<GeneratedEntry> {
  const massT = (seed.massEstimateKg / 1000).toFixed(1);
  const prompt = `あなたは古生物学の専門家で、中高生向けの恐竜図鑑の執筆者です。

以下の恐竜について正確な情報に基づいて説明を書いてください。

名前: ${seed.nameJa}（${seed.scientificName}）
学名の意味: ${seed.meaning}
分類: ${subgroupLabel(seed.subgroup)}
食性: ${dietLabel(seed.diet)}
体長: 約${seed.lengthMeters}m / 体重: 約${massT}t
産地: ${seed.region}

必ず下記のJSON形式だけで出力してください（前置き・後文は不要）：
{
  "ecology": "生態と特徴の説明（150〜200文字。です・ます調。この恐竜ならではの体の特徴・狩り方・生態・環境適応などを具体的に）",
  "trivia": "豆知識（80〜120文字。「実は」「意外にも」「〜で有名な」などで始まる、研究史・命名エピソード・他の動物との比較など面白い情報）"
}`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error(`No JSON in response: ${text.slice(0, 100)}`);
  }
  return JSON.parse(match[0]) as GeneratedEntry;
}

// ===== メイン =====

async function main(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is not set.');
    process.exit(1);
  }

  const client = new Anthropic();
  const existing = loadExisting();
  const toProcess = allSeeds.filter((s) => !existing[s.id]);

  console.log(`Total: ${allSeeds.length} / Already done: ${Object.keys(existing).length} / Remaining: ${toProcess.length}`);

  if (toProcess.length === 0) {
    console.log('All descriptions already generated!');
    return;
  }

  let successCount = 0;
  let errorCount = 0;

  for (const seed of toProcess) {
    process.stdout.write(`[${successCount + errorCount + 1}/${toProcess.length}] ${seed.nameJa} ... `);
    try {
      const entry = await generate(client, seed);
      existing[seed.id] = entry;
      save(existing);
      console.log('OK');
      successCount++;
    } catch (error) {
      console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
      errorCount++;
    }
    // レート制限対策
    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  console.log(`\nDone. Success: ${successCount} / Error: ${errorCount}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
