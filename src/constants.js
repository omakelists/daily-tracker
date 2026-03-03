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
  ROW_PL:      14,
  ROW_PR:      14,
  BAR_SLOT:    11,
  BAR_W:        3,
  CB_W:        26,
  CB_GAP:       8,
  PAGE_M:      12,
  CARD_BORDER:  3,
};

let _idCtr = Date.now();
export const uid = () => 'i' + (_idCtr++).toString(36);
export const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
export const fmtDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Lift very dark colours so they remain legible on a dark background.
 */
export function ensureContrast(hex) {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (lum < 0.25) {
    const f = 0.62;
    return `rgb(${Math.round(r + (255 - r) * f)},${Math.round(g + (255 - g) * f)},${Math.round(b + (255 - b) * f)})`;
  }
  return hex;
}

export const DEFAULT_GAMES = [
  {
    id: 'g1', name: 'Blue Archive', color: '#4a9eff', resetTime: '05:00',
    launchUrl: '',
    tasks: [],
  },
  {
    id: 'g2', name: 'Genshin Impact', color: '#c8a96e', resetTime: '05:00',
    launchUrl: '',
    tasks: [
      { id: 't1', name: '', type: 'daily' },
      { id: 't2', name: 'HoYoLAB', type: 'webdaily', webResetTime: '01:00' },
      { id: 't3', name: 'Weekly Boss', type: 'weekly' },
      { id: 't4', name: 'Serenitea Pot', type: 'weekly' },
      { id: 't5', name: 'Imaginarium Theater', type: 'monthly', monthlyResetDay: 1 },
      { id: 't6', name: 'Spiral Abyss', type: 'monthly', monthlyResetDay: 16 },
    ],
  },
  {
    id: 'g3', name: 'Zenless Zone Zero', color: '#000000', resetTime: '05:00',
    launchUrl: '',
    tasks: [
      { id: 't7', name: '', type: 'daily' },
      { id: 't8', name: 'HoYoLAB', type: 'webdaily', webResetTime: '01:00' },
      { id: 't9', name: 'Deadly Assault', type: 'weekly' },
      { id: 't10', name: 'Hollow Zero', type: 'weekly' },
    ],
  },
  {
    id: 'g4', name: 'Arknight: Endfield', color: '#FF6666', resetTime: '05:00',
    launchUrl: '',
    tasks: [
      { id: 't11', name: '', type: 'daily' },
      { id: 't12', name: 'SKPORT', type: 'webdaily', webResetTime: '01:00' },
    ],
  },
];
