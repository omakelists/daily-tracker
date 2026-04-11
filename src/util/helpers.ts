import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { match } from 'ts-pattern'
import {
  DAILY,
  WEEKLY,
  HALFMONTHLY,
  MONTHLY,
  EVENT,
  DAY_MS,
} from '../constants'
import type {
  Game,
  Task,
  DailyTask,
  ChecksMap,
  CountdownLabels,
  UtcTimeString,
  LocalTimeString,
  YMDString,
  HexColor,
  LocalYMDString,
  UtcYMDString,
  TimeString,
} from '../types'

dayjs.extend(utc)
dayjs.extend(timezone)

// ── Unique ID generator ───────────────────────────────────────────
let _idCtr = Date.now()
export const uid = (): string => 'i' + (_idCtr++).toString(36)

// ── Brand cast helpers ────────────────────────────────────────────
// Use only at trust boundaries (e.g. reading from localStorage or <input> values).
export const asUtc = (s: string): UtcTimeString => s as UtcTimeString
export const asLocal = (s: string): LocalTimeString => s as LocalTimeString

// ── UTC date helpers ──────────────────────────────────────────────
export const utcFmtDate = (d: Date): UtcYMDString =>
  dayjs(d).utc().format('YYYY-MM-DD') as UtcYMDString

export const utcFmtTime = (d: Date): UtcTimeString =>
  dayjs(d).utc().format('HH:mm') as UtcTimeString

export const getDaysInMonth = (y: number, m: number): number =>
  dayjs().year(y).month(m).daysInMonth()

// ── Timezone conversion ───────────────────────────────────────────
/**
 * IANA timezone name for the current environment, cached at module load time.
 * dayjs.tz.guess() uses Intl.DateTimeFormat internally with DST-aware resolution.
 */
const LOCAL_TZ: string = dayjs.tz.guess()

export function utcToLocalHHMM(utcHHMM?: UtcTimeString): LocalTimeString {
  if (!utcHHMM) return asLocal('00:00')
  // Anchor to today's UTC date so the DST offset is resolved for the current date.
  const today = dayjs.utc().format('YYYY-MM-DD')
  return asLocal(dayjs.utc(`${today}T${utcHHMM}`).tz(LOCAL_TZ).format('HH:mm'))
}

export function localToUtcHHMM(
  localHHMM: LocalTimeString = asLocal('00:00')
): UtcTimeString {
  // Anchor to today's local date so the DST offset is resolved for the current date.
  const today = dayjs().tz(LOCAL_TZ).format('YYYY-MM-DD')
  return asUtc(dayjs.tz(`${today}T${localHHMM}`, LOCAL_TZ).utc().format('HH:mm'))
}

// ── Luminance / contrast ──────────────────────────────────────────
export function ensureContrast(hex: HexColor): string {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return hex
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  if (lum < 0.25) {
    const f = 0.62
    return `rgb(${Math.round(r + (255 - r) * f)},${Math.round(g + (255 - g) * f)},${Math.round(b + (255 - b) * f)})`
  }
  return hex
}

export const parseYYYYMMDD = (s: YMDString): [number, number, number] => {
  const [y, m, d] = s.split('-').map(Number)
  return [y, m, d]
}

export const parseHHMM = (s: TimeString): [number, number] => {
  const [h, m] = s.split(':').map(Number)
  return [h, m]
}

export const localFmtDate = (d: Date): LocalYMDString =>
  dayjs(d).format('YYYY-MM-DD') as LocalYMDString

export const localFmtTime = (d: Date): LocalTimeString =>
  dayjs(d).format('HH:mm') as LocalTimeString

// ── Local-date-based game day key ─────────────────────────────────
export function getGameDateKey(
  now: Date,
  resetTime: LocalTimeString
): UtcYMDString {
  const nowUtc = dayjs(now).utc()
  const baseKey = nowUtc.format('YYYY-MM-DD') as UtcYMDString
  // Convert local reset time to UTC, then build a comparable UTC datetime for today.
  const utcRT = localToUtcHHMM(resetTime)
  const todayResetUtc = dayjs.utc(`${baseKey}T${utcRT}`)
  // Before the UTC reset time: still in the previous game day
  if (nowUtc.isBefore(todayResetUtc)) return shiftDate(baseKey, -1)
  return baseKey
}

