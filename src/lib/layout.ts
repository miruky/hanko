// 主文の字を升目に割り付ける。縦書きの読み順(右の列から、列の中は上から下)に従う。
// 座標は中心を原点とする [-1, 1] の正規化値で返し、実寸への変換は svggen.ts が担う。

import type { SealLayout } from './seal';

export interface Cell {
  ch: string;
  /** 水平位置(-1=左端 .. 1=右端) */
  cx: number;
  /** 垂直位置(-1=上端 .. 1=下端) */
  cy: number;
}

export interface Grid {
  cells: Cell[];
  cols: number;
  rows: number;
}

/** 空白を除いた一文字ずつの配列。サロゲートペアも1字として扱う */
export function sealChars(text: string): string[] {
  return Array.from(text).filter((c) => c.trim() !== '');
}

/** 字数と並べ方から列数を決める */
export function resolveColumns(n: number, layout: SealLayout): number {
  if (n <= 1) return 1;
  switch (layout) {
    case 'vertical':
      return 1;
    case 'horizontal':
      return n;
    case 'grid':
      return Math.min(n, Math.max(2, Math.round(Math.sqrt(n))));
    case 'auto':
    default:
      if (n <= 3) return 1;
      if (n <= 6) return 2;
      return 3;
  }
}

/**
 * 主文を升目に配置する。右の列ほど先の字を持ち、列の中では上から下へ並ぶ。
 * 例として「山田太郎」は右列に山・田、左列に太・郎と入り、伝統的な読み順になる。
 */
export function arrange(text: string, layout: SealLayout): Grid {
  const chars = sealChars(text);
  const n = chars.length;
  if (n === 0) return { cells: [], cols: 0, rows: 0 };

  const cols = resolveColumns(n, layout);
  const base = Math.floor(n / cols);
  const rem = n % cols;
  // 端数は右(先に読む)の列へ寄せる
  const colSizes = Array.from({ length: cols }, (_, i) => base + (i < rem ? 1 : 0));
  const rows = Math.max(...colSizes);

  const colGap = 2 / cols;
  const rowGap = 2 / rows;
  const cells: Cell[] = [];
  let idx = 0;
  for (let i = 0; i < cols; i++) {
    const k = colSizes[i] ?? 0;
    const cx = 1 - colGap / 2 - i * colGap; // i=0 が右端
    for (let j = 0; j < k; j++) {
      const cy = (j - (k - 1) / 2) * rowGap; // 列の字数で上下中央寄せ
      cells.push({ ch: chars[idx] ?? '', cx, cy });
      idx++;
    }
  }
  return { cells, cols, rows };
}
