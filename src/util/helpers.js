import { fmtDate, DAILY_TYPES, EVENT_TYPES } from '../constants';

export const parseHHMM = (s) => { const [h, m] = (s || '00:00').split(':').map(Number); return h * 60 + m; };

/** Format a Date as YYYY-MM-DD using LOCAL date (not UTC). */
const localFmtDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// ── Local-date-based game day key ────────────────────────────────────
/**
 * The reset time acts as the date-change boundary for each game.
 * Comparison is done in LOCAL time so the boundary works correctly
 * regardless of the viewer's UTC offset.
 *
 * Steps:
 *  1. Convert the stored UTC reset HH:MM to local HH:MM by constructing
 *     a Date with those UTC hours and reading back local hours.
 *  2. Compare local-minutes-since-midnight of now vs reset.
 *  3. If now < reset -> still in previous game day -> subtract 1 local day.
 *  4. Return a YYYY-MM-DD key in LOCAL date.
 */
export function getGameDateKey(now, resetTimeUTC) {
  // Derive local reset time from stored UTC HH:MM
  const [rh, rm] = (resetTimeUTC || '00:00').split(':').map(Number);
  const tmp = new Date(now);
  tmp.setUTCHours(rh, rm, 0, 0);
  const localResetMin = tmp.getHours() * 60 + tmp.getMinutes();

  const localNowMin = now.getHours() * 60 + now.getMinutes();

  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (localNowMin < localResetMin) base.setDate(base.getDate() - 1);

  return localFmtDate(base);
}

