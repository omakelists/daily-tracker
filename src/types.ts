// ── Template literal types ────────────────────────────────────────
export type HexColor = `#${string}`
export type TimeString = `${string}:${string}`

// ── Branded (phantom) types for timezone safety ───────────────────
// Zero runtime cost — brand exists at the type level only.
// Equivalent to Scala's tagged types (@@).
type Brand<T, B> = T & { readonly _brand: B }

/** HH:MM string stored/calculated in UTC (data model, all helpers). */
export type UtcTimeString = Brand<TimeString, 'utc'>

/** HH:MM string in the user's local timezone (<input type="time"> values only). */
export type LocalTimeString = Brand<TimeString, 'local'>
export type YMDString = `${string}-${string}-${string}`

// ── Task type ─────────────────────────────────────────────────────
export type TaskType = 'daily' | 'weekly' | 'halfmonthly' | 'monthly' | 'event'

// ── Discriminated union task types ────────────────────────────────

export interface BaseTask {
  id: string
  name: string
  type: TaskType
  resetTime?: UtcTimeString
}

export interface DailyTask extends BaseTask {
  type: 'daily'
  resetTime: UtcTimeString
}

export interface WeeklyTask extends BaseTask {
  type: 'weekly'
  weeklyResetDay: number
}

export interface HalfMonthlyTask extends BaseTask {
  type: 'halfmonthly'
  halfMonthlyStartDay: number
}

export interface MonthlyTask extends BaseTask {
  type: 'monthly'
  monthlyResetDay: number
}

export interface EventTask extends BaseTask {
  type: 'event'
  deadline: YMDString
  deadlineTime: UtcTimeString
}

export type Task =
  | DailyTask
  | WeeklyTask
  | HalfMonthlyTask
  | MonthlyTask
  | EventTask

// ── Mutable draft used by TaskAddForm / TaskEdit ──────────────────
// Looser than Task — fields are optional to allow partial editing.
export interface TaskDraft {
  id: string
  name: string
  type: TaskType
  resetTime?: UtcTimeString
  weeklyResetDay?: number
  monthlyResetDay?: number
  halfMonthlyStartDay?: number
  deadline?: string | null
  deadlineTime?: UtcTimeString | null
}

// ── Game ──────────────────────────────────────────────────────────
export interface Game {
  id: string
  name: string
  color: HexColor
  resetTime: UtcTimeString
  items: Task[]
  itemOrder?: string[]
}

// ── Other shared types ────────────────────────────────────────────

/** Flat map of check state: checkKey(itemId, periodKey) → true. */
export type ChecksMap = Record<string, boolean>

/** Persisted background image entry stored in IndexedDB. */
export interface ImageEntry {
  dataUrl: string
  opacity: number
}

/** Localised countdown label set passed to formatCountdown(). */
export interface CountdownLabels {
  d: string
  h: string
  m: string
}

/** State stored by App for the confirm dialog. */
export interface ConfirmState {
  message: string
  onConfirm: () => void
  confirmLabel: string
}

/** Per-game background image info held in useAppSettings. */
export interface GameBgEntry {
  dataUrl: string
  opacity: number
}
