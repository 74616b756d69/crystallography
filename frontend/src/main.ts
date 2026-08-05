import './styles.css';

import { WORLD_OUTLINE_PATHS } from './data/worldOutline';
import { mountBackgroundScene } from './three/backgroundScene';
import { mountGlobe, type GlobeHandle, type GlobeMarker } from './three/globeScene';

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
  imageUrl?: string;
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
const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('App root was not found.');
}

const backgroundCanvas = document.createElement('canvas');
backgroundCanvas.id = 'bg-canvas';
backgroundCanvas.setAttribute('aria-hidden', 'true');
document.body.prepend(backgroundCanvas);
mountBackgroundScene(backgroundCanvas);

app.innerHTML = `
  <div class="hud-scanlines" aria-hidden="true"></div>
  <div class="hud-shell">
    <header class="hud-header">
      <div class="hud-brand">
        <span class="hud-glyph" aria-hidden="true">◈</span>
        <div>
          <h1>恐竜データベース</h1>
          <p class="hud-sub">PALAEO ARCHIVE // FOSSIL INDEX v2.4</p>
        </div>
      </div>
      <dl class="hud-readout">
        <div>
          <dt>STATUS</dt>
          <dd id="hud-status" class="is-online">SYNC</dd>
        </div>
        <div>
          <dt>RECORDS</dt>
          <dd id="hud-records">000</dd>
        </div>
        <div>
          <dt>UTC</dt>
          <dd id="hud-clock">--:--:--</dd>
        </div>
      </dl>
    </header>

    <main>
      <section class="panel" aria-label="絞り込み検索">
        <div class="panel-head">
          <h2>QUERY CONSOLE</h2>
          <span class="panel-tag">絞り込み検索</span>
        </div>
        <form id="filter-form" class="search-form" autocomplete="off">
          <label class="search-block search-keyword">
            <span>KEYWORD / キーワード</span>
            <div class="search-inline">
              <input id="keyword-input" name="keyword" type="text" placeholder="種名・産地を入力…" autocomplete="off" />
              <button type="submit">SEARCH</button>
            </div>
          </label>

          <div class="filter-grid">
            <label class="search-block">
              <span>ERA / 時代</span>
              <select id="era-select" name="era"></select>
            </label>

            <label class="search-block">
              <span>REGION / 産地</span>
              <select id="continent-select" name="continent"></select>
            </label>

            <label class="search-block">
              <span>DIET / 食性</span>
              <select id="diet-select" name="diet"></select>
            </label>

            <label class="search-block">
              <span>CLADE / 分類</span>
              <select id="classification-select" name="classification"></select>
            </label>

            <label class="search-block search-range">
              <span>LENGTH / 体長</span>
              <input id="length-range" name="maxLength" type="range" min="0" max="40" step="1" value="40" />
              <strong id="range-value">0m 〜 40m</strong>
            </label>
          </div>
        </form>
      </section>

      <section class="catalog-section" aria-label="恐竜カード一覧">
        <div class="catalog-headline">
          <h2 id="catalog-title">SPECIMEN INDEX / 全0種</h2>
          <p id="result-count">MATCH 0</p>
        </div>
        <p id="result-status" class="result-status">アーカイブに接続しています…</p>
        <section id="detail-panel" class="detail-panel" aria-live="polite"></section>
        <div id="catalog-grid" class="catalog-grid"></div>
      </section>
    </main>

    <footer class="hud-footer">
      <p>PALAEO ARCHIVE TERMINAL // 文化祭展示</p>
      <p>RENDERED WITH WebGL / THREE.js</p>
    </footer>
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
  detailPanel: document.querySelector<HTMLElement>('#detail-panel'),
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
  !ui.detailPanel ||
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
  detailPanel: ui.detailPanel,
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

/** 詳細パネルは再描画のたびに DOM ごと差し替わるので、直前の地球儀を破棄してから張り直す。 */
let activeGlobe: GlobeHandle | null = null;

const hudStatus = document.querySelector<HTMLElement>('#hud-status');
const hudRecords = document.querySelector<HTMLElement>('#hud-records');
const hudClock = document.querySelector<HTMLElement>('#hud-clock');

function updateClock(): void {
  if (!hudClock) {
    return;
  }
  hudClock.textContent = new Date().toISOString().slice(11, 19);
}

updateClock();
window.setInterval(updateClock, 1000);

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

  if (
    value.includes('triassic') ||
    value.includes('carnian') ||
    value.includes('norian') ||
    value.includes('rhaetian') ||
    value.includes('ladinian') ||
    value.includes('anisian')
  ) {
    return '三畳紀';
  }

  if (
    value.includes('hettangian') ||
    value.includes('sinemurian') ||
    value.includes('pliensbachian') ||
    value.includes('toarcian') ||
    value.includes('early jurassic')
  ) {
    return 'ジュラ紀前期';
  }

  if (
    value.includes('jurassic') ||
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
    value.includes('early cretaceous') ||
    value.includes('berriasian') ||
    value.includes('valanginian') ||
    value.includes('hauterivian') ||
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
  const viewBoxWidth = 100;
  const viewBoxHeight = 52;
  const x = ((locality.coordinates.lng + 180) / 360) * viewBoxWidth;
  const y = ((90 - locality.coordinates.lat) / 180) * viewBoxHeight;
  return `<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)})"><circle r="1.6" /><line x1="-2.6" y1="0" x2="-1.1" y2="0"/><line x1="1.1" y1="0" x2="2.6" y2="0"/><line x1="0" y1="-2.6" x2="0" y2="-1.1"/><line x1="0" y1="1.1" x2="0" y2="2.6"/></g>`;
}

