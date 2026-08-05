import cors from 'cors';
import express, { type Request, type Response } from 'express';

import { describeCacheLocation } from './cache.js';
import { findDinosaur, getStatus, initializeRepository, listDinosaurs, refreshAll } from './repository.js';
import type { DinosaurDetail, DinosaurSummary, FilterResponse } from './types.js';

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(cors());

app.get('/api/health', (_request: Request, response: Response) => {
  response.json({
    ok: true,
    sources: ['Wikipedia (ja/en)', 'Wikimedia Commons', 'Wikidata', 'PaleoBioDB'],
    cache: describeCacheLocation(),
    ...getStatus(),
  });
});

/** 取得状況の確認用。展示前に画像が何件そろったかを見るのに使う。 */
app.get('/api/status', (_request: Request, response: Response) => {
  response.json(getStatus());
});

app.post('/api/refresh', (_request: Request, response: Response) => {
  void refreshAll();
  response.status(202).json({ accepted: true, ...getStatus() });
});

app.get('/api/dinosaurs/filters', (_request: Request, response: Response<FilterResponse>) => {
  const dinosaurs = listDinosaurs();
  response.json({
    clades: uniqueSorted(dinosaurs.map((item) => item.clade)),
    subgroups: uniqueSorted(dinosaurs.map((item) => item.subgroup)),
    diets: uniqueSorted(dinosaurs.map((item) => item.diet)),
    periods: uniqueSorted(dinosaurs.map((item) => item.period)),
    regions: uniqueSorted(dinosaurs.map((item) => item.region)),
  });
});

app.get('/api/dinosaurs', (request: Request, response: Response<DinosaurSummary[] | { message: string }>) => {
  const q = String(request.query.q ?? '').trim().toLowerCase();
  const clade = String(request.query.clade ?? '').trim();
  const subgroup = String(request.query.subgroup ?? '').trim();
  const diet = String(request.query.diet ?? '').trim();
  const period = String(request.query.period ?? '').trim();
  const region = String(request.query.region ?? '').trim();

  const results = listDinosaurs().filter((item) => {
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
});

/** 一覧と詳細を1往復でまとめて返す。100種を1件ずつ取りに来る往復を無くすため。 */
app.get('/api/dinosaurs/all', (_request: Request, response: Response<DinosaurDetail[]>) => {
  response.json(listDinosaurs());
});

app.get('/api/dinosaurs/:id', (request: Request, response: Response<DinosaurDetail | { message: string }>) => {
  const detail = findDinosaur(String(request.params.id));
  if (!detail) {
    response.status(404).json({ message: 'Dinosaur was not found.' });
    return;
  }
  response.json(detail);
});

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
    imageUrl: detail.imageUrl,
    ageStartMa: detail.ageStartMa,
    ageEndMa: detail.ageEndMa,
    lengthMeters: detail.lengthMeters,
    localities: detail.localities.map((locality) => ({
      label: locality.label,
      country: locality.country,
      formation: locality.formation,
      age: locality.age,
      coordinates: locality.coordinates,
    })),
  };
}

function matchesFilter(actual: string, expected: string): boolean {
  return expected.length === 0 || actual === expected;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

await initializeRepository();

app.listen(port, () => {
  console.log(`backend listening on ${port}`);
});
