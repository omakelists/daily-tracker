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
  localDowToUtcDow,
  localMonthDayToUtcDay,
  localHalfMonthDayToStoredB,
} from './helpers.ts'
import { match } from 'ts-pattern'

const GAMES_KEY = 'dailytracker:games'
const CHECKS_KEY = 'dailytracker:checks'

/** Increment when the stored data format changes to trigger auto-migration. */
export const STORAGE_VERSION = 1

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LegacyGame = any

export function migrateGame(
  g: LegacyGame,
  setChecks: (key: string, val: boolean) => void
): [Game, boolean] {
  let migrated = false
  // Phase 1: legacy { tasks, events } → { items }
  if (!g.items) {
    migrated = true
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
  g = {
    ...g,
    items: (g.items as LegacyGame[]).map((it: LegacyGame) => {
      const { webResetTime, ...rest } =
        it.type === 'webdaily' ? { ...it, type: 'daily' } : it
      if (webResetTime !== undefined) {
        migrated = true
        return { ...rest, resetTime: webResetTime }
      } else {
        return rest
      }
    }),
  } as Game
  const items = g.items
    .map((it: Task & { done?: boolean }) => {
      // Phase 4: move item.done (event) into checks map
      if (it.type === EVENT && 'done' in it) {
        migrated = true
        if (it.done) setChecks(`${it.id}__done`, true)
        const { done: _done, ...rest } = it
        return rest as Task
      }
      return it
    })
    .map((it: Task) => {
      // Phase 5: default values for each task type
      if (it.type === DAILY) {
        if (!('resetTime' in it)) {
          migrated = true
          return { ...(it as DailyTask), resetTime: g.resetTime } as DailyTask
        }
      } else if (it.type === WEEKLY) {
        if (!('weeklyResetDay' in it)) {
          migrated = true
          return { ...(it as WeeklyTask), weeklyResetDay: 1 } as WeeklyTask
        }
      } else if (it.type === HALFMONTHLY) {
        if (!('halfMonthlyStartDay' in it)) {
          migrated = true
          return {
            ...(it as HalfMonthlyTask),
            halfMonthlyStartDay: 1,
          } as HalfMonthlyTask
        }
      } else if (it.type === MONTHLY) {
        if (!('monthlyResetDay' in it)) {
          migrated = true
          return { ...(it as MonthlyTask), monthlyResetDay: 1 } as MonthlyTask
        }
      }
      return it
    })
  g = { ...g, items }
  return [g as Game, migrated]
}

function localToUtcTask(task: Task): object {
  return match(task)
    .with({ type: DAILY }, (tk) => {
      if (tk.resetTime) {
        return { ...tk, resetTime: localToUtcHHMM(tk.resetTime) }
      } else {
        return { ...tk }
      }
    })
    .with({ type: EVENT }, (tk) => {
      const [y, mt, d] = parseYYYYMMDD(tk.deadline)
      const [h, m] = parseHHMM(tk.deadlineTime)
      // parseYYYYMMDD returns a 1-indexed month; Date constructor expects 0-indexed
      const dt = new Date(y, mt - 1, d, h, m)
      return { ...tk, deadline: utcFmtDate(dt), deadlineTime: utcFmtTime(dt) }
    })
    .otherwise((tk) => {
      return tk
    })
}

export function localToUtcGame(game: Game): Record<string, unknown> {
  return {
    ...game,
    resetTime: localToUtcHHMM(game.resetTime),
    items: game.items.map(localToUtcTask),
  }
}

export function saveGames(games: Game[]): void {
  try {
    const payload = {
      version: STORAGE_VERSION,
      games: games.map(localToUtcGame),
    }
    localStorage.setItem(GAMES_KEY, JSON.stringify(payload))
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
      if ('resetTime' in tk) {
        return {
          ...tk,
          resetTime: utcToLocalHHMM(tk.resetTime as UtcTimeString),
        } as DailyTask
      } else {
        return { ...tk } as DailyTask
      }
    })
    .with({ type: WEEKLY }, (tk) => tk as WeeklyTask)
    .with({ type: HALFMONTHLY }, (tk) => tk as HalfMonthlyTask)
    .with({ type: MONTHLY }, (tk) => tk as MonthlyTask)
    .with({ type: EVENT }, (tk) => {
      if (!('deadline' in tk)) throw new Error('invalid data')
      if (!('deadlineTime' in tk)) throw new Error('invalid data')
      const [y, mt, d] = parseYYYYMMDD(tk.deadline as UtcYMDString)
      const [h, m] = parseHHMM(tk.deadlineTime as UtcTimeString)
      // parseYYYYMMDD returns a 1-indexed month; Date.UTC expects 0-indexed
      const dt = new Date(Date.UTC(y, mt - 1, d, h, m))
      return {
        ...tk,
        deadline: localFmtDate(dt),
        deadlineTime: localFmtTime(dt),
      } as EventTask
    })
    .run()
}

