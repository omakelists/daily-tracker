import { DAILY, EVENT, HALFMONTHLY, MONTHLY, WEEKLY } from '../constants'
import type {
  Game,
  Task,
  ChecksMap,
  UtcTimeString,
  DailyTask,
  WeeklyTask,
  HalfMonthlyTask,
  MonthlyTask,
  EventTask,
  UtcYMDString,
} from '../types'
import {
  localFmtDate,
  localFmtTime,
  localToUtcHHMM,
  parseHHMM,
  parseYYYYMMDD,
  utcFmtDate,
  utcFmtTime,
  utcToLocalHHMM,
} from './helpers.ts'
import { match } from 'ts-pattern'

const GAMES_KEY = 'dailytracker:games'
const CHECKS_KEY = 'dailytracker:checks'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LegacyGame = any

function migrateGame(g: LegacyGame): Game {
  // Phase 1: legacy { tasks, events } → { items }
  if (!g.items) {
    const {
      tasks,
      events,
      dailyOrder: _do,
      periodicOrder: _po,
      eventOrder: _eo,
      ...rest
    } = g
    g = {
      ...rest,
      items: [
        ...(tasks ?? []),
        ...(events ?? []).map((ev: LegacyGame) => ({
          ...ev,
          type: ev.type ?? 'event',
        })),
      ],
    }
  }
  // Phase 2: webdaily → daily
  // Phase 3: webResetTime → resetTime
  return {
    ...g,
    items: (g.items as LegacyGame[]).map((it: LegacyGame) => {
      const { webResetTime, ...rest } =
        it.type === 'webdaily' ? { ...it, type: 'daily' } : it
      return webResetTime !== undefined ?
          { ...rest, resetTime: webResetTime }
        : rest
    }),
  } as Game
}

function localToUtcTask(task: Task): object {
  return match(task)
    .with({ type: DAILY }, (tk) => {
      return { ...tk, resetTime: localToUtcHHMM(tk.resetTime) }
    })
    .with({ type: EVENT }, (tk) => {
      const [y, mt, d] = parseYYYYMMDD(tk.deadline)
      const [h, m] = parseHHMM(tk.deadlineTime)
      const dt = new Date(y, mt, d, h, m)
      return { ...tk, deadline: utcFmtDate(dt), deadlineTime: utcFmtTime(dt) }
    })
    .otherwise((tk) => {
      return tk
    })
}

function localToUtcGame(game: Game): Record<string, unknown> {
  return {
    ...game,
    resetTime: localToUtcHHMM(game.resetTime),
    items: game.items.map(localToUtcTask),
  }
}

export function saveGames(games: Game[]): void {
  try {
    localStorage.setItem(GAMES_KEY, JSON.stringify(games.map(localToUtcGame)))
  } catch {
    /* ignore */
  }
}

export function loadChecks(): ChecksMap {
  try {
    const v = localStorage.getItem(CHECKS_KEY)
    return v ? (JSON.parse(v) as ChecksMap) : {}
  } catch {
    return {}
  }
}

export function saveChecks(c: ChecksMap): void {
  try {
    localStorage.setItem(CHECKS_KEY, JSON.stringify(c))
  } catch {
    /* ignore */
  }
}

function utcToLocalTask(task: unknown): Task {
  return match(task)
    .with({ type: DAILY }, (tk) => {
      if (!('resetTime' in tk)) throw new Error('invalid data')
      return {
        ...tk,
        resetTime: utcToLocalHHMM(tk.resetTime as UtcTimeString),
      } as DailyTask
    })
    .with({ type: WEEKLY }, (tk) => tk as WeeklyTask)
    .with({ type: HALFMONTHLY }, (tk) => tk as HalfMonthlyTask)
    .with({ type: MONTHLY }, (tk) => tk as MonthlyTask)
    .with({ type: EVENT }, (tk) => {
      if (!('deadline' in tk)) throw new Error('invalid data')
      if (!('deadlineTime' in tk)) throw new Error('invalid data')
      const [y, mt, d] = parseYYYYMMDD(tk.deadline as UtcYMDString)
      const [h, m] = parseHHMM(tk.deadlineTime as UtcTimeString)
      const dt = new Date(Date.UTC(y, mt, d, h, m))
      return {
        ...tk,
        deadline: localFmtDate(dt),
        deadlineTime: localFmtTime(dt),
      } as EventTask
    })
    .run()
}

function utcToLocalGame(game: Record<string, unknown>): Game {
  if (!('resetTime' in game)) throw new Error('invalid data')
  if (!('items' in game && game.items instanceof Array))
    throw new Error('invalid data')
  return {
    ...game,
    resetTime: utcToLocalHHMM(game.resetTime as UtcTimeString),
    items: game.items.map(utcToLocalTask),
  } as Game
}

export function loadAll(): { games: Game[] | null; checks: ChecksMap } {
  let checks = loadChecks()
  let games: Game[] | null = null
  try {
    const v = localStorage.getItem(GAMES_KEY)
    if (!v) return { games: null, checks }
    const raw = JSON.parse(v) as unknown
    if (!Array.isArray(raw)) return { games: null, checks }

    let migrated = false
    games = (raw as LegacyGame[])
      .map(migrateGame)
      .map((g) => {
        const items = g.items.map((it: Task & { done?: boolean }) => {
          // Phase 4: move item.done (event) into checks map
          if (it.type === EVENT && 'done' in it) {
            if (it.done) checks[`${it.id}__done`] = true
            const { done: _done, ...rest } = it
            migrated = true
            return rest as Task
          }
          return it
        })
        return { ...g, items }
      })
      .map(utcToLocalGame)

    if (migrated) {
      saveGames(games)
      saveChecks(checks)
    }
  } catch {
    return { games: null, checks }
  }
  return { games, checks }
}
