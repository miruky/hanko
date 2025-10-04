// 印影の SVG 生成。文字はパス化せず text 要素のまま埋め込み、字面は閲覧環境の
// フォントに委ねる。朱文は朱の線として、白文は朱の地をマスクで彫り抜いて表す。

import { arrange, type Grid } from './layout';
import type { SealFont, SealSpec } from './seal';

const SIZE = 240;
const C = SIZE / 2;

const FONTS: Record<SealFont, string> = {
  mincho: "'Yu Mincho', 'YuMincho', 'Hiragino Mincho ProN', 'Noto Serif JP', 'Songti SC', serif",
  gothic: "'Hiragino Sans', 'Noto Sans JP', 'Yu Gothic', 'YuGothic', system-ui, sans-serif",
};

export function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 仕様から決まる安定したID片。同一ページに複数の印影を貼っても衝突しない */
function uid(spec: SealSpec): string {
  let h = 2166136261;
  const s = JSON.stringify(spec);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

interface Geometry {
  /** 縁の外周半径(角印では中心からの辺までの距離) */
  outer: number;
  /** 縁の太さ(px) */
  stroke: number;
  /** 主文の升目が届く半径(px) */
  reach: number;
  /** 回文と主文を仕切る円の半径。回文がなければ null */
  divider: number | null;
}

function geometry(spec: SealSpec, hasRing: boolean): Geometry {
  const stroke = 3 + spec.border * 8;
  if (spec.shape === 'square') {
    return { outer: 104, stroke, reach: 80, divider: null };
  }
  if (hasRing) {
    const divider = 110 - 34;
    return { outer: 110, stroke, reach: divider - 22, divider };
  }
  return { outer: 110, stroke, reach: 74, divider: null };
}

/** 主文の text 要素群。fill は親グループから継承させる */
function glyphs(grid: Grid, reach: number, font: SealFont): string {
  if (grid.cells.length === 0) return '';
  const fontSize = ((2 * reach) / Math.max(grid.cols, grid.rows)) * 0.82;
  const ff = FONTS[font];
  return grid.cells
    .map((cell) => {
      const x = (C + cell.cx * reach).toFixed(1);
      const y = (C + cell.cy * reach).toFixed(1);
      return `<text x="${x}" y="${y}" font-size="${fontSize.toFixed(1)}" font-family="${ff}" font-weight="700" text-anchor="middle" dominant-baseline="central">${esc(cell.ch)}</text>`;
    })
    .join('\n  ');
}

/** 縁の図形。fill="none" の輪郭線として描く(朱文の縁) */
function borderOutline(spec: SealSpec, g: Geometry): string {
  const r = g.outer - g.stroke / 2;
  if (spec.shape === 'square') {
    const x = C - r;
    return `<rect x="${x.toFixed(1)}" y="${x.toFixed(1)}" width="${(r * 2).toFixed(1)}" height="${(r * 2).toFixed(1)}" rx="14" fill="none" stroke="${spec.color}" stroke-width="${g.stroke.toFixed(1)}"/>`;
  }
  return `<circle cx="${C}" cy="${C}" r="${r.toFixed(1)}" fill="none" stroke="${spec.color}" stroke-width="${g.stroke.toFixed(1)}"/>`;
}

/** 地を塗る図形。白文では朱で塗る本体に、マスク内では白い領域に使う */
function fieldShape(spec: SealSpec, g: Geometry, fill: string, extra = ''): string {
  const attr = extra === '' ? '' : ` ${extra}`;
  if (spec.shape === 'square') {
    const x = C - g.outer;
    return `<rect x="${x}" y="${x}" width="${g.outer * 2}" height="${g.outer * 2}" rx="18" fill="${fill}"${attr}/>`;
  }
  return `<circle cx="${C}" cy="${C}" r="${g.outer}" fill="${fill}"${attr}/>`;
}

const RING_FONT = 19;

function ringPaths(id: string, ringR: number): string {
  const top = `M ${C - ringR} ${C} A ${ringR} ${ringR} 0 0 1 ${C + ringR} ${C}`;
  const bot = `M ${C - ringR} ${C} A ${ringR} ${ringR} 0 0 0 ${C + ringR} ${C}`;
  return `<path id="top-${id}" d="${top}"/><path id="bot-${id}" d="${bot}"/>`;
}

function ringText(spec: SealSpec, id: string): string {
  const ff = FONTS[spec.font];
  const parts: string[] = [];
  const common = `font-family="${ff}" font-size="${RING_FONT}" font-weight="700" letter-spacing="3" text-anchor="middle"`;
  if (spec.ringTop.trim() !== '') {
    parts.push(
      `<text ${common}><textPath href="#top-${id}" startOffset="50%">${esc(spec.ringTop)}</textPath></text>`,
    );
  }
  if (spec.ringBottom.trim() !== '') {
    parts.push(
      `<text ${common}><textPath href="#bot-${id}" startOffset="50%">${esc(spec.ringBottom)}</textPath></text>`,
    );
  }
  return parts.join('\n  ');
}

/** かすれの風合い。輪郭を僅かに歪ませ、斑に朱を欠けさせる */
function weatherFilter(id: string, seed: number): string {
  return `<filter id="weather-${id}" x="-12%" y="-12%" width="124%" height="124%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="3" seed="${seed}" result="warp"/>
    <feDisplacementMap in="SourceGraphic" in2="warp" scale="4.5" xChannelSelector="R" yChannelSelector="G" result="rough"/>
    <feTurbulence type="turbulence" baseFrequency="0.6" numOctaves="2" seed="${seed + 7}" result="grain"/>
    <feComponentTransfer in="grain" result="speck"><feFuncA type="discrete" tableValues="0 0 0 0 0 0 1 1"/></feComponentTransfer>
    <feComposite in="rough" in2="speck" operator="out"/>
  </filter>`;
}

export function sealSvg(spec: SealSpec): string {
  const id = uid(spec);
  const hasRing =
    spec.shape === 'circle' && (spec.ringTop.trim() !== '' || spec.ringBottom.trim() !== '');
  const g = geometry(spec, hasRing);
  const grid = arrange(spec.text, spec.layout);
  const body = glyphs(grid, g.reach, spec.font);

  const defs: string[] = [];
  const seed = parseInt(id.slice(0, 4), 36) % 100;
  if (spec.weathered) defs.push(weatherFilter(id, seed));

  const ringR = g.outer - 16;
  if (hasRing) defs.push(ringPaths(id, ringR));

  let visible: string;
  if (spec.style === 'hakubun') {
    // 地を朱で塗り、主文・回文・縁の隙間を彫り抜く
    const knock: string[] = [`<g fill="#000" font-family="${FONTS[spec.font]}">${body}</g>`];
    if (g.stroke > 0) {
      // 縁のすぐ内側に細い彫り抜きの輪を作り、縁取りに見せる
      const r = g.outer - g.stroke - 3;
      if (spec.shape === 'square') {
        const x = C - r;
        knock.push(
          `<rect x="${x.toFixed(1)}" y="${x.toFixed(1)}" width="${(r * 2).toFixed(1)}" height="${(r * 2).toFixed(1)}" rx="12" fill="none" stroke="#000" stroke-width="2.5"/>`,
        );
      } else {
        knock.push(
          `<circle cx="${C}" cy="${C}" r="${r.toFixed(1)}" fill="none" stroke="#000" stroke-width="2.5"/>`,
        );
      }
    }
    if (hasRing) knock.push(`<g fill="#000">${ringText(spec, id)}</g>`);
    defs.push(
      `<mask id="cut-${id}">${fieldShape(spec, g, '#fff')}\n  ${knock.join('\n  ')}\n</mask>`,
    );
    visible = fieldShape(spec, g, spec.color, `mask="url(#cut-${id})"`);
  } else {
    // 朱文: 縁・主文・回文を朱の線で描き、地は透ける
    const ring = hasRing ? `\n  <g fill="${spec.color}">${ringText(spec, id)}</g>` : '';
    visible = `<g fill="${spec.color}">
  ${borderOutline(spec, g)}
  ${body}${ring}
</g>`;
  }

  const wrapped = spec.weathered ? `<g filter="url(#weather-${id})">\n  ${visible}\n</g>` : visible;
  const paper = spec.paper
    ? `<rect width="${SIZE}" height="${SIZE}" rx="20" fill="#f6f1e7"/>\n  `
    : '';
  const defsBlock = defs.length > 0 ? `<defs>\n  ${defs.join('\n  ')}\n  </defs>\n  ` : '';
  const label = spec.text.trim() === '' ? '印影' : `${spec.text} の印影`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" role="img" aria-label="${esc(label)}">
  <title>${esc(label)}</title>
  ${defsBlock}${paper}${wrapped}
</svg>`;
}
