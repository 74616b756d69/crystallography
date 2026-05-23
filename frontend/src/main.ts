import 'leaflet/dist/leaflet.css';
import './styles.css';
import L from 'leaflet';

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

type ReferenceEntry = {
  title: string;
  authors: string;
  year: number;
  journal: string;
  doi?: string;
  url: string;
  kind: 'original-description' | 'redescription' | 'review' | 'database';
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

type FiltersResponse = {
  clades: string[];
  subgroups: string[];
  diets: string[];
  periods: string[];
  regions: string[];
};

type ActiveFilters = {
  q: string;
  clade: string;
  subgroup: string;
  diet: string;
  period: string;
  region: string;
};

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('App root was not found.');
}

app.innerHTML = `
  <div class="shell">
    <header class="hero">
      <div class="hero-copy">
        <p class="eyebrow">Dinosaur Research Atlas</p>
        <h1>恐竜の発見地、分類、文献を一画面で追える図鑑</h1>
        <p class="lead">
          発見地をピンで確認しながら、竜盤類・鳥盤類などの分類で絞り込み、原記載やレビュー文献に直接たどれる古生物ポータルです。
        </p>
        <p class="source-note">Wikidata と PaleoBioDB のライブデータを統合して表示します。</p>
        <div class="hero-metrics" id="hero-metrics"></div>
      </div>
      <section class="hero-panel">
        <p class="panel-kicker">研究導線</p>
        <ul class="hero-points">
          <li>Wikidata と PBDB の外部データを統合</li>
          <li>分類と時代で横断検索</li>
          <li>産地ピンから地層と産出メモを確認</li>
          <li>原記載・再記載・レビュー文献へ接続</li>
        </ul>
        <div class="stage-card">
          <div class="stage-orbit"></div>
          <div>
            <strong>3D 展開も追加しやすい構成</strong>
            <p>詳細パネル側に将来 Sketchfab や Three.js のモデル枠をそのまま足せます。</p>
          </div>
        </div>
      </section>
    </header>

    <main class="dashboard">
      <section class="surface filter-panel">
        <div class="section-heading">
          <div>
            <p class="panel-kicker">Search</p>
            <h2>検索と分類</h2>
          </div>
          <p id="result-status">初期データを読み込み中です。</p>
        </div>

        <form id="filter-form" class="filter-form">
          <label class="field field-wide">
            <span>キーワード</span>
            <input id="search-input" name="q" type="search" placeholder="例: ティラノサウルス、Theropoda、Late Cretaceous" />
          </label>

          <label class="field">
            <span>大分類</span>
            <select id="clade-select" name="clade"></select>
          </label>

          <label class="field">
            <span>下位群</span>
            <select id="subgroup-select" name="subgroup"></select>
          </label>

          <label class="field">
            <span>食性</span>
            <select id="diet-select" name="diet"></select>
          </label>

          <label class="field">
            <span>時代</span>
            <select id="period-select" name="period"></select>
          </label>

          <label class="field">
            <span>地域</span>
            <select id="region-select" name="region"></select>
          </label>

          <div class="filter-actions">
            <button type="submit" class="primary-button">反映</button>
            <button type="button" id="reset-button" class="ghost-button">リセット</button>
          </div>
        </form>

        <div id="active-filters" class="chip-row"></div>
      </section>

      <section class="surface map-panel">
        <div class="section-heading">
          <div>
            <p class="panel-kicker">Map</p>
            <h2>発見地マップ</h2>
          </div>
          <p>選択中の分類群に一致する産地を表示します。</p>
        </div>

        <div class="atlas-frame">
          <div id="leaflet-map" class="leaflet-map" aria-label="恐竜発見地マップ"></div>
          <div id="empty-map" class="empty-map is-hidden">該当する発見地がありません。</div>
          <aside class="map-legend">
            <strong>凡例</strong>
            <p>OpenStreetMap 上のピンを押すと産地メモを表示します。</p>
            <ul>
              <li>青: 竜盤類</li>
              <li>緑: 鳥盤類</li>
            </ul>
          </aside>
        </div>

        <div id="locality-note" class="locality-note">カードかピンを選ぶと産地メモがここに表示されます。</div>
      </section>

      <section class="surface list-panel">
        <div class="section-heading">
          <div>
            <p class="panel-kicker">Catalog</p>
            <h2>対象種一覧</h2>
          </div>
          <p id="list-count"></p>
        </div>
        <div id="dinosaur-list" class="catalog-list"></div>
      </section>

      <section class="surface detail-panel">
        <div class="section-heading">
          <div>
            <p class="panel-kicker">Detail</p>
            <h2 id="detail-title">種を選択してください</h2>
          </div>
          <span id="detail-badge" class="detail-badge">No selection</span>
        </div>

        <p id="detail-summary" class="detail-summary">
          左の一覧または発見地ピンから恐竜を選ぶと、分類・サイズ・発見地・文献情報を表示します。
        </p>

        <div id="detail-stats" class="detail-stats"></div>

        <section>
          <h3>発見地</h3>
          <div id="detail-localities" class="detail-localities"></div>
        </section>

        <section>
          <div class="detail-subhead">
            <h3>文献</h3>
            <span>原記載 / 再記載 / レビュー / DB</span>
          </div>
          <div id="detail-references" class="reference-list"></div>
        </section>
      </section>
    </main>
  </div>
`;