export function shiftDate(dateKey: UtcYMDString, days: number): UtcYMDString {
  return dayjs.utc(dateKey).add(days, 'day').format('YYYY-MM-DD') as UtcYMDString
}

export const getPrevGameDateKey = (
  now: Date,
  rt: LocalTimeString
): UtcYMDString => shiftDate(getGameDateKey(now, rt), -1)

// ── Period key helpers ────────────────────────────────────────────
export function dateToWeekKey(dk: UtcYMDString, rd = 1): string {
  const date = dayjs.utc(dk)
  // Use UTC day-of-week so the key is independent of the viewer's local timezone.
  // `rd` is stored as a UTC day-of-week (0 = Sun ... 6 = Sat).
  const daysBack = (date.day() - rd + 7) % 7
  return 'W' + date.subtract(daysBack, 'day').format('YYYY-MM-DD')
}

export function getMonthPeriodKey(dk: UtcYMDString, rd = 1): string {
  const date = dayjs.utc(dk)
  const utcD = date.date()

  if (rd === -1) {
    // rd = -1 means the reset fires on the last day of each UTC month.
    const anchor = utcD >= date.daysInMonth() ? date : date.subtract(1, 'month')
    return `M-${anchor.format('YYYY-MM')}-last`
  }

  const anchor = utcD >= rd ? date : date.subtract(1, 'month')
  return `M-${anchor.format('YYYY-MM')}-${String(rd).padStart(2, '0')}`
}

export function getPrevMonthPeriodKey(k: string): string {
  // Matches both numeric day keys ("M-2026-03-05") and the last-day sentinel ("M-2026-03-last")
  const m = k.match(/M-(\d+)-(\d+)-(.+)/)
  if (!m) return k
  const [, y, mo, dd] = m
  const prev = dayjs.utc(`${y}-${mo}-01`).subtract(1, 'month')
  return `M-${prev.format('YYYY-MM')}-${dd}`
}

/**
 * Returns the half-month period key for the given UTC game-date string.
 *
 * @param storedB  UTC second-half start day (= localFirstHalfStart + offset + 15).
 * @param rt       Game reset time in local wall-clock (needed to derive the
 *                 UTC<->local day offset so that period boundaries align with
 *                 the local calendar the user sees).
 *
 * The period key is expressed in **local** calendar month/day terms so that
 * the B->A transition at month-end fires at the correct local reset moment.
 * Without the offset correction, UTC+ zones would see the reset one game-day
 * late (e.g. JST May 2 05:00 instead of JST May 1 05:00).
 */
export const dateToHalfMonthKey = (dk: UtcYMDString, storedB: number, rt: LocalTimeString): string => {
  const offset = getResetDayOffset(rt)
  // Shift the UTC game-date to the corresponding local calendar date.
  // For Japan (offset = -1): UTC April 30 -> local May 1 (correct local game day).
  const localDate = dayjs.utc(dk).add(-offset, 'day')
  const localD = localDate.date()
  // Local second-half start day = stored UTC B day minus the day offset.
  const localB = storedB - offset
  const inB = localD >= localB
  return `H-${localDate.format('YYYY-MM')}-${inB ? 'B' : 'A'}`
}

export function prevHalfMonthKey(k: string): string {
  const m = k.match(/H-(\d+)-(\d+)-([AB])/)
  if (!m) return k
  const [, y, mo, half] = m
  if (half === 'B') return `H-${y}-${mo}-A`
  // Navigate to the B period of the previous calendar month (UTC)
  const prev = dayjs.utc(`${y}-${mo}-01`).subtract(1, 'month')
  return `H-${prev.format('YYYY-MM')}-B`
}

// Task-level resetTime takes precedence over game resetTime.
export const getTaskRT = (task: Task, game: Game): LocalTimeString =>
  task.resetTime ?? game.resetTime

