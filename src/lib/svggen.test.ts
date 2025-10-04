import { describe, expect, it } from 'vitest';
import { createStore, defaultSeal, deserializeSeal, normalizeSeal, type SealSpec } from './seal';
import { esc, sealSvg } from './svggen';

function spec(over: Partial<SealSpec> = {}): SealSpec {
  return { ...defaultSeal(), ...over };
}

describe('esc', () => {
  it('XMLに危険な文字を逃がす', () => {
    expect(esc('<花 & "印">')).toBe('&lt;花 &amp; &quot;印&quot;&gt;');
  });
});

describe('sealSvg', () => {
  it('240四方のviewBoxと主文の字を持つ', () => {
    const svg = sealSvg(spec({ text: '藤原' }));
    expect(svg).toContain('viewBox="0 0 240 240"');
    expect(svg).toContain('>藤<');
    expect(svg).toContain('>原<');
    expect(svg).toContain('role="img"');
  });

  it('朱文は朱の線で描き、マスクを使わない', () => {
    const svg = sealSvg(spec({ style: 'shubun', color: '#d2402c', weathered: false }));
    expect(svg).toContain('fill="#d2402c"');
    expect(svg).toContain('<circle');
    expect(svg).not.toContain('<mask');
  });

  it('白文は地を朱で塗り、文字をマスクで彫り抜く', () => {
    const svg = sealSvg(spec({ style: 'hakubun' }));
    expect(svg).toContain('<mask id="cut-');
    expect(svg).toContain('mask="url(#cut-');
  });

  it('角印は矩形の縁になる', () => {
    const svg = sealSvg(spec({ shape: 'square', style: 'shubun', weathered: false }));
    expect(svg).toContain('<rect');
    expect(svg).not.toContain('<circle');
  });

  it('かすれを切ると歪みフィルタを出さない', () => {
    expect(sealSvg(spec({ weathered: true }))).toContain('<filter id="weather-');
    expect(sealSvg(spec({ weathered: false }))).not.toContain('<filter');
  });

  it('回文は円弧に沿うtextPathで描く(丸印のみ)', () => {
    const svg = sealSvg(spec({ ringTop: '株式会社一', ringBottom: '代表印', weathered: false }));
    expect(svg).toContain('<textPath href="#top-');
    expect(svg).toContain('<textPath href="#bot-');
    expect(svg).toContain('株式会社一');
  });

  it('角印では回文を出さない', () => {
    const svg = sealSvg(spec({ shape: 'square', ringTop: '会社', weathered: false }));
    expect(svg).not.toContain('textPath');
  });

  it('紙地を敷くと背景の矩形が入る', () => {
    expect(sealSvg(spec({ paper: true }))).toContain('fill="#f6f1e7"');
    expect(sealSvg(spec({ paper: false }))).not.toContain('#f6f1e7');
  });

  it('主文の記号はエスケープされる', () => {
    const svg = sealSvg(spec({ text: '<&>' }));
    expect(svg).toContain('>&lt;<');
    expect(svg).toContain('>&amp;<');
  });

  it('別の主文ではID片が変わり衝突しない', () => {
    const a = sealSvg(spec({ text: '甲', style: 'hakubun' }));
    const b = sealSvg(spec({ text: '乙', style: 'hakubun' }));
    const idA = a.match(/cut-([a-z0-9]+)/)?.[1];
    const idB = b.match(/cut-([a-z0-9]+)/)?.[1];
    expect(idA).toBeDefined();
    expect(idA).not.toBe(idB);
  });
});

describe('seal serialization', () => {
  it('保存して読み戻せ、壊れたデータはnull', () => {
    const map = new Map<string, string>();
    const store = createStore({
      getItem: (k) => map.get(k) ?? null,
      setItem: (k, v) => void map.set(k, v),
    });
    expect(store.load()).toBeNull();
    store.save(spec());
    expect(store.load()).toEqual(spec());
    expect(deserializeSeal('{')).toBeNull();
    expect(deserializeSeal(JSON.stringify({ ...spec(), color: 'red' }))).toBeNull();
    expect(deserializeSeal(JSON.stringify({ ...spec(), shape: 'oval' }))).toBeNull();
  });

  it('縁の太さは0..1に丸める', () => {
    expect(normalizeSeal(spec({ border: 5 })).border).toBe(1);
    expect(normalizeSeal(spec({ border: -2 })).border).toBe(0);
  });
});
