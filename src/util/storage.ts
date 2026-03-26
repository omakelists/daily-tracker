import { EVENT } from '../constants';
import type { Game, Task, ChecksMap, TimeString } from '../types';

const GAMES_KEY  = 'dailytracker:games';
const CHECKS_KEY = 'dailytracker:checks';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LegacyGame = any;

function migrateGame(g: LegacyGame): Game {
  // Phase 1: legacy { tasks, events } → { items }
  if (!g.items) {
    const { tasks, events, dailyOrder: _do, periodicOrder: _po, eventOrder: _eo, ...rest } = g;
    g = {
      ...rest,
      items: [
        ...(tasks  ?? []),
        ...(events ?? []).map((ev: LegacyGame) => ({ ...ev, type: ev.type ?? 'event' })),
      ],
    };
  }
  // Phase 2: webdaily → daily
  // Phase 3: webResetTime → resetTime
  return {
    ...g,
    items: (g.items as LegacyGame[]).map((it: LegacyGame) => {
      const { webResetTime, ...rest } = it.type === 'webdaily' ? { ...it, type: 'daily' } : it;
      return webResetTime !== undefined ? { ...rest, resetTime: webResetTime } : rest;
    }),
  } as Game;
}

export function loadGames(): Game[] | null {
  try {
    const v = localStorage.getItem(GAMES_KEY);
    if (!v) return null;
    const games = JSON.parse(v) as unknown;
    return Array.isArray(games) ? (games as LegacyGame[]).map(migrateGame) : null;
  } catch { return null; }
}

export function saveGames(g: Game[]): void {
  try { localStorage.setItem(GAMES_KEY, JSON.stringify(g)); } catch { /* ignore */ }
}

export function loadChecks(): ChecksMap {
  try {
    const v = localStorage.getItem(CHECKS_KEY);
    return v ? JSON.parse(v) as ChecksMap : {};
  } catch { return {}; }
}

export function saveChecks(c: ChecksMap): void {
  try { localStorage.setItem(CHECKS_KEY, JSON.stringify(c)); } catch { /* ignore */ }
}

export function loadAll(): { games: Game[] | null; checks: ChecksMap } {
  let checks = loadChecks();
  let games: Game[] | null = null;
  try {
    const v = localStorage.getItem(GAMES_KEY);
    if (!v) return { games: null, checks };
    const raw = JSON.parse(v) as unknown;
    if (!Array.isArray(raw)) return { games: null, checks };

    let migrated = false;
    games = (raw as LegacyGame[]).map(migrateGame).map((g) => {
      const items = (g.items ?? []).map((it: Task & { done?: boolean }) => {
        // Phase 4: move item.done (event) into checks map
        if (it.type === EVENT && 'done' in it) {
          if (it.done) checks[`${it.id}__done`] = true;
          const { done: _done, ...rest } = it;
          migrated = true;
          return rest as Task;
        }
        return it;
      });
      return { ...g, items };
    });

    if (migrated) { saveGames(games); saveChecks(checks); }
  } catch { return { games: null, checks }; }
  return { games, checks };
}

// ── Helpers for building typed tasks from raw data ────────────────
/** Ensure a daily task has an explicit resetTime (falls back to game resetTime). */
export function normalizeDailyResetTime(task: LegacyGame, gameResetTime: TimeString): TimeString {
  return (task.resetTime ?? gameResetTime) as TimeString;
}
