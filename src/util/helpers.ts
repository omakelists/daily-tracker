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

// ── Unique ID generator ───────────────────────────────────────────
let _idCtr = Date.now()
export const uid = (): string => 'i' + (_idCtr++).toString(36)

// ── Brand cast helpers ────────────────────────────────────────────
// Use only at trust boundaries (e.g. reading from localStorage or <input> values).
export const asUtc = (s: string): UtcTimeString => s as UtcTimeString
export const asLocal = (s: string): LocalTimeString => s as LocalTimeString

// ── UTC date helpers ──────────────────────────────────────────────
export const utcFmtDate = (d: Date): UtcYMDString =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}` as UtcYMDString

export const utcFmtTime = (d: Date): UtcTimeString =>
  `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}` as UtcTimeString

export const getDaysInMonth = (y: number, m: number): number =>
  new Date(Date.UTC(y, m + 1, 0)).getUTCDate()

// ── Timezone conversion ───────────────────────────────────────────
export function utcToLocalHHMM(utcHHMM?: UtcTimeString): LocalTimeString {
  if (!utcHHMM) return asLocal('00:00')
  const [h, m] = utcHHMM.split(':').map(Number)
  const d = new Date()
  d.setUTCHours(h, m, 0, 0)
  return asLocal(
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  )
}

export function localToUtcHHMM(
  localHHMM: LocalTimeString = asLocal('00:00')
): UtcTimeString {
  const [h, m] = localHHMM.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return asUtc(
    `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
  )
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
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` as LocalYMDString

export const localFmtTime = (d: Date): LocalTimeString =>
  `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}` as LocalTimeString

// ── Local-date-based game day key ─────────────────────────────────
export function getGameDateKey(
  now: Date,
  resetTime: LocalTimeString
): UtcYMDString {
  const [rh, rm] = (resetTime || '00:00').split(':').map(Number)
  const tmp = new Date(now)
  tmp.setHours(rh, rm, 0, 0)
  const localResetMin = tmp.getHours() * 60 + tmp.getMinutes()
  const localNowMin = now.getHours() * 60 + now.getMinutes()
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (localNowMin < localResetMin) base.setUTCDate(base.getUTCDate() - 1)
  return utcFmtDate(base)
}

export function shiftDate(dateKey: UtcYMDString, days: number): UtcYMDString {
  const [y, m, d] = dateKey.split('-').map(Number)
  const date = new Date(Date.UTC(y, m, d))
  date.setUTCDate(date.getUTCDate() + days)
  return utcFmtDate(date)
}

export const getPrevGameDateKey = (
  now: Date,
  rt: LocalTimeString
): UtcYMDString => shiftDate(getGameDateKey(now, rt), -1)

// ── Period key helpers ────────────────────────────────────────────
export function dateToWeekKey(dk: UtcYMDString, rd = 1): string {
  const [h, m, s] = dk.split('-').map(Number)
  const date = new Date(Date.UTC(h, m, s))
  const day = date.getUTCDay()
  const daysBack = (day - rd + 7) % 7
  date.setUTCDate(date.getUTCDate() - daysBack)
  return 'W' + utcFmtDate(date)
}

export function getMonthPeriodKey(dk: UtcYMDString, rd = 1): string {
  const r = rd
  const day = parseInt(dk.slice(8))
  const y = parseInt(dk.slice(0, 4))
  const mo = parseInt(dk.slice(5, 7))
  if (day >= r)
    return `M-${y}-${String(mo).padStart(2, '0')}-${String(r).padStart(2, '0')}`
  const p = new Date(Date.UTC(y, mo - 2, r))
  return `M-${p.getUTCFullYear()}-${String(p.getUTCMonth() + 1).padStart(2, '0')}-${String(r).padStart(2, '0')}`
}

export function getPrevMonthPeriodKey(k: string): string {
  const m = k.match(/M-(\d+)-(\d+)-(\d+)/)
  if (!m) return k
  const [, y, mo, dd] = m
  const p = new Date(Date.UTC(parseInt(y), parseInt(mo) - 2, parseInt(dd)))
  return `M-${p.getUTCFullYear()}-${String(p.getUTCMonth() + 1).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
}

export const dateToHalfMonthKey = (dk: string, startDay = 1): string => {
  const day = parseInt(dk.slice(8))
  const b = startDay + 15
  const inB = b <= 28 ? day >= b : day >= b || day < startDay
  return 'H-' + dk.slice(0, 7) + '-' + (inB ? 'B' : 'A')
}

export function prevHalfMonthKey(k: string, startDay = 1): string {
  const m = k.match(/H-(\d+)-(\d+)-([AB])/)
  if (!m) return k
  const [, y, mo, half] = m
  if (half === 'B') return `H-${y}-${mo}-A`
  const p = new Date(Date.UTC(parseInt(y), parseInt(mo) - 2, startDay))
  return `H-${p.getUTCFullYear()}-${String(p.getUTCMonth() + 1).padStart(2, '0')}-B`
}

