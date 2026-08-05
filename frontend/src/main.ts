import './styles.css';

type GeoPoint = {
  lat: number;
  lng: number;
};

type LocalitySummary = {
  label: string;
  country: string;
  formation: string;
  age: string;
  coordinates: GeoPoint;
};


type ImageAsset = {
  imageUrl: string;
  pageUrl: string;
  title: string;
  source: 'wikipedia-ja' | 'wikipedia-en' | 'wikidata-commons' | 'dinoapi';
  attribution: string;
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

type LocalityDetail = LocalitySummary & {
  note: string;
};

type DinosaurDetail = Omit<DinosaurSummary, 'localities'> & {
  detailedDescription: string;
  trivia?: string;
  gallery: ImageAsset[];
  ageMa: string;
  lengthMeters: number;
  massEstimateKg: number;
  significance: string;
  localities: LocalityDetail[];
  references: ReferenceEntry[];
};

type NotebookRecord = DinosaurDetail & {
  eraLabel: EraOption;
  continentLabel: ContinentOption;
  dietLabel: DietOption;
  classificationLabel: ClassificationOption;
  noteText: string;
  tags: string[];
};

type EraOption =
  | 'すべて'
  | '三畳紀'
  | 'ジュラ紀前期'
  | 'ジュラ紀後期'
  | '白亜紀前期'
  | '白亜紀後期';

type ContinentOption =
  | 'すべて'
  | '北アメリカ'
  | '南アメリカ'
  | 'ヨーロッパ'
  | 'アジア'
  | 'アフリカ'
  | 'オーストラリア'
  | '南極';

type DietOption = 'すべて' | '肉食' | '草食' | '雑食';

type ClassificationOption =
  | 'すべて'
  | '獣脚類'
  | '竜脚類'
  | '鳥盤類'
  | '剣竜類'
  | '角竜類'
  | '鎧竜類'
  | '鴨嘴竜類';

type Filters = {
  keyword: string;
  era: EraOption;
  continent: ContinentOption;
  diet: DietOption;
  classification: ClassificationOption;
  maxLength: number;
};

const ERA_OPTIONS: EraOption[] = ['すべて', '三畳紀', 'ジュラ紀前期', 'ジュラ紀後期', '白亜紀前期', '白亜紀後期'];
const CONTINENT_OPTIONS: ContinentOption[] = ['すべて', '北アメリカ', '南アメリカ', 'ヨーロッパ', 'アジア', 'アフリカ', 'オーストラリア', '南極'];
const DIET_OPTIONS: DietOption[] = ['すべて', '肉食', '草食', '雑食'];
const CLASSIFICATION_OPTIONS: ClassificationOption[] = ['すべて', '獣脚類', '竜脚類', '鳥盤類', '剣竜類', '角竜類', '鎧竜類', '鴨嘴竜類'];
const CARD_ROTATIONS = ['-0.4deg', '0.55deg', '-0.65deg', '0.35deg', '-0.3deg', '0.7deg'];
const TAG_ROTATIONS = ['-0.8deg', '0.7deg', '-0.5deg', '0.6deg'];
const DETAIL_QUERY_KEY = 'record';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('App root was not found.');
}

// ===================== SPLASH SCREEN =====================

function renderFootprintSvg(): string {
  return `<svg width="22" height="28" viewBox="0 0 22 28" aria-hidden="true">
    <path d="M11 28 L9.5 19 L9 13 L10 3 L11 1 L12 3 L13 13 L12.5 19 Z" fill="currentColor"/>
    <path d="M9.5 22 L4.5 17.5 L2 12 L3 10.5 L4.5 11.5 L7 16.5 L9 21 Z" fill="currentColor" opacity="0.85"/>
    <path d="M12.5 22 L17.5 17.5 L20 12 L19 10.5 L17.5 11.5 L15 16.5 L13 21 Z" fill="currentColor" opacity="0.85"/>
  </svg>`;
}

function renderSplashWave(dashed: boolean): string {
  const dash = dashed ? ' stroke-dasharray="4,3"' : '';
  return `<svg viewBox="0 0 620 12" preserveAspectRatio="none"><path d="M0,6 C30,1 60,11 90,6 C120,1 150,11 180,6 C210,1 240,11 270,6 C300,1 330,11 360,6 C390,1 420,11 450,6 C480,1 510,11 540,6 C570,1 600,11 620,6" stroke="#8A6030" stroke-width="${dashed ? '1' : '1.5'}" fill="none" stroke-linecap="round"${dash}/></svg>`;
}

