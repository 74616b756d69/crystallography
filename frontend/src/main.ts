import 'molstar/build/viewer/molstar.css';
import './styles.css';

import { Viewer } from 'molstar/lib/apps/viewer/app';

type MaterialSummary = {
  id: string;
  codId: string;
  title: string;
  subtitle: string;
  description: string;
  formula: string;
  tags: string[];
};

type MaterialDetail = MaterialSummary & {
  cifUrl: string;
  cifFormat: 'cif';
  source: string;
};

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('App root was not found.');
}

app.innerHTML = `
  <div class="shell">
    <header class="hero">
      <div>
        <p class="eyebrow">Free crystal structure data via COD</p>
        <h1>Crystallography Explorer</h1>
        <p class="lead">
          公開の結晶構造データベース COD を使って、結晶構造を検索し、Mol* で表示します。
        </p>
      </div>
      <form id="search-form" class="search-panel">
        <label for="formula-input">化学式または元素</label>
        <div class="search-row">
          <input id="formula-input" name="formula" placeholder="例: C, NaCl, Cr" autocomplete="off" />
          <button type="submit">検索</button>
        </div>
        <p class="hint">検索は COD の OPTIMADE API を経由します。</p>
      </form>
    </header>

    <main class="layout">
      <section class="panel list-panel">
        <div class="panel-header">
          <h2>Structure List</h2>
          <p id="list-status">初期データを読み込み中</p>
        </div>
        <div id="material-list" class="material-list"></div>
      </section>

      <section class="panel viewer-panel">
        <div class="panel-header">
          <div>
            <h2 id="detail-title">構造を選択してください</h2>
            <p id="detail-subtitle">Mol* viewer</p>
          </div>
          <a id="source-link" class="source-link" href="#" target="_blank" rel="noreferrer">COD を開く</a>
        </div>
        <p id="detail-description" class="detail-description">
          左のリストから構造を選ぶと、公開 CIF をロードして表示します。
        </p>
        <div id="viewer" class="viewer"></div>
      </section>
    </main>
  </div>
`;

const searchForm = document.querySelector<HTMLFormElement>('#search-form');
const formulaInput = document.querySelector<HTMLInputElement>('#formula-input');
const listStatus = document.querySelector<HTMLParagraphElement>('#list-status');
const materialList = document.querySelector<HTMLDivElement>('#material-list');
const detailTitle = document.querySelector<HTMLHeadingElement>('#detail-title');
const detailSubtitle = document.querySelector<HTMLParagraphElement>('#detail-subtitle');
const detailDescription = document.querySelector<HTMLParagraphElement>('#detail-description');
const sourceLink = document.querySelector<HTMLAnchorElement>('#source-link');

if (!searchForm || !formulaInput || !listStatus || !materialList || !detailTitle || !detailSubtitle || !detailDescription || !sourceLink) {
  throw new Error('Required UI elements are missing.');
}

let viewer: Viewer | null = null;
let selectedId: string | null = null;

const featuredMaterials: MaterialSummary[] = [
  {
    id: 'carbon-diamond',
    codId: '9012296',
    title: 'Diamond',
    subtitle: 'Carbon allotrope',
    description: '炭素の結晶構造。共有結合が三次元に広がる代表例です。',
    formula: 'C',
    tags: ['featured', 'covalent'],
  },
  {
    id: 'chromium-metal',
    codId: '9012599',
    title: 'Chromium',
    subtitle: 'Elemental metal',
    description: '体心立方格子を持つ金属クロムの構造です。',
    formula: 'Cr',
    tags: ['featured', 'metal'],
  },
  {
    id: 'halite',
    codId: '9006378',
    title: 'Halite',
    subtitle: 'Rock salt',
    description: '塩化ナトリウムの代表的なイオン結晶です。',
    formula: 'NaCl',
    tags: ['featured', 'ionic'],
  },
];

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderList(materials: MaterialSummary[]): void {
  materialList.innerHTML = materials
    .map((material) => {
      const isActive = material.id === selectedId;
      const tags = material.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');
      return `
        <button class="material-card${isActive ? ' is-active' : ''}" data-id="${escapeHtml(material.id)}">
          <div class="material-card-head">
            <div>
              <strong>${escapeHtml(material.title)}</strong>
              <p>${escapeHtml(material.subtitle)}</p>
            </div>
            <span class="formula">${escapeHtml(material.formula)}</span>
          </div>
          <p class="material-card-body">${escapeHtml(material.description)}</p>
          <div class="tag-row">${tags}</div>
        </button>
      `;
    })
    .join('');

  materialList.querySelectorAll<HTMLButtonElement>('[data-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.id;
      if (!id) return;
      void loadMaterial(id);
    });
  });
}

