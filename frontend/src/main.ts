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

type ReferenceEntry = {
  title: string;
  authors: string;
  year: number;
  journal: string;
  doi?: string;
  url: string;
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
  meaning: string;
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
  !ui.catalogGrid
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
  const noteSource = record.significance || record.meaning || record.summary;
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
    record.meaning,
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
  return `${Math.round(mass).toLocaleString()}kg`;
}

function buildMapMarker(locality: LocalityDetail): string {
  const viewBoxWidth = 100;
  const viewBoxHeight = 52;
  const x = ((locality.coordinates.lng + 180) / 360) * viewBoxWidth;
  const y = ((90 - locality.coordinates.lat) / 180) * viewBoxHeight;
  return `<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)})"><line x1="-1.8" y1="-1.8" x2="1.8" y2="1.8"/><line x1="1.8" y1="-1.8" x2="-1.8" y2="1.8"/></g>`;
}

function renderMapSvg(localities: LocalityDetail[]): string {
  const markers = localities.slice(0, 6).map(buildMapMarker).join('');
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
  const cardText = record.meaning.replace(/\s+/g, ' ').trim() || `${record.nameJa} の基本記録`;
  const tagMarkup = record.tags
    .map(
      (tag, tagIndex) =>
        `<li style="transform: rotate(${TAG_ROTATIONS[tagIndex % TAG_ROTATIONS.length]});">${escapeHtml(tag)}</li>`,
    )
    .join('');

  return `
    <article class="catalog-card${isSelected ? ' is-selected' : ''}" style="transform: rotate(${rotation});" data-record-id="${escapeHtml(record.id)}" role="button" tabindex="0" aria-expanded="${isSelected ? 'true' : 'false'}">
      <div class="tape" aria-hidden="true"></div>
      <p class="card-number">No. ${number} / ${escapeHtml(record.classificationLabel)}</p>
      <h3>${escapeHtml(record.nameJa)}</h3>
      <p class="scientific-name">${escapeHtml(record.nameEn)}</p>

      <div class="skeleton-frame">
        <span class="skeleton-caption">骨格スケッチ（側面）</span>
        <div class="scale-bar"><i></i><strong>2m</strong></div>
      </div>

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
          <dd>${escapeHtml(`${record.lengthMeters.toFixed(1)}m / ${formatMass(record.massEstimateKg)}`)}</dd>
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

function renderReferences(record: NotebookRecord): string {
  if (record.references.length === 0) {
    return '<p class="detail-empty">文献導線はまだありません。</p>';
  }

  return `
    <ul class="detail-reference-list">
      ${record.references
        .map(
          (reference) => `
            <li>
              <a href="${escapeHtml(reference.url)}" target="_blank" rel="noreferrer">
                ${escapeHtml(reference.title)}
              </a>
              <p>${escapeHtml(`${reference.authors} / ${reference.journal} / ${reference.year}`)}</p>
            </li>
          `,
        )
        .join('')}
    </ul>
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
        <p>${escapeHtml(record.summary)}</p>
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
            <div><dt>体長</dt><dd>${escapeHtml(`${record.lengthMeters.toFixed(1)}m`)}</dd></div>
            <div><dt>体重</dt><dd>${escapeHtml(formatMass(record.massEstimateKg))}</dd></div>
          </dl>
        </section>
      </div>

      <div class="detail-meta-grid">
        <section class="detail-box">
          <h4>地図表示用の産地</h4>
          ${renderLocalityNotes(record)}
        </section>
        <section class="detail-box">
          <h4>文献導線</h4>
          ${renderReferences(record)}
        </section>
      </div>
    </article>
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
  try {
    uiElements.resultStatus.textContent = '調査記録を収集中です。';
    const summaries = await fetchDinosaurs();
    const details = await Promise.all(summaries.map((summary) => fetchDetail(summary.id)));
    state.records = details.map(toNotebookRecord);
    state.filteredRecords = [...state.records];
    uiElements.form.reset();
    uiElements.resultStatus.textContent = '野外調査ノートを整理しました。';
    renderControls();
    applyFilters();
    syncRouteFromUrl();
  } catch (error) {
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

window.addEventListener('popstate', () => {
  syncRouteFromUrl();
});

void bootstrap();