function buildGraticule(): string {
  const lines: string[] = [];
  for (let x = 10; x < 100; x += 10) {
    lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="52" />`);
  }
  for (let y = 6.5; y < 52; y += 6.5) {
    lines.push(`<line x1="0" y1="${y}" x2="100" y2="${y}" />`);
  }
  return lines.join('');
}

const GRATICULE_MARKUP = buildGraticule();

function renderMapSvg(localities: LocalityDetail[]): string {
  const markers = localities.slice(0, 6).map(buildMapMarker).join('');
  const outlines = WORLD_OUTLINE_PATHS.map((definition) => `<path d="${definition}" />`).join('');

  return `
    <svg viewBox="0 0 100 52" aria-label="産地マップ">
      <g class="map-graticule" fill="none">${GRATICULE_MARKUP}</g>
      <g class="map-outline" fill="none">${outlines}</g>
      <g class="map-marker-group" fill="none">${markers}</g>
    </svg>
  `;
}

function renderCardImage(record: NotebookRecord): string {
  if (record.imageUrl) {
    return `
      <div class="specimen-frame">
        <img src="${escapeHtml(record.imageUrl)}" alt="${escapeHtml(record.nameEn)}" loading="lazy" />
        <span class="scan-line" aria-hidden="true"></span>
      </div>
    `;
  }

  return `
    <div class="specimen-frame">
      <span class="specimen-caption">NO VISUAL DATA</span>
      <span class="scan-line" aria-hidden="true"></span>
    </div>
  `;
}

function renderCard(record: NotebookRecord, index: number): string {
  const number = String(index + 1).padStart(3, '0');
  const isSelected = state.selectedRecordId === record.id;
  const locationText = record.localities[0]
    ? `${record.localities[0].country} / ${record.localities[0].formation}`
    : record.continentLabel;
  const rawSummary = (record.summary || record.meaning).replace(/\s+/g, ' ').trim();
  const cardText = rawSummary.length > 110 ? rawSummary.slice(0, 110) + '…' : rawSummary;
  const tagMarkup = record.tags.map((tag) => `<li>${escapeHtml(tag)}</li>`).join('');

  return `
    <article class="catalog-card${isSelected ? ' is-selected' : ''}" data-record-id="${escapeHtml(record.id)}" role="button" tabindex="0" aria-expanded="${isSelected ? 'true' : 'false'}">
      <p class="card-index">
        <span>SPEC-${number}</span>
        <span class="card-class">${escapeHtml(record.classificationLabel)}</span>
      </p>
      <h3>${escapeHtml(record.nameJa)}</h3>
      <p class="scientific-name">${escapeHtml(record.nameEn)}</p>

      ${renderCardImage(record)}

      <dl class="data-grid">
        <div>
          <dt>ERA</dt>
          <dd>${escapeHtml(record.eraLabel)}</dd>
        </div>
        <div>
          <dt>SITE</dt>
          <dd>${escapeHtml(locationText)}</dd>
        </div>
        <div>
          <dt>SCALE</dt>
          <dd>${escapeHtml(`${record.lengthMeters.toFixed(1)}m / ${formatMass(record.massEstimateKg)}`)}</dd>
        </div>
        <div>
          <dt>CLASS</dt>
          <dd>${escapeHtml(record.dietLabel)} / ${escapeHtml(record.classificationLabel)}</dd>
        </div>
      </dl>

      <p class="body-text">${escapeHtml(cardText)}</p>

      <section class="map-frame">
        <h4>DISCOVERY MAP</h4>
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

function renderGlobeStage(record: NotebookRecord): string {
  const count = record.localities.length;
  return `
    <div class="globe-stage">
      <canvas class="globe-canvas" data-globe="true"></canvas>
      <span class="globe-corner tl" aria-hidden="true"></span>
      <span class="globe-corner tr" aria-hidden="true"></span>
      <span class="globe-corner bl" aria-hidden="true"></span>
      <span class="globe-corner br" aria-hidden="true"></span>
      <p class="globe-label">GEO PROJECTION // ${count} SITE${count === 1 ? '' : 'S'}</p>
      <p class="globe-hint">DRAG TO ROTATE</p>
    </div>
  `;
}

function mountDetailGlobe(record: NotebookRecord): void {
  activeGlobe?.dispose();
  activeGlobe = null;

  const canvas = uiElements.detailPanel.querySelector<HTMLCanvasElement>('canvas[data-globe="true"]');
  if (!canvas) {
    return;
  }

  const markers: GlobeMarker[] = record.localities.map((locality) => ({
    lat: locality.coordinates.lat,
    lng: locality.coordinates.lng,
    label: locality.label,
  }));

  activeGlobe = mountGlobe(canvas, markers);
}

function renderDetailPanel(): void {
  const record = state.records.find((entry) => entry.id === state.selectedRecordId);

  if (!record) {
    activeGlobe?.dispose();
    activeGlobe = null;
    uiElements.detailPanel.innerHTML = `
      <div class="detail-panel-empty">
        <p class="detail-kicker">DETAIL VIEWER // 詳細ビューア</p>
        <p class="detail-empty">一覧のカードを選択すると、産地の 3D プロジェクションと文献データをここに展開します。</p>
      </div>
    `;
    return;
  }

  const detailImageHtml = record.imageUrl
    ? `<div class="detail-image-frame">
        <img src="${escapeHtml(record.imageUrl)}" alt="${escapeHtml(record.nameEn)}" class="detail-image" loading="lazy" />
        <p class="detail-image-caption">SOURCE: Wikipedia / Wikimedia Commons</p>
      </div>`
    : '';

  uiElements.detailPanel.innerHTML = `
    <article class="detail-sheet">
      <div class="detail-sheet-head">
        <div>
          <p class="detail-kicker">DETAIL VIEWER // 詳細ビューア</p>
          <h3>${escapeHtml(record.nameJa)}</h3>
          <p class="detail-scientific">${escapeHtml(record.nameEn)}</p>
        </div>
        <button type="button" class="detail-close" data-detail-close="true">CLOSE</button>
      </div>

      <div class="detail-hero${detailImageHtml ? '' : ' detail-hero--solo'}">
        ${detailImageHtml}
        ${renderGlobeStage(record)}
      </div>

      <div class="detail-summary-block">
        <p>${escapeHtml(record.summary)}</p>
        <aside class="detail-research-note">${escapeHtml(record.noteText)}</aside>
      </div>

      <div class="detail-meta-grid">
        <section class="detail-box">
          <h4>RESEARCH LOG / 研究メモ</h4>
          <p>${escapeHtml(record.significance)}</p>
        </section>
        <section class="detail-box">
          <h4>CORE DATA / 基本データ</h4>
          <dl class="detail-stats">
            <div><dt>PERIOD</dt><dd>${escapeHtml(record.period)}</dd></div>
            <div><dt>AGE</dt><dd>${escapeHtml(record.ageMa)}</dd></div>
            <div><dt>LENGTH</dt><dd>${escapeHtml(`${record.lengthMeters.toFixed(1)}m`)}</dd></div>
            <div><dt>MASS</dt><dd>${escapeHtml(formatMass(record.massEstimateKg))}</dd></div>
          </dl>
        </section>
      </div>

      <div class="detail-meta-grid">
        <section class="detail-box">
          <h4>SITE INDEX / 産地</h4>
          ${renderLocalityNotes(record)}
        </section>
        <section class="detail-box">
          <h4>REFERENCES / 文献</h4>
          ${renderReferences(record)}
        </section>
      </div>
    </article>
  `;

  mountDetailGlobe(record);
}

function renderCatalog(): void {
  uiElements.catalogTitle.textContent = `SPECIMEN INDEX / 全${state.records.length}種`;
  uiElements.resultCount.textContent = `MATCH ${state.filteredRecords.length}`;
  if (hudRecords) {
    hudRecords.textContent = String(state.records.length).padStart(3, '0');
  }
  renderDetailPanel();

  if (state.filteredRecords.length === 0) {
    uiElements.catalogGrid.innerHTML = '<p class="empty-state">NO MATCHING RECORDS / 該当する記録がありません</p>';
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
    uiElements.resultStatus.textContent = 'アーカイブからレコードを取得中…';
    const summaries = await fetchDinosaurs();
    const details = await Promise.all(summaries.map((summary) => fetchDetail(summary.id)));
    state.records = details.map(toNotebookRecord);
    state.filteredRecords = [...state.records];
    state.selectedRecordId = null;
    uiElements.form.reset();
    uiElements.resultStatus.textContent = 'ARCHIVE SYNCHRONIZED / 同期完了';
    if (hudStatus) {
      hudStatus.textContent = 'ONLINE';
    }
    renderControls();
    applyFilters();
    renderCatalog();
  } catch (error) {
    uiElements.resultStatus.textContent = error instanceof Error ? error.message : 'レコードの取得に失敗しました。';
    if (hudStatus) {
      hudStatus.textContent = 'OFFLINE';
      hudStatus.classList.remove('is-online');
    }
    uiElements.catalogGrid.innerHTML =
      '<p class="empty-state">LINK DOWN / バックエンド API を起動すると図鑑データを表示します</p>';
  }
}

/** 外部画像が落ちているときは枠を空にせず「NO VISUAL DATA」を出す。 */
document.addEventListener(
  'error',
  (event) => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement)) {
      return;
    }

    const frame = image.closest('.specimen-frame, .detail-image-frame');
    if (!frame) {
      return;
    }

    const caption = document.createElement('p');
    caption.className = 'specimen-caption';
    caption.textContent = 'NO VISUAL DATA';
    image.replaceWith(caption);
  },
  true,
);

