// 画面の描画。入力のたびに印影を作り直してプレビューに反映する。
// 字面や形など見た目の選択はボタンの活性を切り替えるため再描画し、
// 文字入力やスライダは焦点を失わないようプレビューだけを更新する。

import {
  COLOR_PRESETS,
  MAX_CHARS,
  type SealFont,
  type SealLayout,
  type SealShape,
  type SealSpec,
  type SealStore,
  type SealStyle,
} from './lib/seal';
import { modeLabel, type ThemeMode, ThemeController } from './lib/theme';
import { sealSvg } from './lib/svggen';
import { icons } from './icons';

const THEME_ICONS: Record<ThemeMode, string> = {
  auto: icons.themeAuto,
  light: icons.themeLight,
  dark: icons.themeDark,
};

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function esc(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => ESCAPES[ch] ?? ch);
}

interface Choice<T extends string> {
  value: T;
  label: string;
}

const SHAPES: Choice<SealShape>[] = [
  { value: 'circle', label: '丸印' },
  { value: 'square', label: '角印' },
];
const STYLES: Choice<SealStyle>[] = [
  { value: 'shubun', label: '朱文' },
  { value: 'hakubun', label: '白文' },
];
const FONTS: Choice<SealFont>[] = [
  { value: 'mincho', label: '明朝' },
  { value: 'gothic', label: 'ゴシック' },
];
const LAYOUTS: Choice<SealLayout>[] = [
  { value: 'auto', label: '自動' },
  { value: 'vertical', label: '縦' },
  { value: 'horizontal', label: '横' },
  { value: 'grid', label: '格子' },
];

export interface AppDeps {
  root: HTMLElement;
  store: SealStore;
  initialSeal: SealSpec;
}