// Task-level resetTime takes precedence over game resetTime.
export const getTaskRT = (task: Task, game: Game): LocalTimeString =>
  task.resetTime || game.resetTime

export function getPeriodKey(task: Task, game: Game, now: Date): string {
  return match(task)
    .with({ type: DAILY }, (t) => getGameDateKey(now, getTaskRT(t, game)))
    .with({ type: WEEKLY }, (t) =>
      dateToWeekKey(getGameDateKey(now, getTaskRT(t, game)), t.weeklyResetDay)
    )
    .with({ type: HALFMONTHLY }, (t) =>
      dateToHalfMonthKey(
        getGameDateKey(now, getTaskRT(t, game)),
        t.halfMonthlyStartDay
      )
    )
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
      const dk = getGameDateKey(now, getTaskRT(t, game))
      return prevHalfMonthKey(
        dateToHalfMonthKey(dk, t.halfMonthlyStartDay),
        t.halfMonthlyStartDay
      )
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

// ── Countdown helpers (all UTC) ───────────────────────────────────
export function msUntilReset(now: Date, rt: LocalTimeString): number {
  const [rh, rm] = parseHHMM(rt)
  const n = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60
  let d = rh * 60 + rm - n
  if (d <= 0) d += 24 * 60
  return d * 60 * 1000
}

export function msUntilNextMonth(
  now: Date,
  spTime: LocalTimeString,
  spDay = 1
): number {
  const [rh, rm] = parseHHMM(spTime)
  const r = rh * 60 + rm
  const day = now.getDate()
  const min = now.getHours() * 60 + now.getMinutes()
  const tgt =
    day < spDay || (day === spDay && min < r) ?
      new Date(
        now.getFullYear(),
        now.getMonth(),
        spDay,
        Math.floor(r / 60),
        r % 60
      )
    : new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        spDay,
        Math.floor(r / 60),
        r % 60
      )
  return tgt.getTime() - now.getTime()
}

export function msUntilNextHalfMonth(
  now: Date,
  rt: LocalTimeString,
  startDay = 1
): number {
  const [rh, rm] = parseHHMM(rt)
  const b = startDay + 15
  const candidates: Date[] = [
    new Date(now.getFullYear(), now.getMonth(), startDay, rh, rm),
    b <= 28 ?
      new Date(now.getFullYear(), now.getMonth(), b, rh, rm)
    : new Date(now.getFullYear(), now.getMonth() + 1, startDay, rh, rm),
    new Date(now.getFullYear(), now.getMonth() + 1, startDay, rh, rm),
  ]
  const tgt = candidates.find((c) => c > now)
  return (tgt ?? candidates[2]).getTime() - now.getTime()
}

export function msUntilNextWeek(
  now: Date,
  rt: LocalTimeString,
  rd = 1
): number {
  const [rh, rm] = parseHHMM(rt)
  const dow = now.getDay()
  const tgt = new Date(now)
  tgt.setHours(rh, rm, 0, 0)
  if (dow === rd && now < tgt) return tgt.getTime() - now.getTime()
  const days = (rd - dow + 7) % 7 || 7
  tgt.setDate(tgt.getDate() + days)
  return tgt.getTime() - now.getTime()
}

export function msUntilTaskReset(task: Task, game: Game, now: Date): number {
  return match(task)
    .with({ type: DAILY }, (t) => msUntilReset(now, getTaskRT(t, game)))
    .with({ type: WEEKLY }, (t) =>
      msUntilNextWeek(now, getTaskRT(t, game), t.weeklyResetDay)
    )
    .with({ type: HALFMONTHLY }, (t) =>
      msUntilNextHalfMonth(now, getTaskRT(t, game), t.halfMonthlyStartDay)
    )
    .with({ type: MONTHLY }, (t) =>
      msUntilNextMonth(now, getTaskRT(t, game), t.monthlyResetDay)
    )
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
    const urgent = allItems.filter(
      (it) =>
        it.type !== EVENT
        && msUntilTaskReset(it, game, now) > 0
        && msUntilTaskReset(it, game, now) < DAY_MS
    )
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
  timeUtc: LocalTimeString
): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  if (timeUtc && timeUtc.includes(':')) {
    const [th, tm] = timeUtc.split(':').map(Number)
    return new Date(y, m - 1, d, th, tm, 0, 0).getTime() - now.getTime()
  }
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime() - now.getTime()
}

// ── Item order ────────────────────────────────────────────────────
export function applyOrder<T extends { id: string }>(
  items: T[],
  storedOrder: string[] = []
): T[] {
  const orderedIds = storedOrder.filter((id) => items.some((x) => x.id === id))
  const unordered = items.filter((x) => !orderedIds.includes(x.id))
  return [
    ...orderedIds
      .map((id) => items.find((x) => x.id === id))
      .filter((x): x is T => x !== undefined),
    ...unordered,
  ]
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