export function getPeriodKey(task: Task, game: Game, now: Date): string {
  return match(task)
    .with({ type: DAILY }, (t) => getGameDateKey(now, getTaskRT(t, game)))
    .with({ type: WEEKLY }, (t) =>
      dateToWeekKey(getGameDateKey(now, getTaskRT(t, game)), t.weeklyResetDay)
    )
    .with({ type: HALFMONTHLY }, (t) => {
      const rt = getTaskRT(t, game)
      return dateToHalfMonthKey(getGameDateKey(now, rt), t.halfMonthlyStartDay, rt)
    })
    .with({ type: MONTHLY }, (t) =>
      getMonthPeriodKey(
        getGameDateKey(now, getTaskRT(t, game)),
        t.monthlyResetDay
      )
    )
    .with({ type: EVENT }, () => 'done')
    .exhaustive()
}

export function getPrevPeriodKey(task: Task, game: Game, now: Date): string {
  return match(task)
    .with({ type: DAILY }, (t) => getPrevGameDateKey(now, getTaskRT(t, game)))
    .with({ type: WEEKLY }, (t) =>
      dateToWeekKey(
        shiftDate(getGameDateKey(now, getTaskRT(t, game)), -7),
        t.weeklyResetDay
      )
    )
    .with({ type: HALFMONTHLY }, (t) => {
      const rt = getTaskRT(t, game)
      const dk = getGameDateKey(now, rt)
      return prevHalfMonthKey(dateToHalfMonthKey(dk, t.halfMonthlyStartDay, rt))
    })
    .with({ type: MONTHLY }, (t) =>
      getPrevMonthPeriodKey(
        getMonthPeriodKey(
          getGameDateKey(now, getTaskRT(t, game)),
          t.monthlyResetDay
        )
      )
    )
    .with({ type: EVENT }, () => 'done')
    .exhaustive()
}

// ── Countdown helpers ─────────────────────────────────────────────
export function msUntilReset(now: Date, rt: LocalTimeString): number {
  const [rh, rm] = parseHHMM(rt)
  const nowDjs = dayjs(now)
  const todayReset = nowDjs.hour(rh).minute(rm).second(0).millisecond(0)
  return (todayReset.isAfter(now) ? todayReset : todayReset.add(1, 'day')).diff(now)
}

export function msUntilNextMonth(
  now: Date,
  spTime: LocalTimeString,
  spDay = 1
): number {
  const [rh, rm] = parseHHMM(spTime)
  const nowDjs = dayjs(now)
  const thisMonthReset = nowDjs.date(spDay).hour(rh).minute(rm).second(0).millisecond(0)
  const tgt = nowDjs.isBefore(thisMonthReset) ? thisMonthReset : thisMonthReset.add(1, 'month')
  return tgt.diff(now)
}

export function msUntilNextHalfMonth(
  now: Date,
  rt: LocalTimeString,
  startDay = 1
): number {
  const [rh, rm] = parseHHMM(rt)
  const nowDjs = dayjs(now)
  const b = startDay + 15
  const candidates = [
    nowDjs.date(startDay).hour(rh).minute(rm).second(0).millisecond(0),
    b <= 28
      ? nowDjs.date(b).hour(rh).minute(rm).second(0).millisecond(0)
      : nowDjs.add(1, 'month').date(startDay).hour(rh).minute(rm).second(0).millisecond(0),
    nowDjs.add(1, 'month').date(startDay).hour(rh).minute(rm).second(0).millisecond(0),
  ]
  const tgt = candidates.find((c) => c.isAfter(now)) ?? candidates[2]
  return tgt.diff(now)
}

export function msUntilNextWeek(
  now: Date,
  rt: LocalTimeString,
  rd = 1
): number {
  const [rh, rm] = parseHHMM(rt)
  const nowDjs = dayjs(now)
  const todayReset = nowDjs.hour(rh).minute(rm).second(0).millisecond(0)
  if (nowDjs.day() === rd && nowDjs.isBefore(todayReset)) return todayReset.diff(now)
  const days = (rd - nowDjs.day() + 7) % 7 || 7
  return todayReset.add(days, 'day').diff(now)
}