async function getViewer(): Promise<Viewer> {
  if (viewer) {
    return viewer;
  }

  viewer = await Viewer.create('viewer', {
    layoutIsExpanded: false,
    layoutShowControls: false,
    layoutShowLeftPanel: false,
    layoutShowSequence: true,
    layoutShowLog: false,
    viewportShowExpand: false,
    viewportShowAnimation: false,
    viewportShowSelectionMode: false,
  });

  return viewer;
}

async function fetchFeatured(): Promise<MaterialSummary[]> {
  const response = await fetch('/api/materials/featured');
  if (!response.ok) {
    throw new Error('Failed to load featured materials.');
  }
  return (await response.json()) as MaterialSummary[];
}

async function searchMaterials(formula: string): Promise<MaterialSummary[]> {
  const response = await fetch(`/api/materials/search?formula=${encodeURIComponent(formula)}`);
  if (!response.ok) {
    throw new Error('Search request failed.');
  }
  return (await response.json()) as MaterialSummary[];
}

async function fetchDetail(id: string): Promise<MaterialDetail> {
  const response = await fetch(`/api/materials/${encodeURIComponent(id)}`);
  if (!response.ok) {
    throw new Error('Failed to load material detail.');
  }
  return (await response.json()) as MaterialDetail;
}

async function loadMaterial(id: string): Promise<void> {
  selectedId = id;
  renderListFromDom();

  detailTitle.textContent = 'Loading...';
  detailSubtitle.textContent = 'COD';
  detailDescription.textContent = '構造データを読み込んでいます。';

  try {
    const detail = await fetchDetail(id);
    const plugin = await getViewer();

    detailTitle.textContent = detail.title;
    detailSubtitle.textContent = `${detail.subtitle} / COD ${detail.codId}`;
    detailDescription.textContent = detail.description;
    sourceLink.href = detail.source;

    await plugin.loadStructureFromUrl(detail.cifUrl, detail.cifFormat, false);
  } catch (error) {
    detailTitle.textContent = '読み込みに失敗しました';
    detailSubtitle.textContent = 'Mol* viewer';
    detailDescription.textContent = error instanceof Error ? error.message : '不明なエラーが発生しました。';
  }
}

function renderListFromDom(): void {
  const cards = Array.from(materialList.querySelectorAll<HTMLButtonElement>('[data-id]'));
  cards.forEach((card) => {
    card.classList.toggle('is-active', card.dataset.id === selectedId);
  });
}

searchForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formula = formulaInput.value.trim();
  if (!formula) {
    listStatus.textContent = '化学式または元素記号を入力してください。';
    return;
  }

  listStatus.textContent = `${formula} を検索中...`;

  try {
    const materials = await searchMaterials(formula);
    listStatus.textContent = `${materials.length} 件見つかりました。`;
    renderList(materials);
    if (materials[0]) {
      await loadMaterial(materials[0].id);
    }
  } catch (error) {
    listStatus.textContent = error instanceof Error ? error.message : '検索に失敗しました。';
  }
});

async function bootstrap(): Promise<void> {
  renderList(featuredMaterials);

  try {
    const materials = await fetchFeatured();
    listStatus.textContent = 'おすすめ構造を表示しています。';
    renderList(materials);
    if (materials[0]) {
      await loadMaterial(materials[0].id);
    }
  } catch {
    listStatus.textContent = 'API がまだ起動していないため、仮の一覧を表示しています。';
    await loadMaterial(featuredMaterials[0].id);
  }
}

void bootstrap();