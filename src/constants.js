// ── Task classification ────────────────────────────────────────────
export const DAILY_TYPES  = new Set(['daily']);
export const PERIOD_TYPES = new Set(['weekly', 'monthly', 'halfmonthly']);
export const EVENT_TYPES  = new Set(['event']);

// ── Time constants ────────────────────────────────────────────────
export const DAY_MS = 24 * 3600_000;  // milliseconds in one day

// ── Default data (reset times in UTC) ─────────────────────────────
export const DEFAULT_GAMES = [
  {
    id: 'g1', name: 'Blue Archive', color: '#4a9eff',
    resetTime: '19:00',
    items: [],
  },
  {
    id: 'g2', name: 'Genshin Impact', color: '#c8a96e',
    resetTime: '20:00',
    items: [
      { id: 't1',  name: '',                     type: 'daily' },
      { id: 't2',  name: 'HoYoLAB',              type: 'daily',   resetTime: '16:00' },
      { id: 't3',  name: 'Weekly Boss',          type: 'weekly' },
      { id: 't4',  name: 'Serenitea Pot',        type: 'weekly' },
      { id: 't5',  name: 'Imaginarium Theater',  type: 'monthly', monthlyResetDay: 1 },
      { id: 't6',  name: 'Spiral Abyss',         type: 'monthly', monthlyResetDay: 16 },
    ],
  },
  {
    id: 'g3', name: 'Zenless Zone Zero', color: '#000000',
    resetTime: '20:00',
    items: [
      { id: 't7',  name: '',               type: 'daily' },
      { id: 't8',  name: 'HoYoLAB',        type: 'daily', resetTime: '16:00' },
      { id: 't9',  name: 'Notorious Hunt', type: 'weekly' },
      { id: 't10', name: 'Hollow Zero',    type: 'weekly' },
    ],
  },
  {
    id: 'g4', name: 'Arknight: Endfield', color: '#FF6666',
    resetTime: '20:00',
    items: [
      { id: 't11', name: '',       type: 'daily' },
      { id: 't12', name: 'SKPORT', type: 'daily', resetTime: '16:00' },
    ],
  },
];