export function utcToLocalGame(game: unknown): Game {
  if (game === null || typeof game !== 'object') throw new Error('invalid data')
  if (!('resetTime' in game)) throw new Error('invalid data')
  if (!('items' in game && game.items instanceof Array))
    throw new Error('invalid data')
  return {
    ...game,
    resetTime: utcToLocalHHMM(game.resetTime as UtcTimeString),
    items: game.items.map(utcToLocalTask),
  } as Game
}

/**
 * v0 → v1 migration (runs on local-time data, after utcToLocalGame).
 *
 * v0 stored weeklyResetDay / monthlyResetDay / halfMonthlyStartDay as
 * *local* values.  v1 stores them in UTC so period-key arithmetic is
 * independent of the viewer's timezone.
 *
 * - weeklyResetDay   : local DOW  → UTC DOW
 * - monthlyResetDay  : local day  → UTC day  (-1 = last day of prev month)
 * - halfMonthlyStartDay : local A day → storedB = utcA + 15
 */
export function migrateV0ToV1(game: Game): Game {
  const rt = game.resetTime // already local after utcToLocalGame
  const items = game.items.map((task): Task => {
    if (task.type === WEEKLY) {
      return {
        ...task,
        weeklyResetDay: localDowToUtcDow(task.weeklyResetDay, rt),
      }
    }
    if (task.type === MONTHLY) {
      return {
        ...task,
        monthlyResetDay: localMonthDayToUtcDay(task.monthlyResetDay, rt),
      }
    }
    if (task.type === HALFMONTHLY) {
      return {
        ...task,
        halfMonthlyStartDay: localHalfMonthDayToStoredB(
          task.halfMonthlyStartDay,
          rt
        ),
      }
    }
    return task
  })
  return { ...game, items }
}

export function loadAll(): { games: Game[] | null; checks: ChecksMap } {
  let checks = loadChecks()
  let games: Game[] | null = null
  try {
    const v = localStorage.getItem(GAMES_KEY)
    if (!v) return { games: null, checks }

    const parsed = JSON.parse(v) as unknown

    // Support both the legacy plain-array format (no version) and the new
    // versioned object format  { version: N, games: [...] }
    let rawGames: LegacyGame[]
    let dataVersion = 0

    if (Array.isArray(parsed)) {
      rawGames = parsed
      dataVersion = 0
    } else if (
      typeof parsed === 'object'
      && parsed !== null
      && 'games' in parsed
      && Array.isArray((parsed as Record<string, unknown>).games)
    ) {
      rawGames = (parsed as Record<string, unknown>).games as LegacyGame[]
      dataVersion =
        typeof (parsed as Record<string, unknown>).version === 'number' ?
          ((parsed as Record<string, unknown>).version as number)
        : 0
    } else {
      return { games: null, checks }
    }

    let migrated = false
    games = rawGames
      .map((g) => {
        const [migratedGame, wasMigrated] = migrateGame(g, (key, val) => {
          checks[key] = val
        })
        migrated = migrated || wasMigrated
        return migratedGame
      })
      .map(utcToLocalGame)

    // v0 → v1: convert local DOW/day fields to UTC
    if (dataVersion < 1) {
      games = games.map(migrateV0ToV1)
      migrated = true
    }

    if (migrated) {
      saveGames(games)
      saveChecks(checks)
    }
  } catch {
    return { games: null, checks }
  }
  return { games, checks }
}