const CLASSIFICATION_SILHOUETTES: Record<ClassificationOption, string> = {
  すべて: '',
  獣脚類: `<svg viewBox="0 0 280 140" fill="none" aria-hidden="true">
    <path d="M172 80 C197 72 218 62 233 52 C239 47 237 44 232 49 C226 55 206 66 175 76" fill="currentColor" opacity="0.8"/>
    <ellipse cx="115" cy="88" rx="60" ry="35" fill="currentColor"/>
    <path d="M85 63 C79 46 81 33 90 22" stroke="currentColor" stroke-width="15" stroke-linecap="round" fill="none"/>
    <path d="M82 24 C86 14 97 9 109 12 C120 9 132 16 138 25 C142 33 138 40 129 42 C118 44 105 44 94 38 C88 34 81 30 82 24Z" fill="currentColor"/>
    <circle cx="110" cy="23" r="3.5" fill="var(--paper,#F2E8D0)"/>
    <path d="M94 96 C89 103 85 110 83 115" stroke="currentColor" stroke-width="6" stroke-linecap="round" fill="none"/>
    <path d="M97 122 L91 105 C89 99 90 93 93 93" stroke="currentColor" stroke-width="11" stroke-linecap="round" fill="none"/>
    <path d="M91 122 L85 131 M91 122 L93 133 M91 122 L99 129" stroke="currentColor" stroke-width="4" stroke-linecap="round" fill="none"/>
    <path d="M133 124 L127 107 C125 101 126 95 129 95" stroke="currentColor" stroke-width="11" stroke-linecap="round" fill="none"/>
    <path d="M127 124 L121 133 M127 124 L129 135 M127 124 L135 131" stroke="currentColor" stroke-width="4" stroke-linecap="round" fill="none"/>
  </svg>`,
  竜脚類: `<svg viewBox="0 0 280 140" fill="none" aria-hidden="true">
    <path d="M205 88 C228 83 250 78 268 73" stroke="currentColor" stroke-width="15" stroke-linecap="round" fill="none"/>
    <ellipse cx="148" cy="90" rx="62" ry="32" fill="currentColor"/>
    <path d="M100 68 C84 47 68 27 52 12" stroke="currentColor" stroke-width="20" stroke-linecap="round" fill="none"/>
    <ellipse cx="43" cy="9" rx="20" ry="10" transform="rotate(-20 43 9)" fill="currentColor"/>
    <path d="M106 116 L104 135" stroke="currentColor" stroke-width="13" stroke-linecap="round" fill="none"/>
    <path d="M128 118 L126 137" stroke="currentColor" stroke-width="13" stroke-linecap="round" fill="none"/>
    <path d="M162 118 L160 137" stroke="currentColor" stroke-width="13" stroke-linecap="round" fill="none"/>
    <path d="M182 116 L180 135" stroke="currentColor" stroke-width="13" stroke-linecap="round" fill="none"/>
  </svg>`,
  鳥盤類: `<svg viewBox="0 0 280 140" fill="none" aria-hidden="true">
    <path d="M168 84 C190 77 210 68 224 58 C230 53 228 50 223 55 C217 61 197 72 170 80" fill="currentColor" opacity="0.8"/>
    <ellipse cx="112" cy="90" rx="58" ry="33" fill="currentColor"/>
    <path d="M82 66 C76 50 77 36 84 24" stroke="currentColor" stroke-width="15" stroke-linecap="round" fill="none"/>
    <path d="M74 26 C78 15 90 10 103 13 C116 10 127 17 131 27 C127 37 113 42 100 40 C88 42 76 36 74 26Z" fill="currentColor"/>
    <path d="M88 98 C83 105 79 112 77 116" stroke="currentColor" stroke-width="7" stroke-linecap="round" fill="none"/>
    <path d="M96 122 L90 105" stroke="currentColor" stroke-width="12" stroke-linecap="round" fill="none"/>
    <path d="M90 122 L84 130 M90 122 L92 131 M90 122 L98 128" stroke="currentColor" stroke-width="4" stroke-linecap="round" fill="none"/>
    <path d="M128 124 L122 106" stroke="currentColor" stroke-width="12" stroke-linecap="round" fill="none"/>
    <path d="M122 124 L116 132 M122 124 L124 133 M122 124 L130 130" stroke="currentColor" stroke-width="4" stroke-linecap="round" fill="none"/>
  </svg>`,
  剣竜類: `<svg viewBox="0 0 280 140" fill="none" aria-hidden="true">
    <path d="M85 92 L77 64 L87 73Z" fill="currentColor" opacity="0.85"/>
    <path d="M106 85 L96 50 L110 63Z" fill="currentColor" opacity="0.85"/>
    <path d="M128 80 L118 40 L134 57Z" fill="currentColor" opacity="0.85"/>
    <path d="M150 82 L140 44 L156 60Z" fill="currentColor" opacity="0.85"/>
    <path d="M170 86 L164 55 L176 68Z" fill="currentColor" opacity="0.85"/>
    <path d="M188 92 L184 68 L194 78Z" fill="currentColor" opacity="0.85"/>
    <ellipse cx="148" cy="100" rx="80" ry="28" fill="currentColor"/>
    <path d="M64 106 C58 98 55 90 60 84 C66 78 76 78 82 84 C88 90 88 98 82 104 C78 110 70 110 64 106Z" fill="currentColor"/>
    <path d="M225 94 L244 77 M228 98 L249 87 M228 102 L249 102 M225 106 L243 118" stroke="currentColor" stroke-width="5" stroke-linecap="round" fill="none"/>
    <path d="M90 122 L88 138" stroke="currentColor" stroke-width="11" stroke-linecap="round" fill="none"/>
    <path d="M112 124 L110 140" stroke="currentColor" stroke-width="11" stroke-linecap="round" fill="none"/>
    <path d="M175 124 L173 140" stroke="currentColor" stroke-width="12" stroke-linecap="round" fill="none"/>
    <path d="M197 122 L195 138" stroke="currentColor" stroke-width="12" stroke-linecap="round" fill="none"/>
  </svg>`,
  角竜類: `<svg viewBox="0 0 280 140" fill="none" aria-hidden="true">
    <path d="M78 60 C68 34 63 17 83 10 C103 4 123 12 128 37 C123 43 107 52 93 58Z" fill="currentColor" opacity="0.75"/>
    <path d="M98 44 L83 14 L91 42Z" fill="currentColor"/>
    <path d="M115 40 L106 14 L118 38Z" fill="currentColor"/>
    <ellipse cx="176" cy="93" rx="70" ry="34" fill="currentColor"/>
    <path d="M112 70 C122 62 137 68 150 75" stroke="currentColor" stroke-width="22" stroke-linecap="round" fill="none"/>
    <path d="M242 90 C260 87 270 82 274 77" stroke="currentColor" stroke-width="12" stroke-linecap="round" fill="none"/>
    <path d="M130 120 L128 137" stroke="currentColor" stroke-width="11" stroke-linecap="round" fill="none"/>
    <path d="M150 122 L148 139" stroke="currentColor" stroke-width="11" stroke-linecap="round" fill="none"/>
    <path d="M196 122 L194 139" stroke="currentColor" stroke-width="12" stroke-linecap="round" fill="none"/>
    <path d="M216 120 L214 137" stroke="currentColor" stroke-width="12" stroke-linecap="round" fill="none"/>
  </svg>`,
  鎧竜類: `<svg viewBox="0 0 280 140" fill="none" aria-hidden="true">
    <path d="M60 102 C62 84 75 74 95 70 C115 66 135 64 155 66 C175 64 195 70 210 76 C225 80 232 90 232 100" fill="currentColor"/>
    <ellipse cx="145" cy="102" rx="90" ry="27" fill="currentColor"/>
    <path d="M78 74 L72 60 M98 68 L94 54 M118 65 L114 51 M138 63 L136 49 M158 64 L156 50 M178 67 L176 53 M198 73 L196 59" stroke="currentColor" stroke-width="5" stroke-linecap="round" fill="none"/>
    <ellipse cx="60" cy="105" rx="26" ry="14" fill="currentColor"/>
    <path d="M230 100 C250 96 267 94 273 99 C276 103 273 107 265 109 C256 110 242 107 230 102" fill="currentColor"/>
    <path d="M88 124 L86 137" stroke="currentColor" stroke-width="10" stroke-linecap="round" fill="none"/>
    <path d="M116 126 L114 139" stroke="currentColor" stroke-width="10" stroke-linecap="round" fill="none"/>
    <path d="M168 126 L166 139" stroke="currentColor" stroke-width="10" stroke-linecap="round" fill="none"/>
    <path d="M195 124 L193 137" stroke="currentColor" stroke-width="10" stroke-linecap="round" fill="none"/>
  </svg>`,
  鴨嘴竜類: `<svg viewBox="0 0 280 140" fill="none" aria-hidden="true">
    <path d="M175 82 C198 74 218 65 232 55 C238 50 236 47 231 52 C225 58 205 69 177 77" fill="currentColor" opacity="0.8"/>
    <ellipse cx="118" cy="90" rx="60" ry="34" fill="currentColor"/>
    <path d="M86 60 C80 46 81 32 88 20 C98 6 113 4 122 17 C114 24 102 38 93 56" fill="currentColor"/>
    <path d="M86 65 C80 49 81 35 88 25" stroke="currentColor" stroke-width="14" stroke-linecap="round" fill="none"/>
    <path d="M76 27 C80 17 91 11 104 14 C117 11 129 17 135 27 C133 35 118 40 105 38 C93 40 79 35 76 27Z" fill="currentColor"/>
    <path d="M76 30 C67 28 59 30 55 34 C57 39 65 39 76 36Z" fill="currentColor"/>
    <path d="M94 98 C89 106 85 113 83 117" stroke="currentColor" stroke-width="6" stroke-linecap="round" fill="none"/>
    <path d="M97 123 L91 106" stroke="currentColor" stroke-width="12" stroke-linecap="round" fill="none"/>
    <path d="M91 123 L85 131 M91 123 L93 132 M91 123 L99 129" stroke="currentColor" stroke-width="4" stroke-linecap="round" fill="none"/>
    <path d="M132 125 L126 107" stroke="currentColor" stroke-width="12" stroke-linecap="round" fill="none"/>
    <path d="M126 125 L120 133 M126 125 L128 134 M126 125 L134 131" stroke="currentColor" stroke-width="4" stroke-linecap="round" fill="none"/>
  </svg>`,
};