export function createApp({ root, store, initialSeal }: AppDeps): void {
  const seal = initialSeal;
  const theme = new ThemeController();

  function save(): void {
    store.save(seal);
  }

  function updatePreview(): void {
    const stage = root.querySelector<HTMLElement>('#preview');
    if (stage) stage.innerHTML = sealSvg(seal);
  }

  function download(): void {
    const name = (seal.text.trim() === '' ? 'hanko' : seal.text.trim()) + '.svg';
    const url = URL.createObjectURL(new Blob([sealSvg(seal)], { type: 'image/svg+xml' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copy(button: HTMLElement): Promise<void> {
    try {
      await navigator.clipboard.writeText(sealSvg(seal));
      const span = button.querySelector('span');
      if (span) {
        const prev = span.textContent;
        span.textContent = 'コピーした';
        window.setTimeout(() => (span.textContent = prev), 1400);
      }
    } catch {
      // クリップボードが使えない環境では何もしない
    }
  }

  function segmented<T extends string>(
    key: keyof SealSpec,
    choices: Choice<T>[],
    current: T,
    disabled = false,
  ): string {
    const buttons = choices
      .map(
        (c) =>
          `<button type="button" role="radio" aria-checked="${c.value === current}" ` +
          `class="seg ${c.value === current ? 'active' : ''}" data-key="${key}" data-value="${c.value}"` +
          `${disabled ? ' disabled' : ''}>${c.label}</button>`,
      )
      .join('');
    return `<div class="segmented" role="radiogroup">${buttons}</div>`;
  }

  function swatches(): string {
    const items = COLOR_PRESETS.map(
      (c) =>
        `<button type="button" class="swatch ${c.value === seal.color ? 'active' : ''}" ` +
        `data-color="${c.value}" style="--swatch:${c.value}" aria-label="${c.name} ${c.value}"></button>`,
    ).join('');
    return `${items}<label class="custom-color"><input type="color" id="color-custom" value="${esc(seal.color)}" aria-label="自由な色"/></label>`;
  }

  function render(): void {
    const ringDisabled = seal.shape === 'square';
    root.innerHTML = `
      <header class="site-header">
        <div class="site-header-inner">
          <span class="brand">${icons.logo}<span class="brand-text"><span class="brand-kicker">篆刻 / Seal</span><span class="brand-name">hanko</span></span></span>
          <div class="header-right">
            <span class="tagline">テキストから印影をつくる</span>
            <button type="button" class="icon-button" id="theme-toggle"
              aria-label="配色テーマ: ${modeLabel(theme.mode)}(クリックで切り替え)">${THEME_ICONS[theme.mode]}</button>
          </div>
        </div>
      </header>
      <main class="site-main">
        <div class="workspace">
          <section class="panel form-panel" aria-label="印影の設定">
            <label class="field"><span>主文(${MAX_CHARS}字まで)</span>
              <input id="text" value="${esc(seal.text)}" maxlength="${MAX_CHARS}" placeholder="姓名・雅号" autocomplete="off"/></label>

            <div class="row">
              <div class="control"><span class="control-label">形</span>${segmented('shape', SHAPES, seal.shape)}</div>
              <div class="control"><span class="control-label">彫り</span>${segmented('style', STYLES, seal.style)}</div>
            </div>
            <div class="row">
              <div class="control"><span class="control-label">字面</span>${segmented('font', FONTS, seal.font)}</div>
              <div class="control"><span class="control-label">並べ方</span>${segmented('layout', LAYOUTS, seal.layout)}</div>
            </div>

            <div class="control">
              <span class="control-label">朱色</span>
              <div class="swatches" role="group" aria-label="色">${swatches()}</div>
            </div>

            <label class="field slider"><span>縁の太さ</span>
              <input type="range" id="border" min="0" max="1" step="0.05" value="${seal.border}"/></label>

            <div class="toggles">
              <label class="toggle"><input type="checkbox" id="weathered" ${seal.weathered ? 'checked' : ''}/><span>かすれ</span></label>
              <label class="toggle"><input type="checkbox" id="paper" ${seal.paper ? 'checked' : ''}/><span>紙地を敷く</span></label>
            </div>

            <fieldset class="ring" ${ringDisabled ? 'disabled' : ''}>
              <legend>回文(丸印の縁に沿う文字)</legend>
              <label class="field"><span>上弧</span>
                <input id="ringTop" value="${esc(seal.ringTop)}" placeholder="社名など" autocomplete="off"/></label>
              <label class="field"><span>下弧</span>
                <input id="ringBottom" value="${esc(seal.ringBottom)}" placeholder="代表者印など" autocomplete="off"/></label>
              ${ringDisabled ? '<p class="hint">回文は丸印のときに使えます。</p>' : ''}
            </fieldset>
          </section>

          <section class="panel preview-panel">
            <div class="preview-stage"><div id="preview" class="preview"></div></div>
            <div class="actions">
              <button type="button" class="button" id="download">${icons.download}<span>SVGを保存</span></button>
              <button type="button" class="button ghost" id="copy">${icons.copy}<span>SVGをコピー</span></button>
            </div>
          </section>
        </div>
      </main>
      <footer class="site-footer">
        <p>hanko — テキストから印影風のSVGをつくる。入力はこの端末のブラウザにだけ残り、外部には送りません。</p>
      </footer>`;
    bindEvents();
    updatePreview();
  }

  function setFromSegment(key: keyof SealSpec, value: string): void {
    // segmented の値は型に対応する文字列なので安全に代入できる
    (seal[key] as string) = value;
    save();
    render();
  }

  function bindEvents(): void {
    root.querySelector<HTMLInputElement>('#text')?.addEventListener('input', (e) => {
      seal.text = (e.target as HTMLInputElement).value;
      save();
      updatePreview();
    });

    for (const el of root.querySelectorAll<HTMLButtonElement>('.seg')) {
      el.addEventListener('click', () => {
        const key = el.dataset.key as keyof SealSpec;
        setFromSegment(key, el.dataset.value ?? '');
      });
    }

    for (const el of root.querySelectorAll<HTMLElement>('[data-color]')) {
      el.addEventListener('click', () => {
        seal.color = el.dataset.color ?? seal.color;
        save();
        render();
      });
    }
    root.querySelector<HTMLInputElement>('#color-custom')?.addEventListener('input', (e) => {
      seal.color = (e.target as HTMLInputElement).value;
      save();
      updatePreview();
    });
    root
      .querySelector<HTMLInputElement>('#color-custom')
      ?.addEventListener('change', () => render());

    root.querySelector<HTMLInputElement>('#border')?.addEventListener('input', (e) => {
      seal.border = Number((e.target as HTMLInputElement).value);
      save();
      updatePreview();
    });

    root.querySelector<HTMLInputElement>('#weathered')?.addEventListener('change', (e) => {
      seal.weathered = (e.target as HTMLInputElement).checked;
      save();
      updatePreview();
    });
    root.querySelector<HTMLInputElement>('#paper')?.addEventListener('change', (e) => {
      seal.paper = (e.target as HTMLInputElement).checked;
      save();
      updatePreview();
    });

    for (const id of ['ringTop', 'ringBottom'] as const) {
      root.querySelector<HTMLInputElement>(`#${id}`)?.addEventListener('input', (e) => {
        seal[id] = (e.target as HTMLInputElement).value;
        save();
        updatePreview();
      });
    }

    root.querySelector('#download')?.addEventListener('click', () => download());
    root.querySelector<HTMLElement>('#copy')?.addEventListener('click', (e) => {
      void copy(e.currentTarget as HTMLElement);
    });

    const themeBtn = root.querySelector<HTMLButtonElement>('#theme-toggle');
    themeBtn?.addEventListener('click', () => {
      const mode = theme.cycle();
      themeBtn.innerHTML = THEME_ICONS[mode];
      themeBtn.setAttribute('aria-label', `配色テーマ: ${modeLabel(mode)}(クリックで切り替え)`);
    });
  }

  render();
}
