import { fmtDate } from './constants.js';

export const parseHHMM = (s) => { const [h, m] = (s || '00:00').split(':').map(Number); return h * 60 + m; };

// ── UTC-based date key calculation ─────────────────────────────────
/**
 * The "game date key" for a UTC reset time.
 * If the current UTC time is before the reset, we're still in yesterday's game day.
 */
export function getGameDateKey(now, resetTimeUTC) {
  const utcMin  = now.getUTCHours() * 60 + now.getUTCMinutes();
  const resetMin = parseHHMM(resetTimeUTC);
  const base    = new Date(now);
  if (utcMin < resetMin) base.setUTCDate(base.getUTCDate() - 1);
  return fmtDate(base);
}

/** Shift a YYYY-MM-DD UTC date key by `days` days. */
export function shiftDate(dateKey, days) {
  const d = new Date(dateKey + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return fmtDate(d);
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
