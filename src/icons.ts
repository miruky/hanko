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
} as const;