export function msUntilTaskReset(task: Task, game: Game, now: Date): number {
  return match(task)
    .with({ type: DAILY }, (t) => msUntilReset(now, getTaskRT(t, game)))
    .with({ type: WEEKLY }, (t) => {
      const rt = getTaskRT(t, game)
      // weeklyResetDay is stored in UTC; convert to local DOW for wall-clock countdown
      return msUntilNextWeek(now, rt, utcDowToLocalDow(t.weeklyResetDay, rt))
    })
    .with({ type: HALFMONTHLY }, (t) => {
      const rt = getTaskRT(t, game)
      // halfMonthlyStartDay is stored as UTC B value; derive local A day for countdown
      return msUntilNextHalfMonth(now, rt, storedBToLocalHalfMonthDay(t.halfMonthlyStartDay, rt))
    })
    .with({ type: MONTHLY }, (t) => {
      const rt = getTaskRT(t, game)
      // monthlyResetDay is stored in UTC (-1 = last of month); convert to local day for countdown
      return msUntilNextMonth(now, rt, utcDayToLocalMonthDay(t.monthlyResetDay, rt))
    })
    .with({ type: EVENT }, () => Infinity)
    .exhaustive()
}

export function formatCountdown(ms: number, cd: CountdownLabels): string {
  const h = Math.floor(ms / 3600000),
    m = Math.floor((ms % 3600000) / 60000)
  if (h >= 24) return `${Math.floor(h / 24)}${cd.d}`
  if (h >= 1) return `${h}${cd.h}`
  return `${m}${cd.m}`
}

export function cdColor(ms: number, urgentH: number, warnH: number): string {
  if (ms <= 0) return 'var(--danger)'
  const h = ms / 3600000
  if (h < urgentH) return 'var(--cd-urgent)'
  if (h < warnH) return 'var(--cd-warn)'
  return 'var(--muted)'
}

export const checkKey = (taskId: string, periodKey: string): string =>
  `${taskId}__${periodKey}`

export function calcAllDone(
  game: Game,
  checks: ChecksMap,
  now: Date,
  soloId: string
): boolean {
  const allItems = game.items
  const dailyItems = allItems.filter((it): it is DailyTask => it.type === DAILY)

  if (allItems.length === 0) {
    const solo: DailyTask = {
      id: soloId,
      name: '',
      type: DAILY,
      resetTime: game.resetTime,
    }
    return checks[checkKey(solo.id, getPeriodKey(solo, game, now))]
  }
  if (dailyItems.length > 0) {
    const urgent = allItems.filter((it) => {
      if (it.type === EVENT) return false
      const ms = msUntilTaskReset(it, game, now)
      return ms > 0 && ms < DAY_MS
    })
    return (
      urgent.length > 0
      && urgent.every(
        (tk) => checks[checkKey(tk.id, getPeriodKey(tk, game, now))]
      )
    )
  }
  return allItems.every(
    (it) => checks[checkKey(it.id, getPeriodKey(it, game, now))]
  )
}

export function msUntilDeadline(
  dateStr: LocalYMDString,
  now: Date,
  deadlineTime: LocalTimeString
): number {
  const dt =
    deadlineTime?.includes(':') ?
      dayjs(`${dateStr}T${deadlineTime}`)
    : dayjs(dateStr)
  return dt.diff(dayjs(now))
}

// ── Item order ────────────────────────────────────────────────────
export function applyOrder<T extends { id: string }>(
  items: T[],
  storedOrder: string[] = []
): T[] {
  const itemById = new Map(items.map((x) => [x.id, x]))
  // Keep only IDs that still exist in items, preserving stored order
  const ordered = storedOrder
    .map((id) => itemById.get(id))
    .filter((x): x is T => x !== undefined)
  const orderedIdSet = new Set(storedOrder)
  // Append any items not present in storedOrder (newly added tasks)
  const unordered = items.filter((x) => !orderedIdSet.has(x.id))
  return [...ordered, ...unordered]
}

// ── Sound effects ─────────────────────────────────────────────────
export function playCheckSound(): void {
  try {
    const AudioCtx = window.AudioContext ?? window.webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const o = ctx.createOscillator(),
      g = ctx.createGain()
    o.connect(g)
    g.connect(ctx.destination)
    o.type = 'sine'
    o.frequency.setValueAtTime(880, ctx.currentTime)
    o.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08)
    g.gain.setValueAtTime(0.18, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
    o.start()
    o.stop(ctx.currentTime + 0.25)
  } catch {
    /* ignore */
  }
}