/** カード上のカーソル位置をグローの中心として CSS に渡す。 */
uiElements.catalogGrid.addEventListener(
  'pointermove',
  (event) => {
    const card = (event.target as HTMLElement | null)?.closest<HTMLElement>('.catalog-card');
    if (!card) {
      return;
    }
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${event.clientX - rect.left}px`);
    card.style.setProperty('--my', `${event.clientY - rect.top}px`);
  },
  { passive: true },
);

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
  setTimeout(() => {
    state.filters = readFilters();
    applyFilters();
    renderCatalog();
  }, 0);
});

[uiElements.eraSelect, uiElements.continentSelect, uiElements.dietSelect, uiElements.classificationSelect].forEach((select) => {
  select.addEventListener('change', () => {
    state.filters = readFilters();
    applyFilters();
    if (state.selectedRecordId && !state.filteredRecords.some((r) => r.id === state.selectedRecordId)) {
      state.selectedRecordId = null;
    }
    renderCatalog();
  });
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

  state.selectedRecordId = trigger.dataset.recordId ?? null;
  renderCatalog();
  uiElements.detailPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
  state.selectedRecordId = trigger.dataset.recordId ?? null;
  renderCatalog();
  uiElements.detailPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

uiElements.detailPanel.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  if (!target.closest('[data-detail-close="true"]')) {
    return;
  }

  state.selectedRecordId = null;
  renderCatalog();
});

void bootstrap();
