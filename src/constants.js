// ── Task classification ────────────────────────────────────────────
// TYPE_COLORS removed — use CSS classes .type-badge-{type} from style.css
export const DAILY_TYPES  = new Set(['daily']);
export const PERIOD_TYPES = new Set(['weekly', 'monthly', 'halfmonthly']);
export const EVENT_TYPES  = new Set(['event', 'todo']);

// Pre-built arrays for type select options (derived from Sets above)
export const DAILY_TYPE_OPTS  = [...new Set(['daily'])];
export const PERIOD_TYPE_OPTS = [...new Set(['weekly', 'monthly', 'halfmonthly'])];

// ── Unique ID generator ────────────────────────────────────────────
let _idCtr = Date.now();
export const uid = () => 'i' + (_idCtr++).toString(36);

// ── UTC date helpers ───────────────────────────────────────────────
/** Format a Date as YYYY-MM-DD using UTC fields. */
export const fmtDate = (d) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;

/** Days in a given UTC month (used by Calendar grid). */
export const getDaysInMonth = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

// ── Timezone conversion ────────────────────────────────────────────
/** Convert a stored UTC "HH:MM" to the browser's local "HH:MM" for display. */
export function utcToLocalHHMM(utcHHMM) {
  if (!utcHHMM || !utcHHMM.includes(':')) return '00:00';
  const [h, m] = utcHHMM.split(':').map(Number);
  const d = new Date();
  d.setUTCHours(h, m, 0, 0);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Convert a user-entered local "HH:MM" to UTC "HH:MM" for storage. */
export function localToUtcHHMM(localHHMM) {
  if (!localHHMM || !localHHMM.includes(':')) return '00:00';
  const [h, m] = localHHMM.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

// ── Luminance / contrast ───────────────────────────────────────────
export function ensureContrast(hex) {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (lum < 0.25) {
    const f = 0.62;
    return `rgb(${Math.round(r+(255-r)*f)},${Math.round(g+(255-g)*f)},${Math.round(b+(255-b)*f)})`;
  }
  return hex;
}

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
      { id: 't1',  name: '',                    type: 'daily' },
      { id: 't2',  name: 'HoYoLAB',             type: 'daily',    resetTime: '16:00' },
      { id: 't3',  name: 'Weekly Boss',          type: 'weekly' },
      { id: 't4',  name: 'Serenitea Pot',        type: 'weekly' },
      { id: 't5',  name: 'Imaginarium Theater',  type: 'monthly',    monthlyResetDay: 1 },
      { id: 't6',  name: 'Spiral Abyss',         type: 'monthly',    monthlyResetDay: 16 },
    ],
  },
  {
    id: 'g3', name: 'Zenless Zone Zero', color: '#000000',
    resetTime: '20:00',
    items: [
      { id: 't7',  name: '',               type: 'daily' },
      { id: 't8',  name: 'HoYoLAB',       type: 'daily', resetTime: '16:00' },
      { id: 't9',  name: 'Deadly Assault', type: 'weekly' },
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