function renderClassificationSilhouette(classificationLabel: ClassificationOption): string {
  const svg = CLASSIFICATION_SILHOUETTES[classificationLabel] ?? CLASSIFICATION_SILHOUETTES['獣脚類'];
  return `<div class="dino-silhouette">${svg}</div>`;
}

function mountSplashScreen(): void {
  const splash = document.createElement('div');
  splash.id = 'splash-screen';
  splash.className = 'splash-screen';
  splash.setAttribute('role', 'dialog');
  splash.setAttribute('aria-modal', 'true');
  splash.setAttribute('aria-label', '恐竜図鑑 入口画面');

  splash.innerHTML = `
    <div class="splash-margin-line" aria-hidden="true"></div>
    <div class="splash-wave-top" aria-hidden="true">${renderSplashWave(false)}</div>
    <div class="splash-wave-bottom" aria-hidden="true">${renderSplashWave(true)}</div>
    <div class="splash-content">
      <h1 class="splash-title">恐竜図鑑</h1>
      <p class="splash-sub">野外調査記録 — Field Notes Series I</p>
      <p class="splash-meta">文化祭　展示　2026</p>
      <button class="splash-btn" id="splash-enter-btn" type="button">図鑑をひらく</button>
    </div>
  `;

  document.body.prepend(splash);

  const enterBtn = document.getElementById('splash-enter-btn');
  enterBtn?.addEventListener('click', () => {
    splash.classList.add('is-leaving');
    splash.addEventListener('animationend', () => {
      splash.remove();
    }, { once: true });
  });
}

mountSplashScreen();

// ===================== MAIN APP =====================

app.innerHTML = `
  <div class="field-notes-page">
    <div class="page-margin-line" aria-hidden="true"></div>
    <main class="notes-layout">
      <header class="notes-header">
        <div>
          <h1>恐竜図鑑　野外記録</h1>
          <p class="subtitle">Field Notes — Dinosaur Fossil Records</p>
        </div>
        <p class="header-note">文化祭　展示 / 調査ノート　第一冊</p>
      </header>

      <div class="wave-divider" aria-hidden="true">${renderWave(false)}</div>

      <section id="catalog-view" class="catalog-view">
        <section class="search-panel" aria-label="絞り込み検索">
          <h2>— 絞り込み検索 —</h2>
          <form id="filter-form" class="search-form" autocomplete="off">
            <div class="search-row">
              <label class="search-block search-keyword">
                <span>キーワード</span>
                <div class="search-inline">
                  <input id="keyword-input" name="keyword" type="text" placeholder="恐竜の名前を入力…" autocomplete="off" />
                  <button type="submit">検　索</button>
                </div>
              </label>
            </div>

            <div class="filter-grid">
              <label class="search-block">
                <span>時代</span>
                <select id="era-select" name="era"></select>
              </label>

              <label class="search-block">
                <span>産地・大陸</span>
                <select id="continent-select" name="continent"></select>
              </label>

              <label class="search-block">
                <span>食性</span>
                <select id="diet-select" name="diet"></select>
              </label>

              <label class="search-block">
                <span>分類</span>
                <select id="classification-select" name="classification"></select>
              </label>

              <label class="search-block search-range">
                <span>大きさ（体長）</span>
                <input id="length-range" name="maxLength" type="range" min="0" max="40" step="1" value="40" />
                <strong id="range-value">0m 〜 40m</strong>
              </label>
            </div>
          </form>
        </section>

        <div class="wave-divider wave-divider-dashed" aria-hidden="true">${renderWave(true)}</div>

        <section class="catalog-section" aria-label="恐竜カード一覧">
          <div class="catalog-headline">
            <h2 id="catalog-title">— 図鑑　全0種 —</h2>
            <p id="result-count">検索結果 0件</p>
          </div>
          <div class="random-btn-wrap">
            <button type="button" class="random-btn" id="random-btn">ランダムで見る</button>
          </div>
          <p id="result-status" class="result-status">調査記録を読み込み中です。</p>
          <div id="catalog-grid" class="catalog-grid"></div>
        </section>
      </section>

      <section id="detail-view" class="detail-view is-hidden" aria-live="polite"></section>

      <footer class="notes-footer">
        <p>記録者：___________　調査日：___________</p>
        <p>Field Notes — Fossil Record Series</p>
      </footer>
    </main>
    <p class="page-number">p. 01</p>
  </div>
`;

