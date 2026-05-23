import cors from 'cors';
import express, { type Request, type Response } from 'express';

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

type OptimadeRecord = {
  id: string;
  attributes?: {
    chemical_formula_reduced?: string;
    chemical_formula_descriptive?: string;
    elements?: string[];
    last_modified?: string;
  };
};

type OptimadeResponse = {
  data?: OptimadeRecord[];
};

const app = express();
const port = Number(process.env.PORT ?? 3000);
const codBaseUrl = 'https://www.crystallography.net/cod';
const optimadeBaseUrl = `${codBaseUrl}/optimade/v1/structures`;

const featuredMaterials: MaterialDetail[] = [
  {
    id: 'carbon-diamond',
    codId: '9012296',
    title: 'Diamond',
    subtitle: 'Carbon allotrope',
    description: '炭素の共有結合ネットワークが三次元に伸びる代表的な結晶構造です。',
    formula: 'C',
    tags: ['featured', 'covalent'],
    cifUrl: `${codBaseUrl}/9012296.cif`,
    cifFormat: 'cif',
    source: `${codBaseUrl}/9012296.html`,
  },
  {
    id: 'chromium-metal',
    codId: '9012599',
    title: 'Chromium',
    subtitle: 'Elemental metal',
    description: '金属クロムの結晶構造です。体心立方格子の代表例として扱えます。',
    formula: 'Cr',
    tags: ['featured', 'metal'],
    cifUrl: `${codBaseUrl}/9012599.cif`,
    cifFormat: 'cif',
    source: `${codBaseUrl}/9012599.html`,
  },
  {
    id: 'halite',
    codId: '9006378',
    title: 'Halite',
    subtitle: 'Rock salt',
    description: '塩化ナトリウムの結晶構造で、イオン結晶の教材として扱いやすい例です。',
    formula: 'NaCl',
    tags: ['featured', 'ionic'],
    cifUrl: `${codBaseUrl}/9006378.cif`,
    cifFormat: 'cif',
    source: `${codBaseUrl}/9006378.html`,
  },
];

app.use(cors());

app.get('/api/health', (_request: Request, response: Response) => {
  response.json({ ok: true });
});

app.get('/api/materials/featured', (_request: Request, response: Response) => {
  response.json(featuredMaterials.map(toSummary));
});

app.get('/api/materials/search', async (request: Request, response: Response) => {
  const formula = String(request.query.formula ?? '').trim();
  if (!formula) {
    response.status(400).json({ message: 'formula query is required.' });
    return;
  }

  try {
    const searchResults = await searchCod(formula);
    response.json(searchResults);
  } catch (error) {
    response.status(502).json({
      message: error instanceof Error ? error.message : 'Failed to query COD.',
    });
  }
});

app.get('/api/materials/:id', async (request: Request, response: Response) => {
  const requestedId = request.params.id;
  const featured = featuredMaterials.find((entry) => entry.id === requestedId);
  if (featured) {
    response.json(featured);
    return;
  }

  try {
    const detail = await fetchCodDetail(requestedId);
    response.json(detail);
  } catch (error) {
    response.status(404).json({
      message: error instanceof Error ? error.message : 'Material was not found.',
    });
  }
});

function toSummary(material: MaterialDetail): MaterialSummary {
  return {
    id: material.id,
    codId: material.codId,
    title: material.title,
    subtitle: material.subtitle,
    description: material.description,
    formula: material.formula,
    tags: material.tags,
  };
}

function normalizeLabel(value: string): string {
  if (!value) {
    return 'Unknown material';
  }

  if (value === value.toUpperCase()) {
    return value;
  }

  return value
    .toLowerCase()
    .split(/\s+/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function buildSummaryFromRecord(record: OptimadeRecord, formulaQuery: string): MaterialSummary {
  const codId = record.id;
  const formula = record.attributes?.chemical_formula_reduced ?? formulaQuery;
  const descriptive = record.attributes?.chemical_formula_descriptive ?? formula;
  const elements = record.attributes?.elements ?? [];

  return {
    id: `cod-${codId}`,
    codId,
    title: normalizeLabel(descriptive),
    subtitle: elements.length > 0 ? `Elements: ${elements.join(', ')}` : 'COD structure',
    description: `COD ${codId} の公開 CIF を表示します。`,
    formula,
    tags: ['search', 'cod'],
  };
}

async function searchCod(formula: string): Promise<MaterialSummary[]> {
  const exactFormulaFilter = `chemical_formula_reduced=\"${formula}\"`;
  const elementFilter = formula.length <= 2 ? `elements HAS ALL \"${formula}\"` : exactFormulaFilter;
  const url = `${optimadeBaseUrl}?filter=${encodeURIComponent(elementFilter)}&page_limit=12&response_fields=chemical_formula_reduced,chemical_formula_descriptive,elements,last_modified`;

  const request = await fetch(url);
  if (!request.ok) {
    throw new Error('COD search request failed.');
  }

  const payload = (await request.json()) as OptimadeResponse;
  return (payload.data ?? []).map((record) => buildSummaryFromRecord(record, formula));
}

async function fetchCodDetail(id: string): Promise<MaterialDetail> {
  const codId = id.startsWith('cod-') ? id.replace('cod-', '') : id;
  const url = `${optimadeBaseUrl}?filter=${encodeURIComponent(`id=\"${codId}\"`)}&page_limit=1&response_fields=chemical_formula_reduced,chemical_formula_descriptive,elements`;
  const request = await fetch(url);
  if (!request.ok) {
    throw new Error('COD detail request failed.');
  }

  const payload = (await request.json()) as OptimadeResponse;
  const record = payload.data?.[0];
  if (!record) {
    throw new Error('No matching COD record was found.');
  }

  const summary = buildSummaryFromRecord(record, record.attributes?.chemical_formula_reduced ?? codId);

  return {
    ...summary,
    description: `${summary.title} の CIF を COD から直接ロードしています。`,
    cifUrl: `${codBaseUrl}/${codId}.cif`,
    cifFormat: 'cif',
    source: `${codBaseUrl}/${codId}.html`,
  };
}

app.listen(port, () => {
  console.log(`backend listening on ${port}`);
});