// 印影の仕様(何を彫るか)と、その検証・永続化。描画は svggen.ts に分離する。

/** 丸印か角印か */
export type SealShape = 'circle' | 'square';

/**
 * 朱文(陽刻)= 文字と縁が朱で残り地は彫り抜く。日常の認印に多い。
 * 白文(陰刻)= 文字を彫り抜き地を朱で埋める。落款や実印に多い。
 */
export type SealStyle = 'shubun' | 'hakubun';

/** 主文の並べ方。auto は字数から縦書き・格子を選ぶ */
export type SealLayout = 'auto' | 'vertical' | 'horizontal' | 'grid';

/** 字面。明朝の方が篆刻らしく、ゴシックは現代的な印に向く */
export type SealFont = 'mincho' | 'gothic';

export interface SealSpec {
  /** 主文(中央に彫る文字。姓名・雅号など) */
  text: string;
  shape: SealShape;
  style: SealStyle;
  layout: SealLayout;
  font: SealFont;
  /** 朱色(#rrggbb) */
  color: string;
  /** 縁の太さ。0(細)〜1(太) */
  border: number;
  /** かすれ・摩耗の風合いを付けるか */
  weathered: boolean;
  /** 回文(上弧)。丸印のときだけ意味を持つ。社名など */
  ringTop: string;
  /** 回文(下弧)。丸印のときだけ意味を持つ。「代表者印」など */
  ringBottom: string;
  /** 透過の代わりに紙地を敷くか */
  paper: boolean;
}

const COLOR_RE = /^#[0-9a-f]{6}$/i;
const SHAPES: readonly SealShape[] = ['circle', 'square'];
const STYLES: readonly SealStyle[] = ['shubun', 'hakubun'];
const LAYOUTS: readonly SealLayout[] = ['auto', 'vertical', 'horizontal', 'grid'];
const FONTS: readonly SealFont[] = ['mincho', 'gothic'];

/** 主文に置ける最大字数。これを超えると縁に収まらない */
export const MAX_CHARS = 9;

/** よく使う朱肉・墨・藍の色 */
export const COLOR_PRESETS: readonly { name: string; value: string }[] = [
  { name: '朱', value: '#d2402c' },
  { name: '真朱', value: '#b0392e' },
  { name: '古印', value: '#9c3b2a' },
  { name: '洗朱', value: '#d97a63' },
  { name: '墨', value: '#2b2723' },
  { name: '藍', value: '#2c4a6e' },
];

export function defaultSeal(): SealSpec {
  return {
    text: '藤原',
    shape: 'circle',
    style: 'shubun',
    layout: 'auto',
    font: 'mincho',
    color: '#d2402c',
    border: 0.5,
    weathered: true,
    ringTop: '',
    ringBottom: '',
    paper: false,
  };
}

export function isSealSpec(value: unknown): value is SealSpec {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.text === 'string' &&
    typeof s.shape === 'string' &&
    (SHAPES as readonly string[]).includes(s.shape) &&
    typeof s.style === 'string' &&
    (STYLES as readonly string[]).includes(s.style) &&
    typeof s.layout === 'string' &&
    (LAYOUTS as readonly string[]).includes(s.layout) &&
    typeof s.font === 'string' &&
    (FONTS as readonly string[]).includes(s.font) &&
    typeof s.color === 'string' &&
    COLOR_RE.test(s.color) &&
    typeof s.border === 'number' &&
    Number.isFinite(s.border) &&
    typeof s.weathered === 'boolean' &&
    typeof s.ringTop === 'string' &&
    typeof s.ringBottom === 'string' &&
    typeof s.paper === 'boolean'
  );
}

/** 不正値を既定値へ寄せて安全な spec にする */
export function normalizeSeal(spec: SealSpec): SealSpec {
  return { ...spec, border: Math.min(1, Math.max(0, spec.border)) };
}

/**
 * 見た目だけをランダムに振った spec を返す。主文・回文・紙地などの内容は base から
 * 引き継ぎ、形・彫り・字面・並べ方・色・縁・かすれを選び直す。rand は 0〜1 を返す関数で、
 * テストでは固定値を渡して結果を確かめられる。
 */
export function randomSeal(base: SealSpec, rand: () => number = Math.random): SealSpec {
  const pick = <T>(arr: readonly T[]): T =>
    arr[Math.min(arr.length - 1, Math.floor(rand() * arr.length))]!;
  return normalizeSeal({
    ...base,
    shape: pick(SHAPES),
    style: pick(STYLES),
    font: pick(FONTS),
    layout: pick(LAYOUTS),
    color: pick(COLOR_PRESETS).value,
    // 0〜1 を 0.05 刻みに丸める
    border: Math.round(rand() * 20) / 20,
    weathered: rand() < 0.6,
  });
}

export function deserializeSeal(json: string): SealSpec | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  return isSealSpec(parsed) ? normalizeSeal(parsed) : null;
}

export interface SealStore {
  load(): SealSpec | null;
  save(spec: SealSpec): void;
}

const STORAGE_KEY = 'hanko.seal.v1';

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function createStore(storage: StorageLike): SealStore {
  return {
    load() {
      const raw = storage.getItem(STORAGE_KEY);
      return raw === null ? null : deserializeSeal(raw);
    },
    save(spec) {
      storage.setItem(STORAGE_KEY, JSON.stringify(spec));
    },
  };
}