const ui = {
  catalogView: document.querySelector<HTMLElement>('#catalog-view'),
  detailView: document.querySelector<HTMLElement>('#detail-view'),
  form: document.querySelector<HTMLFormElement>('#filter-form'),
  keywordInput: document.querySelector<HTMLInputElement>('#keyword-input'),
  eraSelect: document.querySelector<HTMLSelectElement>('#era-select'),
  continentSelect: document.querySelector<HTMLSelectElement>('#continent-select'),
  dietSelect: document.querySelector<HTMLSelectElement>('#diet-select'),
  classificationSelect: document.querySelector<HTMLSelectElement>('#classification-select'),
  lengthRange: document.querySelector<HTMLInputElement>('#length-range'),
  rangeValue: document.querySelector<HTMLElement>('#range-value'),
  catalogTitle: document.querySelector<HTMLElement>('#catalog-title'),
  resultCount: document.querySelector<HTMLElement>('#result-count'),
  resultStatus: document.querySelector<HTMLElement>('#result-status'),
  catalogGrid: document.querySelector<HTMLElement>('#catalog-grid'),
  randomBtn: document.querySelector<HTMLButtonElement>('#random-btn'),
};

if (
  !ui.catalogView ||
  !ui.detailView ||
  !ui.form ||
  !ui.keywordInput ||
  !ui.eraSelect ||
  !ui.continentSelect ||
  !ui.dietSelect ||
  !ui.classificationSelect ||
  !ui.lengthRange ||
  !ui.rangeValue ||
  !ui.catalogTitle ||
  !ui.resultCount ||
  !ui.resultStatus ||
  !ui.catalogGrid ||
  !ui.randomBtn
) {
  throw new Error('Required UI elements are missing.');
}

const uiElements = {
  catalogView: ui.catalogView,
  detailView: ui.detailView,
  form: ui.form,
  keywordInput: ui.keywordInput,
  eraSelect: ui.eraSelect,
  continentSelect: ui.continentSelect,
  dietSelect: ui.dietSelect,
  classificationSelect: ui.classificationSelect,
  lengthRange: ui.lengthRange,
  rangeValue: ui.rangeValue,
  catalogTitle: ui.catalogTitle,
  resultCount: ui.resultCount,
  resultStatus: ui.resultStatus,
  catalogGrid: ui.catalogGrid,
  randomBtn: ui.randomBtn,
};

const state: {
  records: NotebookRecord[];
  filteredRecords: NotebookRecord[];
  selectedRecordId: string | null;
  filters: Filters;
} = {
  records: [],
  filteredRecords: [],
  selectedRecordId: null,
  filters: {
    keyword: '',
    era: 'すべて',
    continent: 'すべて',
    diet: 'すべて',
    classification: 'すべて',
    maxLength: 40,
  },
};

function renderWave(dashed: boolean): string {
  const dash = dashed ? ' stroke-dasharray="4,3"' : '';
  return `<svg viewBox="0 0 620 12" preserveAspectRatio="none"><path d="M0,6 C30,1 60,11 90,6 C120,1 150,11 180,6 C210,1 240,11 270,6 C300,1 330,11 360,6 C390,1 420,11 450,6 C480,1 510,11 540,6 C570,1 600,11 620,6" stroke="#8A6030" stroke-width="${dashed ? '1' : '1.5'}" fill="none" stroke-linecap="round"${dash}/></svg>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function fetchDinosaurs(): Promise<DinosaurSummary[]> {
  const response = await fetch('/api/dinosaurs');
  if (!response.ok) {
    throw new Error('恐竜一覧の取得に失敗しました。');
  }
  return (await response.json()) as DinosaurSummary[];
}

async function fetchDetail(id: string): Promise<DinosaurDetail> {
  const response = await fetch(`/api/dinosaurs/${encodeURIComponent(id)}`);
  if (!response.ok) {
    throw new Error('恐竜詳細の取得に失敗しました。');
  }
  return (await response.json()) as DinosaurDetail;
}

function populateSelect(select: HTMLSelectElement, options: string[]): void {
  select.innerHTML = options
    .map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`)
    .join('');
}

function mapPeriodToEra(period: string): EraOption {
  const value = period.toLowerCase();

  if (value.includes('norian') || value.includes('rhaetian')) {
    return '三畳紀';
  }

  if (value.includes('hettangian') || value.includes('pliensbachian')) {
    return 'ジュラ紀前期';
  }

  if (
    value.includes('aalenian') ||
    value.includes('bajocian') ||
    value.includes('bathonian') ||
    value.includes('callovian') ||
    value.includes('oxfordian') ||
    value.includes('kimmeridgian') ||
    value.includes('tithonian')
  ) {
    return 'ジュラ紀後期';
  }

  if (
    value.includes('berriasian') ||
    value.includes('valanginian') ||
    value.includes('barremian') ||
    value.includes('aptian') ||
    value.includes('albian')
  ) {
    return '白亜紀前期';
  }

  return '白亜紀後期';
}

function mapRegionToContinent(region: string): ContinentOption {
  const normalized = region.toLowerCase();

  if (normalized.includes('north america')) {
    return '北アメリカ';
  }
  if (normalized.includes('south america')) {
    return '南アメリカ';
  }
  if (normalized.includes('europe')) {
    return 'ヨーロッパ';
  }
  if (normalized.includes('asia')) {
    return 'アジア';
  }
  if (normalized.includes('africa')) {
    return 'アフリカ';
  }
  if (normalized.includes('oceania') || normalized.includes('australia')) {
    return 'オーストラリア';
  }
  if (normalized.includes('antarctica')) {
    return '南極';
  }
  return 'すべて';
}

