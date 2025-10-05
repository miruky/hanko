import { describe, expect, it } from 'vitest';
import { defaultSeal, isSealSpec, randomSeal } from './seal';

describe('randomSeal', () => {
  it('内容(主文・回文・紙地)は base から引き継ぐ', () => {
    const base = { ...defaultSeal(), text: '山田太郎', ringTop: '会社', ringBottom: '印', paper: true };
    const out = randomSeal(base, () => 0.5);
    expect(out.text).toBe('山田太郎');
    expect(out.ringTop).toBe('会社');
    expect(out.ringBottom).toBe('印');
    expect(out.paper).toBe(true);
  });

  it('常に妥当な spec を返す', () => {
    for (const r of [0, 0.25, 0.5, 0.75, 0.999]) {
      expect(isSealSpec(randomSeal(defaultSeal(), () => r))).toBe(true);
    }
  });

  it('rand=0 は各候補の先頭を選ぶ', () => {
    const out = randomSeal(defaultSeal(), () => 0);
    expect(out.shape).toBe('circle');
    expect(out.style).toBe('shubun');
    expect(out.font).toBe('mincho');
    expect(out.layout).toBe('auto');
    expect(out.border).toBe(0);
    expect(out.weathered).toBe(true);
  });

  it('rand≈1 は各候補の末尾を選び、縁は最大', () => {
    const out = randomSeal(defaultSeal(), () => 0.999);
    expect(out.shape).toBe('square');
    expect(out.style).toBe('hakubun');
    expect(out.font).toBe('gothic');
    expect(out.layout).toBe('grid');
    expect(out.border).toBe(1);
    expect(out.weathered).toBe(false);
  });
});
