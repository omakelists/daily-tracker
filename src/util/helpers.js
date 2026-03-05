import { fmtDate } from '../constants.js';

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
export function dateToWeekKey(dk) {
  const d   = new Date(dk + 'T00:00:00Z');
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - (day === 0 ? 6 : day - 1));
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

export const dateToHalfMonthKey = (dk) =>
  'H-' + dk.slice(0, 7) + '-' + (parseInt(dk.slice(8)) >= 16 ? 'B' : 'A');

export function prevHalfMonthKey(k) {
  const [, y, mo, half] = k.match(/H-(\d+)-(\d+)-([AB])/);
  if (half === 'B') return `H-${y}-${mo}-A`;
  const p = new Date(Date.UTC(parseInt(y), parseInt(mo) - 2, 1));
  return `H-${p.getUTCFullYear()}-${String(p.getUTCMonth()+1).padStart(2,'0')}-B`;
}

export const getTaskRT = (task, game) =>
  task.type === 'webdaily' ? (task.webResetTime || game.resetTime) : game.resetTime;

export function getPeriodKey(task, game, now) {
  const dk = getGameDateKey(now, getTaskRT(task, game));
  if (task.type === 'weekly')      return dateToWeekKey(dk);
  if (task.type === 'monthly')     return getMonthPeriodKey(dk, task.monthlyResetDay || 1);
  if (task.type === 'halfmonthly') return dateToHalfMonthKey(dk);
  return dk;
}

export function getPrevPeriodKey(task, game, now) {
  const rt = getTaskRT(task, game);
  const dk = getGameDateKey(now, rt);
  if (task.type === 'weekly')      return dateToWeekKey(shiftDate(dk, -7));
  if (task.type === 'monthly')     return getPrevMonthPeriodKey(getMonthPeriodKey(dk, task.monthlyResetDay || 1));
  if (task.type === 'halfmonthly') return prevHalfMonthKey(dateToHalfMonthKey(dk));
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

export function msUntilNextHalfMonth(now, rtUTC) {
  const r      = parseHHMM(rtUTC);
  const utcDay = now.getUTCDate();
  const utcMin = now.getUTCHours() * 60 + now.getUTCMinutes();
  let tgt;
  if      (utcDay < 1  || (utcDay === 1  && utcMin < r)) tgt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(),     1,  Math.floor(r/60), r%60));
  else if (utcDay < 16 || (utcDay === 16 && utcMin < r)) tgt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(),     16, Math.floor(r/60), r%60));
  else                                                    tgt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1,  Math.floor(r/60), r%60));
  return tgt - now;
}

export function msUntilTaskReset(task, game, now) {
  const rt = getTaskRT(task, game);
  if (task.type === 'monthly')     return msUntilNextMonth(now, rt, task.monthlyResetDay || 1);
  if (task.type === 'halfmonthly') return msUntilNextHalfMonth(now, rt);
  if (task.type === 'weekly') {
    const rtMin = parseHHMM(rt);
    const dow   = now.getUTCDay();
    const tgt   = new Date(now);
    tgt.setUTCHours(Math.floor(rtMin/60), rtMin%60, 0, 0);
    if (dow === 1 && now < tgt) return tgt - now;
    const days = dow === 0 ? 1 : (8 - dow) % 7 || 7;
    tgt.setUTCDate(tgt.getUTCDate() + (dow === 1 ? 7 : days));
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

export const checkKey = (id, pk) => `${id}__${pk}`;

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

/** Virtual solo task for games that have no subtasks. */
export const soloTask = (game) => ({ id: `${game.id}_solo`, type: 'daily' });

/** Returns the task list for a game, substituting a solo task when empty. */
export const getTasksOrSolo = (game) =>
  game.tasks.length ? game.tasks : [soloTask(game)];