function mapDiet(diet: DinosaurDetail['diet']): DietOption {
  if (diet === 'Carnivore') {
    return '肉食';
  }
  if (diet === 'Herbivore') {
    return '草食';
  }
  return '雑食';
}

function mapClassification(record: DinosaurDetail): ClassificationOption {
  const subgroup = record.subgroup.toLowerCase();

  if (subgroup.includes('theropoda')) {
    return '獣脚類';
  }
  if (subgroup.includes('sauropodomorpha')) {
    return '竜脚類';
  }
  if (subgroup.includes('stegosauria')) {
    return '剣竜類';
  }
  if (subgroup.includes('ceratopsia')) {
    return '角竜類';
  }
  if (subgroup.includes('ankylosauria')) {
    return '鎧竜類';
  }
  if (subgroup.includes('hadrosauridae')) {
    return '鴨嘴竜類';
  }
  return record.clade === 'Ornithischia' ? '鳥盤類' : '獣脚類';
}

function buildNoteText(record: DinosaurDetail): string {
  const noteSource = record.significance || record.summary;
  const trimmed = noteSource.replace(/\s+/g, ' ').trim();
  return `最近の研究メモ: ${trimmed}`;
}

function buildTags(record: DinosaurDetail, eraLabel: EraOption, continentLabel: ContinentOption, classificationLabel: ClassificationOption): string[] {
  return [classificationLabel, eraLabel, continentLabel, record.diet === 'Carnivore' ? '肉食性' : record.diet === 'Herbivore' ? '草食性' : '雑食性'];
}

function toNotebookRecord(record: DinosaurDetail): NotebookRecord {
  const eraLabel = mapPeriodToEra(record.period);
  const continentLabel = mapRegionToContinent(record.region);
  const dietLabel = mapDiet(record.diet);
  const classificationLabel = mapClassification(record);

  return {
    ...record,
    eraLabel,
    continentLabel,
    dietLabel,
    classificationLabel,
    noteText: buildNoteText(record),
    tags: buildTags(record, eraLabel, continentLabel, classificationLabel),
  };
}

function readFilters(): Filters {
  return {
    keyword: uiElements.keywordInput.value.trim(),
    era: uiElements.eraSelect.value as EraOption,
    continent: uiElements.continentSelect.value as ContinentOption,
    diet: uiElements.dietSelect.value as DietOption,
    classification: uiElements.classificationSelect.value as ClassificationOption,
    maxLength: Number(uiElements.lengthRange.value),
  };
}

function updateRangeLabel(): void {
  uiElements.rangeValue.textContent = `0m 〜 ${uiElements.lengthRange.value}m`;
}

function getSelectedRecordIdFromUrl(): string | null {
  const url = new URL(window.location.href);
  const recordId = url.searchParams.get(DETAIL_QUERY_KEY);
  return recordId && recordId.trim() ? recordId : null;
}

function updateUrl(recordId: string | null, historyMode: 'push' | 'replace' = 'push'): void {
  const url = new URL(window.location.href);

  if (recordId) {
    url.searchParams.set(DETAIL_QUERY_KEY, recordId);
  } else {
    url.searchParams.delete(DETAIL_QUERY_KEY);
  }

  const nextUrl = `${url.pathname}${url.search}${url.hash}`;

  if (historyMode === 'replace') {
    window.history.replaceState({ recordId }, '', nextUrl);
    return;
  }

  window.history.pushState({ recordId }, '', nextUrl);
}