const filterForm = document.querySelector<HTMLFormElement>('#filter-form');
const resultStatus = document.querySelector<HTMLParagraphElement>('#result-status');
const listCount = document.querySelector<HTMLParagraphElement>('#list-count');
const heroMetrics = document.querySelector<HTMLDivElement>('#hero-metrics');
const dinosaurList = document.querySelector<HTMLDivElement>('#dinosaur-list');
const mapRoot = document.querySelector<HTMLDivElement>('#leaflet-map');
const emptyMap = document.querySelector<HTMLDivElement>('#empty-map');
const localityNote = document.querySelector<HTMLDivElement>('#locality-note');
const activeFilters = document.querySelector<HTMLDivElement>('#active-filters');
const detailTitle = document.querySelector<HTMLHeadingElement>('#detail-title');
const detailBadge = document.querySelector<HTMLSpanElement>('#detail-badge');
const detailSummary = document.querySelector<HTMLParagraphElement>('#detail-summary');
const detailStats = document.querySelector<HTMLDivElement>('#detail-stats');
const detailLocalities = document.querySelector<HTMLDivElement>('#detail-localities');
const detailReferences = document.querySelector<HTMLDivElement>('#detail-references');
const resetButton = document.querySelector<HTMLButtonElement>('#reset-button');

const selects = {
  clade: document.querySelector<HTMLSelectElement>('#clade-select'),
  subgroup: document.querySelector<HTMLSelectElement>('#subgroup-select'),
  diet: document.querySelector<HTMLSelectElement>('#diet-select'),
  period: document.querySelector<HTMLSelectElement>('#period-select'),
  region: document.querySelector<HTMLSelectElement>('#region-select'),
};

const searchInput = document.querySelector<HTMLInputElement>('#search-input');

if (
  !filterForm ||
  !resultStatus ||
  !listCount ||
  !heroMetrics ||
  !dinosaurList ||
  !mapRoot ||
  !emptyMap ||
  !localityNote ||
  !activeFilters ||
  !detailTitle ||
  !detailBadge ||
  !detailSummary ||
  !detailStats ||
  !detailLocalities ||
  !detailReferences ||
  !resetButton ||
  !searchInput ||
  !selects.clade ||
  !selects.subgroup ||
  !selects.diet ||
  !selects.period ||
  !selects.region
) {
  throw new Error('Required UI elements are missing.');
}

