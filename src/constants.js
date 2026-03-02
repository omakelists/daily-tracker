export const TYPE_COLORS = {
  daily:       '#58a6ff',
  weekly:      '#bc8cff',
  webdaily:    '#3fb950',
  monthly:     '#ff7b72',
  halfmonthly: '#ffa657',
};

/** Task types that show yesterday's bar and affect master checkbox / calendar */
export const DAILY_TYPES  = new Set(['daily', 'webdaily']);
/** Task types that are periodic (no prev-bar, no calendar impact) */
export const PERIOD_TYPES = new Set(['weekly', 'monthly', 'halfmonthly']);

/** Layout pixel constants shared across components */
export const L = {
  ROW_PL:      14,  // row left padding
  ROW_PR:      14,  // row right padding
  BAR_SLOT:    11,  // prev-bar column width
  BAR_W:        3,  // prev-bar visual width
  CB_W:        26,  // checkbox width
  CB_GAP:       8,  // gap between checkbox and content
  PAGE_M:      12,  // page outer margin
  CARD_BORDER:  3,  // card left border width
};

let _idCtr = Date.now();
export const uid = () => 'i' + (_idCtr++).toString(36);
export const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
export const fmtDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

/**
 * Ensure a hex colour has enough brightness to be readable on dark backgrounds.
 * Returns a lightened RGB string if the colour is too dark.
 */
export function ensureContrast(hex) {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return hex;
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  const lum = (0.299*r + 0.587*g + 0.114*b) / 255;
  if (lum < 0.25) {
    const f = 0.62;
    return `rgb(${Math.round(r+(255-r)*f)},${Math.round(g+(255-g)*f)},${Math.round(b+(255-b)*f)})`;
  }
  return hex;
}

export const DEFAULT_GAMES = [
  {
    id: 'g1', name: 'Blue Archive', color: '#4a9eff', resetTime: '05:00',
    launchUrl: 'https://bluearchive.jp/',
    tasks: [
      { id: 't1', name: '', type: 'daily' },
      { id: 't2', name: '', type: 'weekly' },
      { id: 't3', name: 'Café', type: 'webdaily', webResetTime: '00:00', url: 'https://bluearchive.jp/' },
    ],
  },
  {
    id: 'g2', name: 'Genshin Impact', color: '#c8a96e', resetTime: '05:00',
    launchUrl: '',
    tasks: [
      { id: 't4', name: '', type: 'daily' },
      { id: 't5', name: '', type: 'weekly' },
    ],
  },
];