function matchesKeyword(record: NotebookRecord, keyword: string): boolean {
  if (!keyword) {
    return true;
  }

  const normalized = keyword.toLowerCase();
  const haystack = [
    record.nameJa,
    record.nameEn,
    record.summary,
    record.significance,
    record.subgroup,
    record.period,
    record.region,
    record.localities.map((locality) => `${locality.label} ${locality.country} ${locality.formation}`).join(' '),
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(normalized);
}

function applyFilters(): void {
  state.filteredRecords = state.records.filter((record) => {
    if (!matchesKeyword(record, state.filters.keyword)) {
      return false;
    }
    if (state.filters.era !== 'すべて' && record.eraLabel !== state.filters.era) {
      return false;
    }
    if (state.filters.continent !== 'すべて' && record.continentLabel !== state.filters.continent) {
      return false;
    }
    if (state.filters.diet !== 'すべて' && record.dietLabel !== state.filters.diet) {
      return false;
    }
    if (state.filters.classification !== 'すべて' && record.classificationLabel !== state.filters.classification) {
      return false;
    }
    return record.lengthMeters <= state.filters.maxLength;
  });
}

function formatMass(mass: number): string {
  return `推定${Math.round(mass).toLocaleString()}kg`;
}

function formatLength(lengthMeters: number): string {
  return `約${lengthMeters.toFixed(1)}m`;
}

function hasResolvedCoordinates(locality: LocalityDetail): boolean {
  return Number.isFinite(locality.coordinates.lat) && Number.isFinite(locality.coordinates.lng) && !(locality.coordinates.lat === 0 && locality.coordinates.lng === 0);
}

function buildMapMarker(locality: LocalityDetail): string {
  const viewBoxWidth = 100;
  const viewBoxHeight = 52;
  const x = ((locality.coordinates.lng + 180) / 360) * viewBoxWidth;
  const y = ((90 - locality.coordinates.lat) / 180) * viewBoxHeight;
  return `<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)})"><line x1="-1.8" y1="-1.8" x2="1.8" y2="1.8"/><line x1="1.8" y1="-1.8" x2="-1.8" y2="1.8"/></g>`;
}

function renderMapSvg(localities: LocalityDetail[]): string {
  const markers = localities.filter(hasResolvedCoordinates).slice(0, 6).map(buildMapMarker).join('');
  return `
    <svg viewBox="0 0 100 52" aria-label="産地マップ枠">
      <g class="map-grain" fill="none">
        <path d="M5 9 C12 8 18 8 25 9" />
        <path d="M63 8 C71 7 80 8 88 10" />
        <path d="M8 27 C14 26 18 26 23 27" />
        <path d="M40 40 C48 39 57 39 66 40" />
        <path d="M72 30 C78 29 84 30 90 32" />
      </g>
      <g class="map-outline map-outline-echo" fill="none">
        <path d="M6.8 15.6 C8.6 12.8 12.5 10.8 16.5 10.7 L20.2 11.6 L22.8 13.2 L24 16 L22.1 18.3 L19.2 19.2 L17.2 22.2 L13.2 23.1 L10.3 22.2 L8.1 20.3 L7.1 17.4 Z" />
        <path d="M17.6 11.4 C20.2 8.5 24.5 6.6 29.1 6.4 L34.1 7.3 L37.7 9.1 L39.7 12.1 L38.8 15.1 L35.9 16.3 L33.1 18.1 L30.1 18.4 L28.1 21.1 L24.3 20.2 L21.4 18.3 L19.1 15.2 Z" />
        <path d="M28.4 21.8 L30.1 23.7 L31 27.2 L30.9 31.2 L30 36.2 L28.2 42.1 L26.2 44.7 L24.5 42.2 L23.4 36.4 L23.4 30.3 L24.4 25.5 L26.2 22.4 Z" />
        <path d="M44.4 10.5 L47.1 9.4 L50 10.3 L50.9 12 L48.9 13.1 L46.2 13.2 L44.3 12.1 Z" />
        <path d="M48.4 12.7 C52.4 10.4 58.3 8.5 64.2 8.6 L71.1 9.4 L76.9 11.4 L82 14.4 L85.8 18.2 L84.8 20.3 L81.1 21.2 L78.3 19.4 L74.3 19.4 L71 20.4 L68.9 22.3 L66.1 22.3 L63.2 21.1 L60.2 19.3 L57.1 18.2 L54 18.2 L51 16.2 Z" />
        <path d="M58.2 21.4 L61 22.3 L64 25.2 L65.7 29.2 L65.8 33.2 L64 37.1 L61.9 38.8 L60.1 36.2 L58.1 31.1 L57.2 26.4 Z" />
        <path d="M79.4 33.4 L82.1 33.4 L85.1 35.2 L86.7 38.1 L85.8 40.1 L83.2 40.9 L80.1 39.9 L78.2 37.3 Z" />
      </g>
      <g class="map-outline" fill="none">
        <path d="M6 15 C8 12 12 10 16 10 L20 11 L23 13 L24 16 L22 18 L19 19 L17 22 L13 23 L10 22 L8 20 L7 17 Z" />
        <path d="M17 11 C20 8 24 6 29 6 L34 7 L38 9 L40 12 L39 15 L36 16 L33 18 L30 18 L28 21 L24 20 L21 18 L19 15 Z" />
        <path d="M28 21 L30 23 L31 27 L31 31 L30 36 L28 42 L26 45 L24 42 L23 36 L23 30 L24 25 L26 22 Z" />
        <path d="M44 10 L47 9 L50 10 L51 12 L49 13 L46 13 L44 12 Z" />
        <path d="M48 12 C52 10 58 8 64 8 L71 9 L77 11 L82 14 L86 18 L85 20 L81 21 L78 19 L74 19 L71 20 L69 22 L66 22 L63 21 L60 19 L57 18 L54 18 L51 16 Z" />
        <path d="M58 21 L61 22 L64 25 L66 29 L66 33 L64 37 L62 39 L60 36 L58 31 L57 26 Z" />
        <path d="M79 33 L82 33 L85 35 L87 38 L86 40 L83 41 L80 40 L78 37 Z" />
      </g>
      <g class="map-route" fill="none">
        <path d="M21 15 C31 13 43 14 53 17 C64 20 71 24 80 36" />
      </g>
      <g class="map-notes">
        <text x="8" y="8">N. America</text>
        <text x="24" y="45">S. America</text>
        <text x="46" y="7">Europe</text>
        <text x="61" y="7">Asia</text>
        <text x="58" y="41">Africa</text>
        <text x="77" y="31">Australia</text>
        <text x="60" y="15">survey route</text>
      </g>
      <g class="map-marker-group">${markers}</g>
    </svg>
  `;
}

function renderCard(record: NotebookRecord, index: number): string {
  const rotation = CARD_ROTATIONS[index % CARD_ROTATIONS.length];
  const number = String(index + 1).padStart(3, '0');
  const isSelected = state.selectedRecordId === record.id;
  const locationText = record.localities[0]
    ? `${record.localities[0].country} / ${record.localities[0].formation}`
    : record.continentLabel;
  const cardText = record.summary.replace(/\s+/g, ' ').trim().slice(0, 80) || `${record.nameJa} の基本記録`;
  const tagMarkup = record.tags
    .map(
      (tag, tagIndex) =>
        `<li style="transform: rotate(${TAG_ROTATIONS[tagIndex % TAG_ROTATIONS.length]});">${escapeHtml(tag)}</li>`,
    )
    .join('');

  return `
    <article class="catalog-card${isSelected ? ' is-selected' : ''}" style="--card-rotation: ${rotation};" data-record-id="${escapeHtml(record.id)}" role="button" tabindex="0" aria-expanded="${isSelected ? 'true' : 'false'}">
      <div class="tape" aria-hidden="true"></div>
      <p class="card-number">No. ${number} / ${escapeHtml(record.classificationLabel)}</p>
      <h3>${escapeHtml(record.nameJa)}</h3>
      <p class="scientific-name">${escapeHtml(record.nameEn)}</p>

      ${record.gallery[0]
        ? `<div class="card-thumbnail">
             <img src="${escapeHtml(record.gallery[0].imageUrl)}" alt="${escapeHtml(`${record.nameJa} の画像`)}" loading="lazy" />
           </div>`
        : renderClassificationSilhouette(record.classificationLabel)
      }

      <dl class="data-grid">
        <div>
          <dt>生息年代</dt>
          <dd>${escapeHtml(record.eraLabel)}</dd>
        </div>
        <div>
          <dt>産地・発見地</dt>
          <dd>${escapeHtml(locationText)}</dd>
        </div>
        <div>
          <dt>体長・体重</dt>
          <dd>${escapeHtml(`${formatLength(record.lengthMeters)} / ${formatMass(record.massEstimateKg)}`)}</dd>
        </div>
        <div>
          <dt>分類</dt>
          <dd>${escapeHtml(record.dietLabel)} / ${escapeHtml(record.classificationLabel)}</dd>
        </div>
      </dl>

      <p class="body-text">${escapeHtml(cardText)}</p>

      <section class="map-frame">
        <h4>産地マップ枠</h4>
        ${renderMapSvg(record.localities)}
      </section>

      <ul class="tag-list">${tagMarkup}</ul>
    </article>
  `;
}


function renderLocalityNotes(record: NotebookRecord): string {
  if (record.localities.length === 0) {
    return '<p class="detail-empty">産地メモはまだありません。</p>';
  }

  return `
    <ul class="detail-locality-list">
      ${record.localities
        .slice(0, 4)
        .map(
          (locality) => `
            <li>
              <strong>${escapeHtml(locality.label)}</strong>
              <span>${escapeHtml(`${locality.country} / ${locality.formation} / ${locality.age}`)}</span>
              <p>${escapeHtml(locality.note)}</p>
            </li>
          `,
        )
        .join('')}
    </ul>
  `;
}

function renderDetailMap(record: NotebookRecord): string {
  const mappedLocalities = record.localities.filter(hasResolvedCoordinates);

  if (mappedLocalities.length === 0) {
    return '<p class="detail-empty">地図に表示できる産地座標はまだありません。</p>';
  }

  return `
    <section class="map-frame detail-map-frame" aria-label="詳細ページの産地マップ">
      <h4>産地マップ</h4>
      ${renderMapSvg(mappedLocalities)}
      <p class="detail-map-caption">地図上の印は詳細に表示している産地 ${mappedLocalities.length} 件を示しています。</p>
    </section>
  `;
}

function renderDetailGallery(record: NotebookRecord): string {
  if (record.gallery.length === 0) {
    return '<p class="detail-empty">表示できる写真はまだ取得できていません。</p>';
  }

  const [hero, ...rest] = record.gallery;
  const thumbs = rest
    .map(
      (img) => `
        <a href="${escapeHtml(img.pageUrl)}" target="_blank" rel="noreferrer" class="gallery-thumb">
          <img src="${escapeHtml(img.imageUrl)}" alt="${escapeHtml(`${record.nameJa} の関連画像`)}" loading="lazy" />
        </a>`,
    )
    .join('');

  return `
    <div class="detail-gallery">
      <figure class="gallery-hero">
        <img src="${escapeHtml(hero.imageUrl)}" alt="${escapeHtml(`${record.nameJa} の関連画像`)}" loading="eager" />
        <figcaption>
          <a href="${escapeHtml(hero.pageUrl)}" target="_blank" rel="noreferrer">${escapeHtml(hero.title)}</a>
          <span>${escapeHtml(hero.attribution)}</span>
        </figcaption>
      </figure>
      ${thumbs ? `<div class="gallery-thumbs">${thumbs}</div>` : ''}
    </div>
  `;
}

function renderDetailPanel(): void {
  const record = state.records.find((entry) => entry.id === state.selectedRecordId);

  if (!record) {
    uiElements.detailView.innerHTML = `
      <div class="detail-panel-empty">
        <p class="detail-kicker">調査メモの詳細</p>
        <p class="detail-empty">指定された調査メモが見つかりませんでした。一覧へ戻って別の記録を開いてください。</p>
        <button type="button" class="detail-close" data-detail-close="true">一覧へ戻る</button>
      </div>
    `;
    return;
  }

  uiElements.detailView.innerHTML = `
    <article class="detail-sheet">
      <div class="detail-sheet-head">
        <div>
          <p class="detail-kicker">調査メモの詳細ページ</p>
          <h3>${escapeHtml(record.nameJa)}</h3>
          <p class="detail-scientific">${escapeHtml(record.nameEn)}</p>
        </div>
        <button type="button" class="detail-close" data-detail-close="true">一覧へ戻る</button>
      </div>

      <div class="detail-summary-block">
        ${renderDetailGallery(record)}
        <p>${escapeHtml(record.detailedDescription)}</p>
        ${record.trivia ? `<aside class="detail-trivia">💡 ${escapeHtml(record.trivia)}</aside>` : ''}
        <aside class="detail-research-note">${escapeHtml(record.noteText)}</aside>
      </div>

      <div class="detail-meta-grid">
        <section class="detail-box">
          <h4>最近の研究メモ</h4>
          <p>${escapeHtml(record.significance)}</p>
        </section>
        <section class="detail-box">
          <h4>基本データ</h4>
          <dl class="detail-stats">
            <div><dt>年代</dt><dd>${escapeHtml(record.period)}</dd></div>
            <div><dt>年代幅</dt><dd>${escapeHtml(record.ageMa)}</dd></div>
            <div><dt>体長</dt><dd>${escapeHtml(formatLength(record.lengthMeters))}</dd></div>
            <div><dt>推定体重</dt><dd>${escapeHtml(formatMass(record.massEstimateKg))}</dd></div>
          </dl>
        </section>
      </div>

      <div class="detail-meta-grid">
        <section class="detail-box">
          <h4>体型シルエット</h4>
          <div class="detail-silhouette-wrap">
            ${renderClassificationSilhouette(record.classificationLabel)}
            <p class="detail-silhouette-label">${escapeHtml(record.classificationLabel)} / ${escapeHtml(record.nameEn)}</p>
          </div>
        </section>
        <section class="detail-box">
          <h4>地図表示用の産地</h4>
          ${renderDetailMap(record)}
          ${renderLocalityNotes(record)}
        </section>
      </div>

      <section class="detail-box detail-references">
        <h4>参考文献・出典</h4>
        ${renderReferences(record)}
      </section>
    </article>
  `;
}

const REFERENCE_KIND_LABEL: Record<ReferenceEntry['kind'], string> = {
  'original-description': '原記載',
  redescription: '再記載',
  review: '総説・研究',
  database: 'データベース',
};

function renderReferences(record: NotebookRecord): string {
  if (record.references.length === 0) {
    return '<p class="detail-empty">参考文献はまだ取得できていません。</p>';
  }

  const items = record.references
    .map((ref) => {
      const kindLabel = REFERENCE_KIND_LABEL[ref.kind] ?? '';
      const meta = [ref.authors, ref.journal, ref.year ? String(ref.year) : '']
        .map((part) => part.trim())
        .filter(Boolean)
        .join(' / ');
      const doi = ref.doi ? ` <span class="reference-doi">doi:${escapeHtml(ref.doi)}</span>` : '';
      return `
        <li class="reference-item reference-kind-${escapeHtml(ref.kind)}">
          ${kindLabel ? `<span class="reference-tag">${escapeHtml(kindLabel)}</span>` : ''}
          <a href="${escapeHtml(ref.url)}" target="_blank" rel="noreferrer">${escapeHtml(ref.title)}</a>
          <span class="reference-meta">${escapeHtml(meta)}${doi}</span>
        </li>`;
    })
    .join('');

  return `<ol class="reference-list">${items}</ol>`;
}

function renderLoadingIndicator(): void {
  const fp = renderFootprintSvg();
  uiElements.resultStatus.textContent = '';
  uiElements.catalogGrid.innerHTML = `
    <div class="loading-indicator" role="status" aria-label="読み込み中">
      <div class="loading-footprints" aria-hidden="true">
        <span class="loading-footprint" style="color: var(--heading)">${fp}</span>
        <span class="loading-footprint" style="color: var(--heading)">${fp}</span>
        <span class="loading-footprint" style="color: var(--heading)">${fp}</span>
      </div>
      <p class="loading-text">調査記録を収集中です…</p>
    </div>
  `;
}

function renderCatalog(): void {
  uiElements.catalogTitle.textContent = `— 図鑑　全${state.records.length}種 —`;
  uiElements.resultCount.textContent = `検索結果 ${state.filteredRecords.length}件`;

  if (state.selectedRecordId) {
    uiElements.catalogView.classList.add('is-hidden');
    uiElements.detailView.classList.remove('is-hidden');
    renderDetailPanel();
    return;
  }

  uiElements.catalogView.classList.remove('is-hidden');
  uiElements.detailView.classList.add('is-hidden');

  if (state.filteredRecords.length === 0) {
    uiElements.catalogGrid.innerHTML = '<p class="empty-state">該当する調査記録は見つかりませんでした。</p>';
    return;
  }

  uiElements.catalogGrid.innerHTML = state.filteredRecords.map(renderCard).join('');
}

function openDetail(recordId: string): void {
  state.selectedRecordId = recordId;
  updateUrl(recordId);
  renderCatalog();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeDetail(historyMode: 'push' | 'replace' = 'push'): void {
  state.selectedRecordId = null;
  updateUrl(null, historyMode);
  renderCatalog();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openRandomRecord(): void {
  if (state.filteredRecords.length === 0) {
    return;
  }
  const idx = Math.floor(Math.random() * state.filteredRecords.length);
  const record = state.filteredRecords[idx];
  if (record) {
    openDetail(record.id);
  }
}

function syncRouteFromUrl(): void {
  const recordId = getSelectedRecordIdFromUrl();
  state.selectedRecordId = recordId && state.records.some((record) => record.id === recordId) ? recordId : null;

  if (recordId && !state.selectedRecordId) {
    updateUrl(null, 'replace');
  }

  renderCatalog();
}

function renderControls(): void {
  populateSelect(uiElements.eraSelect, ERA_OPTIONS);
  populateSelect(uiElements.continentSelect, CONTINENT_OPTIONS);
  populateSelect(uiElements.dietSelect, DIET_OPTIONS);
  populateSelect(uiElements.classificationSelect, CLASSIFICATION_OPTIONS);

  uiElements.keywordInput.value = state.filters.keyword;
  uiElements.eraSelect.value = state.filters.era;
  uiElements.continentSelect.value = state.filters.continent;
  uiElements.dietSelect.value = state.filters.diet;
  uiElements.classificationSelect.value = state.filters.classification;
  uiElements.lengthRange.value = String(state.filters.maxLength);
  updateRangeLabel();
}

async function bootstrap(): Promise<void> {
  renderLoadingIndicator();

  try {
    const summaries = await fetchDinosaurs();
    const details = await Promise.all(summaries.map((summary) => fetchDetail(summary.id)));
    state.records = details.map(toNotebookRecord);
    state.filteredRecords = [...state.records];
    uiElements.form.reset();
    uiElements.resultStatus.textContent = '';
    renderControls();
    applyFilters();
    syncRouteFromUrl();
  } catch (error) {
    uiElements.catalogGrid.innerHTML = '';
    uiElements.resultStatus.textContent = error instanceof Error ? error.message : '調査記録の読み込みに失敗しました。';
    uiElements.catalogGrid.innerHTML = '<p class="empty-state">バックエンド API を起動すると図鑑カードを表示できます。</p>';
  }
}

uiElements.form.addEventListener('submit', (event) => {
  event.preventDefault();
  state.filters = readFilters();
  applyFilters();
  renderCatalog();
});

uiElements.lengthRange.addEventListener('input', () => {
  updateRangeLabel();
  state.filters = readFilters();
  applyFilters();
  if (state.selectedRecordId && !state.filteredRecords.some((record) => record.id === state.selectedRecordId)) {
    state.selectedRecordId = null;
  }
  renderCatalog();
});

uiElements.form.addEventListener('reset', () => {
  state.selectedRecordId = null;
});

uiElements.catalogGrid.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const trigger = target.closest<HTMLElement>('.catalog-card[data-record-id]');
  if (!trigger) {
    return;
  }

  const recordId = trigger.dataset.recordId;
  if (!recordId) {
    return;
  }

  openDetail(recordId);
});

uiElements.catalogGrid.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') {
    return;
  }

  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const trigger = target.closest<HTMLElement>('.catalog-card[data-record-id]');
  if (!trigger) {
    return;
  }

  event.preventDefault();
  const recordId = trigger.dataset.recordId;
  if (!recordId) {
    return;
  }

  openDetail(recordId);
});

uiElements.detailView.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  if (!target.closest('[data-detail-close="true"]')) {
    return;
  }

  closeDetail();
});

uiElements.randomBtn.addEventListener('click', () => {
  openRandomRecord();
});

window.addEventListener('popstate', () => {
  syncRouteFromUrl();
});

void bootstrap();
