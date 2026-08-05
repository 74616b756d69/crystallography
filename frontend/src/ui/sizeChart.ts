const VIEW_WIDTH = 660;
const VIEW_HEIGHT = 160;
const BASELINE = 120;
const HUMAN_HEIGHT_M = 1.7;
const HUMAN_SLOT_WIDTH = 46;
const BAR_START_X = HUMAN_SLOT_WIDTH + 8;
/** 人型が枠を突き抜けないよう、1m あたりのピクセル数に上限を置く。 */
const MAX_PX_PER_METER = 52;

/**
 * ヒト（1.7m）と同じ縮尺で体長バーを並べる。
 * 「12.3m」と数字で書くより体格が直感的に伝わる。
 */
export function renderSizeChart(lengthMeters: number, massEstimateKg: number): string {
  const scaleMax = Math.max(Math.ceil(lengthMeters * 1.12), 4);
  const pxPerMeter = Math.min((VIEW_WIDTH - BAR_START_X - 90) / scaleMax, MAX_PX_PER_METER);

  const barWidth = Math.max(lengthMeters * pxPerMeter, 2);
  const humanHeight = HUMAN_HEIGHT_M * pxPerMeter;
  const barHeight = 20;

  const tickStep = scaleMax > 30 ? 10 : scaleMax > 12 ? 5 : 1;
  const ticks: string[] = [];
  for (let meters = 0; meters <= scaleMax; meters += tickStep) {
    const x = BAR_START_X + meters * pxPerMeter;
    ticks.push(`
      <g class="size-tick">
        <line x1="${x.toFixed(1)}" y1="${BASELINE}" x2="${x.toFixed(1)}" y2="${BASELINE + 6}" />
        <text x="${x.toFixed(1)}" y="${BASELINE + 19}">${meters}m</text>
      </g>
    `);
  }

  // 100 単位で描いた人型を、そのときの縮尺に合わせて縮める。
  const humanScale = humanHeight / 100;
  const human = `
    <g class="size-human" transform="translate(12 ${BASELINE}) scale(${humanScale.toFixed(4)})">
      <circle cx="24" cy="-88" r="9" />
      <path d="M14 -76 L34 -76 L40 -70 L46 -46 L38 -43 L33 -60 L33 -42 L36 0 L27 0 L24 -30 L21 0 L12 0 L15 -42 L15 -60 L10 -43 L2 -46 L8 -70 Z" />
      <title>ヒト 1.7m</title>
    </g>
  `;

  return `
    <svg class="size-svg" viewBox="0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}" role="img" aria-label="体長比較">
      <line class="size-baseline" x1="6" y1="${BASELINE}" x2="${VIEW_WIDTH - 10}" y2="${BASELINE}" />
      ${ticks.join('')}
      ${human}
      <text class="size-human-label" x="12" y="${(BASELINE - humanHeight - 8).toFixed(1)}">ヒト 1.7m</text>
      <rect
        class="size-bar"
        x="${BAR_START_X}"
        y="${BASELINE - barHeight}"
        width="${barWidth.toFixed(1)}"
        height="${barHeight}"
        rx="2"
      />
      <text class="size-bar-label" x="${(BAR_START_X + barWidth + 10).toFixed(1)}" y="${BASELINE - 5}">${lengthMeters.toFixed(1)}m / ${Math.round(massEstimateKg).toLocaleString()}kg</text>
    </svg>
  `;
}