const ui = {
  filterForm,
  resultStatus,
  listCount,
  heroMetrics,
  dinosaurList,
  mapRoot,
  emptyMap,
  localityNote,
  activeFilters,
  detailTitle,
  detailBadge,
  detailSummary,
  detailStats,
  detailLocalities,
  detailReferences,
  resetButton,
  searchInput,
  selects: {
    clade: selects.clade,
    subgroup: selects.subgroup,
    diet: selects.diet,
    period: selects.period,
    region: selects.region,
  },
};

let map: L.Map | null = null;
let markerLayer: L.LayerGroup | null = null;

const state: {
  filters: ActiveFilters;
  options: FiltersResponse;
  results: DinosaurSummary[];
  selectedId: string | null;
  selectedDetail: DinosaurDetail | null;
  selectedLocality: { dinosaurName: string; locality: LocalitySummary | LocalityDetail } | null;
} = {
  filters: {
    q: '',
    clade: '',
    subgroup: '',
    diet: '',
    period: '',
    region: '',
  },
  options: {
    clades: [],
    subgroups: [],
    diets: [],
    periods: [],
    regions: [],
  },
  results: [],
  selectedId: null,
  selectedDetail: null,
  selectedLocality: null,
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildQuery(filters: ActiveFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value.trim().length > 0) {
      params.set(key, value.trim());
    }
  });
  return params.toString();
}

async function fetchFilters(): Promise<FiltersResponse> {
  const response = await fetch('/api/dinosaurs/filters');
  if (!response.ok) {
    throw new Error('分類フィルタの読み込みに失敗しました。');
  }
  return (await response.json()) as FiltersResponse;
}

async function fetchDinosaurs(filters: ActiveFilters): Promise<DinosaurSummary[]> {
  const query = buildQuery(filters);
  const response = await fetch(`/api/dinosaurs${query ? `?${query}` : ''}`);
  if (!response.ok) {
    throw new Error('恐竜一覧の取得に失敗しました。');
  }
  return (await response.json()) as DinosaurSummary[];
}

async function fetchDetail(id: string): Promise<DinosaurDetail> {
  const response = await fetch(`/api/dinosaurs/${encodeURIComponent(id)}`);
  if (!response.ok) {
    throw new Error('詳細データの取得に失敗しました。');
  }
  return (await response.json()) as DinosaurDetail;
}

