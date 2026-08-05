export type TimelineEntry = {
  id: string;
  nameJa: string;
  ageStartMa?: number;
  ageEndMa?: number;
  dietLabel: string;
};

type Band = {
  label: string;
  startMa: number;
  endMa: number;
};

/** 中生代の3紀。数値は国際年代層序表（ICS 2023）に基づく。 */
const BANDS: Band[] = [
  { label: '三畳紀', startMa: 251.9, endMa: 201.4 },
  { label: 'ジュラ紀', startMa: 201.4, endMa: 143.1 },
  { label: '白亜紀', startMa: 143.1, endMa: 66 },
];

const RANGE_START = 251.9;
const RANGE_END = 66;
const VIEW_WIDTH = 1000;
const LANE_HEIGHT = 13;
const LANE_COUNT = 8;
const AXIS_HEIGHT = 34;
const MIN_BAR_WIDTH = 4;

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** 古い年代（Ma が大きい）ほど左。 */
function toX(ma: number): number {
  const clamped = Math.min(Math.max(ma, RANGE_END), RANGE_START);
  return ((RANGE_START - clamped) / (RANGE_START - RANGE_END)) * VIEW_WIDTH;
}

type PlacedEntry = TimelineEntry & { x: number; width: number; lane: number };

/**
 * 棒が重ならないように貪欲にレーンへ詰める。
 * 100種を縦に潰さず、生息期間の重なりが目で追える形にするため。
 */
function packEntries(entries: TimelineEntry[]): PlacedEntry[] {
  const sorted = entries
    .filter((entry) => typeof entry.ageStartMa === 'number' && typeof entry.ageEndMa === 'number')
    .map((entry) => {
      const startX = toX(entry.ageStartMa as number);
      const endX = toX(entry.ageEndMa as number);
      return {
        ...entry,
        x: Math.min(startX, endX),
        width: Math.max(Math.abs(endX - startX), MIN_BAR_WIDTH),
      };
    })
    .sort((left, right) => left.x - right.x);

  const laneEnds: number[] = new Array(LANE_COUNT).fill(-Infinity);
  const placed: PlacedEntry[] = [];

  for (const entry of sorted) {
    let lane = laneEnds.findIndex((end) => end <= entry.x - 2);
    if (lane === -1) {
      // 空きが無ければ、いちばん早く空くレーンに重ねる。
      lane = laneEnds.indexOf(Math.min(...laneEnds));
    }
    laneEnds[lane] = entry.x + entry.width;
    placed.push({ ...entry, lane });
  }

  return placed;
}

export function renderTimeline(entries: TimelineEntry[], selectedId: string | null): string {
  const placed = packEntries(entries);
  const plotHeight = LANE_COUNT * LANE_HEIGHT;
  const height = plotHeight + AXIS_HEIGHT;
  const missing = entries.length - placed.length;

  const bands = BANDS.map((band, index) => {
    const x = toX(band.startMa);
    const width = toX(band.endMa) - x;
    return `
      <g class="timeline-band timeline-band-${index}">
        <rect x="${x.toFixed(1)}" y="0" width="${width.toFixed(1)}" height="${plotHeight}" />
        <text x="${(x + width / 2).toFixed(1)}" y="${plotHeight + 14}">${escapeHtml(band.label)}</text>
      </g>
    `;
  }).join('');

  const ticks = [250, 225, 200, 175, 150, 125, 100, 75, 66]
    .map((ma) => {
      const x = toX(ma);
      // 両端のラベルは枠外にはみ出すので内側に寄せる。
      const anchor = x < 12 ? 'start' : x > VIEW_WIDTH - 12 ? 'end' : 'middle';
      return `
        <g class="timeline-tick">
          <line x1="${x.toFixed(1)}" y1="0" x2="${x.toFixed(1)}" y2="${plotHeight}" />
          <text x="${x.toFixed(1)}" y="${plotHeight + 27}" style="text-anchor: ${anchor}">${ma}</text>
        </g>
      `;
    })
    .join('');

  const bars = placed
    .map((entry) => {
      const y = entry.lane * LANE_HEIGHT + 3;
      const isSelected = entry.id === selectedId;
      return `
        <rect
          class="timeline-bar diet-${escapeHtml(entry.dietLabel)}${isSelected ? ' is-selected' : ''}"
          data-record-id="${escapeHtml(entry.id)}"
          x="${entry.x.toFixed(1)}"
          y="${y}"
          width="${entry.width.toFixed(1)}"
          height="${LANE_HEIGHT - 6}"
          rx="1.5"
        ><title>${escapeHtml(entry.nameJa)} / ${entry.ageStartMa?.toFixed(1)}–${entry.ageEndMa?.toFixed(1)} Ma</title></rect>
      `;
    })
    .join('');

  return `
    <svg class="timeline-svg" viewBox="0 0 ${VIEW_WIDTH} ${height}" role="img" aria-label="生息年代タイムライン">
      ${bands}
      ${ticks}
      ${bars}
    </svg>
    <p class="timeline-note">単位は Ma（百万年前）。バーをクリックすると詳細を開きます。${
      missing > 0 ? `年代データ未取得 ${missing} 件は非表示です。` : ''
    }</p>
  `;
}
