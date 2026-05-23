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

      <footer class="notes-footer">
        <p>記録者：___________　調査日：___________</p>
        <p>Field Notes — Fossil Record Series</p>
      </footer>
    </main>
    <p class="page-number">p. 01</p>
  </div>
`;

const ui = {
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
  filters: Filters;
} = {
  records: [],
  filteredRecords: [],
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
  const x = ((locality.coordinates.lng + 180) / 360) * 100;
  const y = ((90 - locality.coordinates.lat) / 180) * 100;
  return `<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)})"><line x1="-1.8" y1="-1.8" x2="1.8" y2="1.8"/><line x1="1.8" y1="-1.8" x2="-1.8" y2="1.8"/></g>`;
}

function renderMapSvg(localities: LocalityDetail[]): string {
  const markers = localities.slice(0, 6).map(buildMapMarker).join('');
  return `
    <svg viewBox="0 0 100 52" aria-label="産地マップ枠">
      <g class="map-outline" fill="none">
        <path d="M6 16 C8 14 11 12 15 12 C18 12 21 13 23 15 L24 18 L22 20 L19 21 L17 24 L13 24 L10 22 L8 19 L6 18 Z" />
        <path d="M19 14 C21 11 25 9 29 8 C33 8 37 9 40 11 L41 14 L39 17 L35 18 L34 21 L30 23 L27 22 L24 19 L21 18 Z" />
        <path d="M27 24 C29 25 31 27 32 30 C33 34 33 38 31 42 L29 45 L27 42 L26 38 L25 33 L25 28 Z" />
        <path d="M46 13 C48 12 50 11 53 11 C55 11 57 12 58 14 L57 16 L54 16 L52 15 L49 16 L47 15 Z" />
        <path d="M52 14 C56 11 61 9 67 9 C73 9 79 11 84 15 L87 18 L86 21 L82 22 L79 20 L75 20 L72 22 L68 22 L66 24 L62 23 L60 20 L56 19 L54 17 Z" />
        <path d="M61 24 C63 23 66 24 68 26 C70 29 71 32 70 35 L68 37 L66 35 L65 31 L63 28 Z" />
        <path d="M81 34 C83 34 85 35 86 37 L86 40 L84 41 L81 40 L79 38 L79 36 Z" />
        <path d="M35 46 C41 45 48 45 55 46 C61 47 67 47 73 46" />
      </g>
      <g class="map-marker-group">${markers}</g>
    </svg>
  `;
}

function renderCard(record: NotebookRecord, index: number): string {
  const rotation = CARD_ROTATIONS[index % CARD_ROTATIONS.length];
  const number = String(index + 1).padStart(3, '0');
  const locationText = record.localities[0]
    ? `${record.localities[0].country} / ${record.localities[0].formation}`
    : record.continentLabel;
  const summaryText = `${record.summary.replace(/\s+/g, ' ').trim()} ${record.significance.replace(/\s+/g, ' ').trim()}`.trim();
  const tagMarkup = record.tags
    .map(
      (tag, tagIndex) =>
        `<li style="transform: rotate(${TAG_ROTATIONS[tagIndex % TAG_ROTATIONS.length]});">${escapeHtml(tag)}</li>`,
    )
    .join('');

  return `
    <article class="catalog-card" style="transform: rotate(${rotation});">
      <div class="tape" aria-hidden="true"></div>
      <p class="card-number">No. ${number} / ${escapeHtml(record.classificationLabel)}</p>
      <h3>${escapeHtml(record.nameJa)}</h3>
      <p class="scientific-name">${escapeHtml(record.nameEn)}</p>

      <div class="skeleton-frame">
        <span>骨格スケッチ（側面）</span>
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

      <p class="body-text">${escapeHtml(summaryText || record.meaning)}</p>

      <aside class="sticky-note">${escapeHtml(record.noteText)}</aside>

      <section class="map-frame">
        <h4>産地マップ枠</h4>
        ${renderMapSvg(record.localities)}
      </section>

      <ul class="tag-list">${tagMarkup}</ul>
    </article>
  `;
}

function renderCatalog(): void {
  uiElements.catalogTitle.textContent = `— 図鑑　全${state.records.length}種 —`;
  uiElements.resultCount.textContent = `検索結果 ${state.filteredRecords.length}件`;

  if (state.filteredRecords.length === 0) {
    uiElements.catalogGrid.innerHTML = '<p class="empty-state">該当する調査記録は見つかりませんでした。</p>';
    return;
  }

  uiElements.catalogGrid.innerHTML = state.filteredRecords.map(renderCard).join('');
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
    renderCatalog();
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
  renderCatalog();
});

void bootstrap();
