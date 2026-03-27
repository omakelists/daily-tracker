import type { Game } from './types'
import { asUtc, utcToLocalHHMM } from './util/helpers'

// ── Task type constants ───────────────────────────────────────────
export const DAILY = 'daily' as const
export const WEEKLY = 'weekly' as const
export const HALFMONTHLY = 'halfmonthly' as const
export const MONTHLY = 'monthly' as const
export const EVENT = 'event' as const

/** All selectable task types, in display order. */
import type { TaskType } from './types'
export const ALL_TASK_TYPES: TaskType[] = [
  DAILY,
  WEEKLY,
  HALFMONTHLY,
  MONTHLY,
  EVENT,
]

// ── Time constants ────────────────────────────────────────────────
export const DAY_MS = 24 * 3600_000 // milliseconds in one day

// ── Default data (reset times in UTC) ─────────────────────────────
export const DEFAULT_GAMES: Game[] = [
  {
    id: 'g1',
    name: 'Blue Archive',
    color: '#4a9eff',
    resetTime: utcToLocalHHMM(asUtc('19:00')),
    items: [],
  },
  {
    id: 'g2',
    name: 'Genshin Impact',
    color: '#c8a96e',
    resetTime: utcToLocalHHMM(asUtc('20:00')),
    items: [
      {
        id: 't1',
        name: '',
        type: 'daily',
        resetTime: utcToLocalHHMM(asUtc('20:00')),
      },
      {
        id: 't2',
        name: 'HoYoLAB',
        type: 'daily',
        resetTime: utcToLocalHHMM(asUtc('16:00')),
      },
      { id: 't3', name: 'Weekly Boss', type: 'weekly', weeklyResetDay: 1 },
      { id: 't4', name: 'Serenitea Pot', type: 'weekly', weeklyResetDay: 1 },
      {
        id: 't5',
        name: 'Imaginarium Theater',
        type: 'monthly',
        monthlyResetDay: 1,
      },
      { id: 't6', name: 'Spiral Abyss', type: 'monthly', monthlyResetDay: 16 },
    ],
  },
  {
    id: 'g3',
    name: 'Zenless Zone Zero',
    color: '#000000',
    resetTime: utcToLocalHHMM(asUtc('20:00')),
    items: [
      {
        id: 't7',
        name: '',
        type: 'daily',
        resetTime: utcToLocalHHMM(asUtc('20:00')),
      },
      {
        id: 't8',
        name: 'HoYoLAB',
        type: 'daily',
        resetTime: utcToLocalHHMM(asUtc('16:00')),
      },
      { id: 't9', name: 'Notorious Hunt', type: 'weekly', weeklyResetDay: 1 },
      { id: 't10', name: 'Hollow Zero', type: 'weekly', weeklyResetDay: 1 },
    ],
  },
  {
    id: 'g4',
    name: 'Arknight: Endfield',
    color: '#FF6666',
    resetTime: utcToLocalHHMM(asUtc('20:00')),
    items: [
      {
        id: 't11',
        name: '',
        type: 'daily',
        resetTime: utcToLocalHHMM(asUtc('20:00')),
      },
      {
        id: 't12',
        name: 'SKPORT',
        type: 'daily',
        resetTime: utcToLocalHHMM(asUtc('16:00')),
      },
    ],
  },
]