/** Shift a YYYY-MM-DD date key by `days` days. */
export function shiftDate(dateKey, days) {
  const d = new Date(dateKey + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return fmtDate(d);   // pure date arithmetic — UTC vs local doesn't matter
}

export const getPrevGameDateKey = (now, rt) => shiftDate(getGameDateKey(now, rt), -1);

// ── Period key helpers ─────────────────────────────────────────────
/** Returns the YYYY-MM-DD of the period-start for the week that contains dk,
 *  where a new week begins on UTC day-of-week `rd` (0=Sun ... 6=Sat, default 1=Mon).
 */
export function dateToWeekKey(dk, rd = 1) {
  const d        = new Date(dk + 'T00:00:00Z');
  const day      = d.getUTCDay();
  const daysBack = (day - rd + 7) % 7;
  d.setUTCDate(d.getUTCDate() - daysBack);
  return 'W' + fmtDate(d);
}

export function getMonthPeriodKey(dk, rd) {
  const r  = rd || 1;
  const day = parseInt(dk.slice(8));
  const y   = parseInt(dk.slice(0, 4));
  const mo  = parseInt(dk.slice(5, 7));
  if (day >= r) return `M-${y}-${String(mo).padStart(2,'0')}-${String(r).padStart(2,'0')}`;
  const p = new Date(Date.UTC(y, mo - 2, r));
  return `M-${p.getUTCFullYear()}-${String(p.getUTCMonth()+1).padStart(2,'0')}-${String(r).padStart(2,'0')}`;
}

export function getPrevMonthPeriodKey(k) {
  const [, y, mo, dd] = k.match(/M-(\d+)-(\d+)-(\d+)/);
  const p = new Date(Date.UTC(parseInt(y), parseInt(mo) - 2, parseInt(dd)));
  return `M-${p.getUTCFullYear()}-${String(p.getUTCMonth()+1).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;
}

export const dateToHalfMonthKey = (dk, startDay = 1) => {
  const day = parseInt(dk.slice(8));
  const b   = startDay + 15;
  // Day is in period B when: day >= b, OR (b > 28 and day < startDay)
  const inB = b <= 28 ? day >= b : (day >= b || day < startDay);
  return 'H-' + dk.slice(0, 7) + '-' + (inB ? 'B' : 'A');
};

export function prevHalfMonthKey(k, startDay = 1) {
  const [, y, mo, half] = k.match(/H-(\d+)-(\d+)-([AB])/);
  if (half === 'B') return `H-${y}-${mo}-A`;
  const p = new Date(Date.UTC(parseInt(y), parseInt(mo) - 2, startDay));
  return `H-${p.getUTCFullYear()}-${String(p.getUTCMonth()+1).padStart(2,'0')}-B`;
}

// Task-level resetTime takes precedence over game resetTime.
export const getTaskRT = (task, game) => task.resetTime || game.resetTime;

export function getPeriodKey(task, game, now) {
  const dk = getGameDateKey(now, getTaskRT(task, game));
  if (task.type === 'weekly')      return dateToWeekKey(dk, task.weeklyResetDay ?? 1);
  if (task.type === 'monthly')     return getMonthPeriodKey(dk, task.monthlyResetDay || 1);
  if (task.type === 'halfmonthly') return dateToHalfMonthKey(dk, task.halfMonthlyStartDay ?? 1);
  return dk;
}

export function getPrevPeriodKey(task, game, now) {
  const rt = getTaskRT(task, game);
  const dk = getGameDateKey(now, rt);
  if (task.type === 'weekly')      return dateToWeekKey(shiftDate(dk, -7), task.weeklyResetDay ?? 1);
  if (task.type === 'monthly')     return getPrevMonthPeriodKey(getMonthPeriodKey(dk, task.monthlyResetDay || 1));
  if (task.type === 'halfmonthly') return prevHalfMonthKey(dateToHalfMonthKey(dk, task.halfMonthlyStartDay ?? 1), task.halfMonthlyStartDay ?? 1);
  return getPrevGameDateKey(now, rt);
}

// ── Countdown helpers (all UTC) ────────────────────────────────────
export function msUntilReset(now, rtUTC) {
  const r = parseHHMM(rtUTC);
  const n = now.getUTCHours() * 60 + now.getUTCMinutes() + now.getUTCSeconds() / 60;
  let d = r - n;
  if (d <= 0) d += 24 * 60;
  return d * 60 * 1000;
}

export function msUntilNextMonth(now, rtUTC, rd) {
  const r   = parseHHMM(rtUTC);
  const day = rd || 1;
  const utcDay = now.getUTCDate();
  const utcMin = now.getUTCHours() * 60 + now.getUTCMinutes();
  const tgt = (utcDay < day || (utcDay === day && utcMin < r))
    ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(),     day, Math.floor(r/60), r%60))
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, day, Math.floor(r/60), r%60));
  return tgt - now;
}

export function msUntilNextHalfMonth(now, rtUTC, startDay = 1) {
  const r      = parseHHMM(rtUTC);
  const b      = startDay + 15;              // second reset day in the month
  const utcDay = now.getUTCDate();
  const utcMin = now.getUTCHours() * 60 + now.getUTCMinutes();
  const rh = Math.floor(r / 60), rm = r % 60;
  // Candidate reset dates in order: startDay this month → b this month → startDay next month
  // When b > 28 it may fall outside the month; use next month's startDay as the wrap target.
  const candidates = [
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(),     startDay, rh, rm)),
    b <= 28
      ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(),     b,        rh, rm))
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, startDay, rh, rm)),
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, startDay, rh, rm)),
  ];
  const tgt = candidates.find((c) => c > now);
  return (tgt ?? candidates[2]) - now;
}

export function msUntilTaskReset(task, game, now) {
  const rt = getTaskRT(task, game);
  if (task.type === 'monthly')     return msUntilNextMonth(now, rt, task.monthlyResetDay || 1);
  if (task.type === 'halfmonthly') return msUntilNextHalfMonth(now, rt, task.halfMonthlyStartDay ?? 1);
  if (task.type === 'weekly') {
    const rd    = task.weeklyResetDay ?? 1; // 0=Sun ... 6=Sat
    const rtMin = parseHHMM(rt);
    const dow   = now.getUTCDay();
    const tgt   = new Date(now);
    tgt.setUTCHours(Math.floor(rtMin/60), rtMin%60, 0, 0);
    if (dow === rd && now < tgt) return tgt - now;
    const days = (rd - dow + 7) % 7 || 7;
    tgt.setUTCDate(tgt.getUTCDate() + days);
    return tgt - now;
  }
  return msUntilReset(now, rt);
}

export function formatCountdown(ms, cd) {
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
  if (h >= 24) return `${Math.floor(h/24)}${cd.d}`;
  if (h >= 1)  return `${h}${cd.h}`;
  return `${m}${cd.m}`;
}

/**
 * Returns a CSS color variable for a countdown based on remaining milliseconds.
 * @param {number}  ms       - Remaining milliseconds (negative = expired).
 * @param {number}  urgentH  - Hours threshold below which color is cd-urgent.
 * @param {number}  warnH    - Hours threshold below which color is cd-warn.
 */
export function cdColor(ms, urgentH, warnH) {
  if (ms <= 0)                    return 'var(--danger)';
  const h = ms / 3600000;
  if (h < urgentH)                return 'var(--cd-urgent)';
  if (h < warnH)                  return 'var(--cd-warn)';
  return 'var(--muted)';
}

export const checkKey = (id, pk) => `${id}__${pk}`;

/**
 * Pure function: returns true when the game's master checkbox should show as checked.
 * This is the single source of truth used by App (sort / fanfare) and GameCard (display).
 *
 * Rules:
 *   - No items (solo mode)  → virtual solo task is checked
 *   - Has daily tasks       → all tasks due within 24h are checked (≥1 must exist)
 *   - No daily tasks        → every task is checked AND every event is done
 *
 * @param {object} game
 * @param {object} checks   - flat checks map { key: bool }
 * @param {Date}   now
 * @param {string} soloId   - virtual task id when game has no items (e.g. `${game.id}_solo`)
 */
export function calcAllDone(game, checks, now, soloId) {
  const allItems   = game.items ?? [];
  const dailyItems = allItems.filter((it) => DAILY_TYPES.has(it.type));

  if (allItems.length === 0) {
    const solo = { id: soloId, type: 'daily' };
    return !!checks[checkKey(solo.id, getPeriodKey(solo, game, now))];
  }
  if (dailyItems.length > 0) {
    const DAY    = 24 * 3600000;
    const urgent = allItems.filter((it) => !EVENT_TYPES.has(it.type) && msUntilTaskReset(it, game, now) < DAY);
    return urgent.length > 0 && urgent.every((tk) => !!checks[checkKey(tk.id, getPeriodKey(tk, game, now))]);
  }
  const tasksDone  = allItems.filter((it) => !EVENT_TYPES.has(it.type)).every((tk) => !!checks[checkKey(tk.id, getPeriodKey(tk, game, now))]);
  const eventsDone = allItems.filter((it) =>  EVENT_TYPES.has(it.type)).every((it) => !!it.done);
  return tasksDone && eventsDone;
}

/** ms until the deadline.
 *  dateStr  = 'YYYY-MM-DD'
 *  timeUtc  = 'HH:MM' in UTC (optional). If omitted, uses end-of-local-day (midnight next day).
 */
export function msUntilDeadline(dateStr, now, timeUtc) {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (timeUtc && timeUtc.includes(':')) {
    const [th, tm] = timeUtc.split(':').map(Number);
    // Build a local Date for that date at the given UTC time
    const deadline = new Date(Date.UTC(y, m - 1, d, th, tm, 0, 0));
    return deadline - now;
  }
  return new Date(y, m - 1, d + 1, 0, 0, 0, 0) - now;
}

// ── Sound effects ──────────────────────────────────────────────────
export function playCheckSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination); o.type = 'sine';
    o.frequency.setValueAtTime(880, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08);
    g.gain.setValueAtTime(0.18, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    o.start(); o.stop(ctx.currentTime + 0.25);
  } catch {}
}

export function playAllDoneSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [523, 659, 784, 1047].forEach((freq, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination); o.type = 'sine';
      const t = ctx.currentTime + i * 0.1;
      o.frequency.setValueAtTime(freq, t); g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o.start(t); o.stop(t + 0.3);
    });
  } catch {}
}

/** Locale-aware deadline date formatter.
 *  Uses the dateFmt key from i18n, e.g. ja "{m}月{d}日", en "{m}/{d}".
 *  Import t from i18n at call site or pass a pre-fetched format string.
 */
export function fmtDeadlineDate(dateStr, tFn) {
  if (!dateStr) return '';
  const [, m, d] = dateStr.split('-').map(Number);
  return tFn('dateFmt', { m, d });
}
