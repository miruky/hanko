import { describe, expect, it } from 'vitest';
import { arrange, resolveColumns, sealChars } from './layout';

describe('sealChars', () => {
  it('空白を除いて一文字ずつに分ける', () => {
    expect(sealChars('山田 太郎')).toEqual(['山', '田', '太', '郎']);
  });

  it('サロゲートペアを1字として扱う', () => {
    expect(sealChars('𩸽')).toHaveLength(1);
  });
});

describe('resolveColumns', () => {
  it('autoは字数で列を選ぶ', () => {
    expect(resolveColumns(1, 'auto')).toBe(1);
    expect(resolveColumns(3, 'auto')).toBe(1);
    expect(resolveColumns(4, 'auto')).toBe(2);
    expect(resolveColumns(6, 'auto')).toBe(2);
    expect(resolveColumns(9, 'auto')).toBe(3);
  });

  it('縦書きは常に1列、横書きは字数ぶんの列', () => {
    expect(resolveColumns(5, 'vertical')).toBe(1);
    expect(resolveColumns(5, 'horizontal')).toBe(5);
  });

  it('格子は概ね正方に近い列数', () => {
    expect(resolveColumns(4, 'grid')).toBe(2);
    expect(resolveColumns(9, 'grid')).toBe(3);
  });
});

describe('arrange', () => {
  it('1字は中央に置く', () => {
    const g = arrange('印', 'auto');
    expect(g.cells).toHaveLength(1);
    expect(g.cells[0]).toMatchObject({ ch: '印', cx: 0, cy: 0 });
  });

  it('2字は縦に積む', () => {
    const g = arrange('藤原', 'auto');
    expect(g.cols).toBe(1);
    expect(g.cells.map((c) => c.ch)).toEqual(['藤', '原']);
    expect(g.cells[0]!.cy).toBeLessThan(g.cells[1]!.cy);
    expect(g.cells.every((c) => c.cx === 0)).toBe(true);
  });

  it('4字は右の列から上下、次に左の列の順に読む', () => {
    const g = arrange('山田太郎', 'auto');
    expect(g.cols).toBe(2);
    expect(g.rows).toBe(2);
    const [a, b, c, d] = g.cells;
    // 右列(cx>0)に山・田、左列(cx<0)に太・郎
    expect(a).toMatchObject({ ch: '山' });
    expect(a!.cx).toBeGreaterThan(0);
    expect(b).toMatchObject({ ch: '田' });
    expect(b!.cx).toBeGreaterThan(0);
    expect(c!.cx).toBeLessThan(0);
    expect(d!.cx).toBeLessThan(0);
    // 列内は上から下
    expect(a!.cy).toBeLessThan(b!.cy);
  });

  it('端数は右の列に寄せる', () => {
    const g = arrange('一二三四五', 'grid');
    expect(g.cols).toBe(2);
    const right = g.cells.filter((c) => c.cx > 0);
    const left = g.cells.filter((c) => c.cx < 0);
    expect(right).toHaveLength(3);
    expect(left).toHaveLength(2);
  });

  it('空文字は空の升目', () => {
    expect(arrange('   ', 'auto')).toEqual({ cells: [], cols: 0, rows: 0 });
  });
});