function populateSelect(select: HTMLSelectElement, label: string, values: string[]): void {
  const current = select.value;
  select.innerHTML = [`<option value="">すべての${escapeHtml(label)}</option>`]
    .concat(values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`))
    .join('');
  select.value = values.includes(current) ? current : '';
}

function renderFilters(): void {
  populateSelect(ui.selects.clade, '分類', state.options.clades);
  populateSelect(ui.selects.subgroup, '下位群', state.options.subgroups);
  populateSelect(ui.selects.diet, '食性', state.options.diets);
  populateSelect(ui.selects.period, '時代', state.options.periods);
  populateSelect(ui.selects.region, '地域', state.options.regions);

  ui.searchInput.value = state.filters.q;
  ui.selects.clade.value = state.filters.clade;
  ui.selects.subgroup.value = state.filters.subgroup;
  ui.selects.diet.value = state.filters.diet;
  ui.selects.period.value = state.filters.period;
  ui.selects.region.value = state.filters.region;

  const chips: string[] = [];
  Object.entries(state.filters).forEach(([key, value]) => {
    if (!value) {
      return;
    }
    const labels: Record<string, string> = {
      q: '検索',
      clade: '分類',
      subgroup: '下位群',
      diet: '食性',
      period: '時代',
      region: '地域',
    };
    chips.push(`<span>${escapeHtml(labels[key])}: ${escapeHtml(value)}</span>`);
  });

  ui.activeFilters.innerHTML = chips.length > 0 ? chips.join('') : '<span>フィルタ未指定</span>';
}

function metricCards(results: DinosaurSummary[]): string {
  const localities = results.reduce((count, item) => count + item.localities.length, 0);
  const references = state.selectedDetail?.references.length ?? 0;
  const cards = [
    { label: '表示種数', value: String(results.length) },
    { label: '表示産地', value: String(localities) },
    { label: '文献本数', value: String(references) },
  ];

  return cards
    .map(
      (card) => `
        <article>
          <strong>${escapeHtml(card.value)}</strong>
          <span>${escapeHtml(card.label)}</span>
        </article>
      `,
    )
    .join('');
}

function renderList(): void {
  ui.listCount.textContent = `${state.results.length} taxa`;

  if (state.results.length === 0) {
    ui.dinosaurList.innerHTML = '<p class="empty-state">条件に一致する恐竜がありません。</p>';
    return;
  }

  ui.dinosaurList.innerHTML = state.results
    .map((item) => {
      const active = item.id === state.selectedId;
      return `
        <button class="catalog-card${active ? ' is-active' : ''}" data-dinosaur-id="${escapeHtml(item.id)}">
          <div class="catalog-head">
            <div>
              <strong>${escapeHtml(item.nameJa)}</strong>
              <p>${escapeHtml(item.nameEn)}</p>
            </div>
            <span class="clade-pill ${item.clade === 'Saurischia' ? 'is-saurischia' : 'is-ornithischia'}">${escapeHtml(item.clade)}</span>
          </div>
          <p class="catalog-summary">${escapeHtml(item.summary)}</p>
          <div class="meta-row">
            <span>${escapeHtml(item.subgroup)}</span>
            <span>${escapeHtml(item.period)}</span>
            <span>${escapeHtml(item.region)}</span>
          </div>
        </button>
      `;
    })
    .join('');

  ui.dinosaurList.querySelectorAll<HTMLButtonElement>('[data-dinosaur-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.dinosaurId;
      if (!id) {
        return;
      }
      void selectDinosaur(id);
    });
  });
}

function ensureMap(): L.Map {
  if (map) {
    return map;
  }

  map = L.map(ui.mapRoot, {
    zoomControl: true,
    worldCopyJump: true,
    scrollWheelZoom: false,
  }).setView([22, 10], 2);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 7,
    minZoom: 2,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);

  markerLayer = L.layerGroup().addTo(map);
  requestAnimationFrame(() => {
    map?.invalidateSize();
  });

  return map;
}

function createMarkerIcon(clade: DinosaurSummary['clade'], selected: boolean): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<span class="leaflet-pin ${clade === 'Saurischia' ? 'is-saurischia' : 'is-ornithischia'}${selected ? ' is-selected' : ''}"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
    popupAnchor: [0, -18],
  });
}

function renderMap(focusSelected = false): void {
  const activeMap = ensureMap();
  markerLayer?.clearLayers();

  const markers = state.results.flatMap((item) =>
    item.localities.map((locality) => ({
      dinosaur: item,
      locality,
      selected:
        state.selectedLocality?.dinosaurName === item.nameJa &&
        state.selectedLocality.locality.label === locality.label,
    })),
  );

  ui.emptyMap.classList.toggle('is-hidden', markers.length > 0);

  if (markers.length === 0) {
    activeMap.setView([22, 10], 2);
    return;
  }

  const bounds: L.LatLngTuple[] = [];
  let selectedMarker: L.Marker | null = null;

  markers.forEach(({ dinosaur, locality, selected }) => {
    const latLng = L.latLng(locality.coordinates.lat, locality.coordinates.lng);
    bounds.push([locality.coordinates.lat, locality.coordinates.lng]);

    const marker = L.marker(latLng, {
      icon: createMarkerIcon(dinosaur.clade, selected),
      title: `${dinosaur.nameJa} ${locality.label}`,
    });

    marker.bindPopup(`
      <div class="leaflet-popup-card">
        <strong>${escapeHtml(dinosaur.nameJa)}</strong>
        <p>${escapeHtml(locality.label)}</p>
        <span>${escapeHtml(locality.formation)} / ${escapeHtml(locality.age)}</span>
      </div>
    `);

    marker.on('click', () => {
      state.selectedLocality = { dinosaurName: dinosaur.nameJa, locality };
      ui.localityNote.textContent = `${dinosaur.nameJa} / ${locality.label} / ${locality.formation} / ${locality.age}`;
      void selectDinosaur(dinosaur.id, locality.label);
    });

    marker.addTo(markerLayer!);

    if (selected) {
      selectedMarker = marker;
    }
  });

  requestAnimationFrame(() => {
    activeMap.invalidateSize();
    if (focusSelected && selectedMarker) {
      const selectedLatLng = selectedMarker.getLatLng();
      activeMap.flyTo(selectedLatLng, Math.max(activeMap.getZoom(), 4), {
        animate: true,
        duration: 0.7,
      });
      selectedMarker.openPopup();
      return;
    }

    if (bounds.length === 1) {
      activeMap.setView(bounds[0], 4);
      return;
    }

    activeMap.fitBounds(bounds, {
      padding: [32, 32],
      maxZoom: 4,
    });
  });
}

function renderHero(): void {
  ui.heroMetrics.innerHTML = metricCards(state.results);
}

function renderDetail(detail: DinosaurDetail | null): void {
  if (!detail) {
    ui.detailTitle.textContent = '種を選択してください';
    ui.detailBadge.textContent = 'No selection';
    ui.detailSummary.textContent = '左の一覧または発見地ピンから恐竜を選ぶと、分類・サイズ・発見地・文献情報を表示します。';
    ui.detailStats.innerHTML = '';
    ui.detailLocalities.innerHTML = '<p class="empty-state">発見地情報はここに表示されます。</p>';
    ui.detailReferences.innerHTML = '<p class="empty-state">文献情報はここに表示されます。</p>';
    renderHero();
    return;
  }

  ui.detailTitle.textContent = `${detail.nameJa} / ${detail.nameEn}`;
  ui.detailBadge.textContent = `${detail.clade} · ${detail.subgroup}`;
  ui.detailSummary.textContent = `${detail.summary} ${detail.significance}`;

  const stats = [
    { label: '意味', value: detail.meaning },
    { label: '時代', value: `${detail.period} (${detail.ageMa})` },
    { label: '食性', value: detail.diet },
    { label: '全長', value: `${detail.lengthMeters} m` },
    { label: '推定体重', value: `${detail.massEstimateKg.toLocaleString()} kg` },
    { label: '地域', value: detail.region },
  ];

  ui.detailStats.innerHTML = stats
    .map(
      (stat) => `
        <article>
          <span>${escapeHtml(stat.label)}</span>
          <strong>${escapeHtml(stat.value)}</strong>
        </article>
      `,
    )
    .join('');

  ui.detailLocalities.innerHTML = detail.localities
    .map((locality) => {
      const selected = state.selectedLocality?.locality.label === locality.label;
      return `
        <button class="locality-card${selected ? ' is-selected' : ''}" data-locality-name="${escapeHtml(locality.label)}">
          <div>
            <strong>${escapeHtml(locality.label)}</strong>
            <p>${escapeHtml(locality.country)} / ${escapeHtml(locality.formation)}</p>
          </div>
          <span>${escapeHtml(locality.age)}</span>
          <p>${escapeHtml(locality.note)}</p>
        </button>
      `;
    })
    .join('');

  ui.detailReferences.innerHTML = detail.references
    .map((reference) => {
      const href = reference.url;
      const subline = [reference.authors, String(reference.year), reference.journal].join(' / ');
      const doi = reference.doi ? `<span>DOI: ${escapeHtml(reference.doi)}</span>` : '<span>External link</span>';
      return `
        <a class="reference-card" href="${escapeHtml(href)}" target="_blank" rel="noreferrer">
          <div class="reference-head">
            <strong>${escapeHtml(reference.title)}</strong>
            <span>${escapeHtml(reference.kind)}</span>
          </div>
          <p>${escapeHtml(subline)}</p>
          ${doi}
        </a>
      `;
    })
    .join('');

  ui.detailLocalities.querySelectorAll<HTMLButtonElement>('[data-locality-name]').forEach((button) => {
    button.addEventListener('click', () => {
      const name = button.dataset.localityName;
      const locality = detail.localities.find((entry) => entry.label === name);
      if (!locality) {
        return;
      }
      state.selectedLocality = { dinosaurName: detail.nameJa, locality };
      ui.localityNote.textContent = `${detail.nameJa} / ${locality.label} / ${locality.note}`;
      renderMap(true);
      renderDetail(detail);
    });
  });

  renderHero();
}

async function selectDinosaur(id: string, preferredLocalityName?: string): Promise<void> {
  state.selectedId = id;
  renderList();

  try {
    const detail = await fetchDetail(id);
    state.selectedDetail = detail;

    const preferredLocality = preferredLocalityName
      ? detail.localities.find((entry) => entry.label === preferredLocalityName)
      : detail.localities[0] ?? null;

    if (preferredLocality) {
      state.selectedLocality = { dinosaurName: detail.nameJa, locality: preferredLocality };
      ui.localityNote.textContent = `${detail.nameJa} / ${preferredLocality.label} / ${preferredLocality.note}`;
    }

    renderMap(true);
    renderDetail(detail);
  } catch (error) {
    ui.detailTitle.textContent = '詳細を読み込めませんでした';
    ui.detailBadge.textContent = 'Load error';
    ui.detailSummary.textContent = error instanceof Error ? error.message : '不明なエラーが発生しました。';
  }
}

async function loadResults(): Promise<void> {
  ui.resultStatus.textContent = '恐竜データを取得しています。';
  const results = await fetchDinosaurs(state.filters);
  state.results = results;
  ui.resultStatus.textContent = `${results.length} 件の恐竜を表示中です。`;

  const keepSelection = state.selectedId && results.some((item) => item.id === state.selectedId);
  if (!keepSelection) {
    state.selectedId = results[0]?.id ?? null;
    state.selectedDetail = null;
    state.selectedLocality = null;
  }

  renderFilters();
  renderList();
  renderMap();
  renderDetail(state.selectedDetail);

  if (state.selectedId) {
    await selectDinosaur(state.selectedId);
  }
}

function readFiltersFromForm(): ActiveFilters {
  return {
    q: ui.searchInput.value.trim(),
    clade: ui.selects.clade.value,
    subgroup: ui.selects.subgroup.value,
    diet: ui.selects.diet.value,
    period: ui.selects.period.value,
    region: ui.selects.region.value,
  };
}

ui.filterForm.addEventListener('submit', (event) => {
  event.preventDefault();
  state.filters = readFiltersFromForm();
  void loadResults();
});

ui.resetButton.addEventListener('click', () => {
  state.filters = {
    q: '',
    clade: '',
    subgroup: '',
    diet: '',
    period: '',
    region: '',
  };
  state.selectedId = null;
  state.selectedDetail = null;
  state.selectedLocality = null;
  renderFilters();
  void loadResults();
});

async function bootstrap(): Promise<void> {
  try {
    state.options = await fetchFilters();
    renderFilters();
    await loadResults();
  } catch (error) {
    ui.resultStatus.textContent = error instanceof Error ? error.message : '初期化に失敗しました。';
    ui.dinosaurList.innerHTML = '<p class="empty-state">バックエンド API を起動すると一覧が表示されます。</p>';
    renderDetail(null);
  }
}

void bootstrap();