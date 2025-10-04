// UIの線画アイコン。24pxグリッド・stroke=currentColorで統一し、隣に必ず
// テキストラベルを置く前提で、すべて装飾(aria-hidden)として出力する。

const svg = (body: string): string =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ` +
  `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;

export const icons = {
  logo: svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/>'),
  download: svg('<path d="M12 4v11"/><path d="m7 11 5 5 5-5"/><path d="M5 20h14"/>'),
  copy: svg('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>'),
  reset: svg('<path d="M4 4v6h6"/><path d="M4 10a8 8 0 1 1-1 4"/>'),
  shuffle: svg('<path d="M4 7h3l10 10h3"/><path d="M17 7h3M4 17h3l3-3"/><path d="M17 4l3 3-3 3M17 20l3-3-3-3"/>'),
  themeAuto: svg(
    '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none"/>',
  ),
  themeLight: svg(
    '<circle cx="12" cy="12" r="4"/>' +
      '<path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19"/>',
  ),
  themeDark: svg('<path d="M20.5 14.6A8 8 0 0 1 9.4 3.5 7 7 0 1 0 20.5 14.6z"/>'),
} as const;