export function playAllDoneSound(): void {
  try {
    const AudioCtx = window.AudioContext ?? window.webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    ;([523, 659, 784, 1047] as const).forEach((freq, i) => {
      const o = ctx.createOscillator(),
        g = ctx.createGain()
      o.connect(g)
      g.connect(ctx.destination)
      o.type = 'sine'
      const t = ctx.currentTime + i * 0.1
      o.frequency.setValueAtTime(freq, t)
      g.gain.setValueAtTime(0.15, t)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
      o.start(t)
      o.stop(t + 0.3)
    })
  } catch {
    /* ignore */
  }
}

export function fmtDeadlineDate(
  dateStr: YMDString,
  tFn: (key: string, vars: Record<string, number>) => string
): string {
  if (!dateStr) return ''
  const [, m, d] = dateStr.split('-').map(Number)
  return tFn('dateFmt', { m, d })
}

// ── UTC <-> local reset-day conversions ───────────────────────────
/**
 * Returns the signed difference in whole calendar days between the UTC date
 * and the local date at the instant the reset fires:
 *   -1  local reset fires on "yesterday" in UTC  (UTC+ zones, early reset)
 *    0  same calendar date in both local and UTC
 *   +1  local reset fires on "tomorrow" in UTC   (UTC- zones, late reset)
 *
 * Uses dayjs.tz for DST-safe resolution -- the offset is determined for the
 * specific date/time of the reset rather than being assumed constant.
 */
export function getResetDayOffset(rt: LocalTimeString): number {
  const today = dayjs().tz(LOCAL_TZ).format('YYYY-MM-DD')
  const resetMoment = dayjs.tz(`${today}T${rt}`, LOCAL_TZ)
  const localDate = resetMoment.format('YYYY-MM-DD')
  const utcDate = resetMoment.utc().format('YYYY-MM-DD')
  return dayjs.utc(utcDate).diff(dayjs.utc(localDate), 'day')
}

// ── Day-of-week conversions ───────────────────────────────────────
/** Convert local day-of-week (0=Sun...6=Sat) to the UTC DOW for storage. */
export function localDowToUtcDow(localDow: number, rt: LocalTimeString): number {
  return (localDow + getResetDayOffset(rt) + 7) % 7
}

/** Convert stored UTC day-of-week back to local DOW for display / countdown. */
export function utcDowToLocalDow(utcDow: number, rt: LocalTimeString): number {
  return (utcDow - getResetDayOffset(rt) + 7) % 7
}

// ── Monthly day conversions ───────────────────────────────────────
/**
 * Converts a local calendar day (1-28) to the UTC day stored internally.
 * Returns -1 as a sentinel when the raw UTC day <= 0 (i.e. the reset falls
 * on the last day of the previous UTC month).
 */
export function localMonthDayToUtcDay(localDay: number, rt: LocalTimeString): number {
  const raw = localDay + getResetDayOffset(rt)
  return raw <= 0 ? -1 : raw
}

/**
 * Converts a stored UTC day back to a local calendar day for display.
 * The -1 sentinel is treated as UTC raw-day 0 (last day of previous month).
 */
export function utcDayToLocalMonthDay(utcDay: number, rt: LocalTimeString): number {
  const raw = utcDay === -1 ? 0 : utcDay
  return raw - getResetDayOffset(rt)
}

// ── Half-monthly conversions ──────────────────────────────────────
/**
 * Converts a local first-half start day (A, 1-15) to the stored B value
 * (= UTC second-half start = utcA + 15).
 * Example: Japan UTC+9, reset 05:00, localA=1 -> utcA=0, storedB=15.
 */
export function localHalfMonthDayToStoredB(localA: number, rt: LocalTimeString): number {
  return localA + getResetDayOffset(rt) + 15
}

/**
 * Converts the stored B value back to the local first-half start day (A)
 * for display and UI inputs.
 */
export function storedBToLocalHalfMonthDay(storedB: number, rt: LocalTimeString): number {
  const aUtcRaw = storedB - 15
  return aUtcRaw - getResetDayOffset(rt)
}
