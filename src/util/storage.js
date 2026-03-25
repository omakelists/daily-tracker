import { DAILY, EVENT } from '../constants';

const GAMES_KEY  = 'dailytracker:games';
const CHECKS_KEY = 'dailytracker:checks';

/**
 * Migrate a game object from the legacy { tasks, events } shape to { items }.
 * Safe to call on already-migrated data (detected by presence of `items`).
 */
function migrateGame(g) {
  // Phase 1: legacy { tasks, events } → { items }
  if (!g.items) {
    const { tasks, events, dailyOrder, periodicOrder, eventOrder, ...rest } = g;
    g = {
      ...rest,
      items: [
        ...(tasks  ?? []),
        ...(events ?? []).map((ev) => ({ ...ev, type: ev.type ?? EVENT })),
      ],
    };
  }
  // Phase 2: webdaily → daily
  // Phase 3: webResetTime → resetTime (task-level reset time unified with game field name)
  return {
    ...g,
    items: g.items.map((it) => {
      const { webResetTime, ...rest } = it.type === 'webdaily' ? { ...it, type: DAILY } : it;
      return webResetTime !== undefined ? { ...rest, resetTime: webResetTime } : rest;
    }),
  };
}

export function loadGames() {
  try {
    const v = localStorage.getItem(GAMES_KEY);
    if (!v) return null;
    const games = JSON.parse(v);
    return Array.isArray(games) ? games.map(migrateGame) : null;
  } catch { return null; }
}
export function saveGames(g) {
  try { localStorage.setItem(GAMES_KEY, JSON.stringify(g)); } catch {}
}
export function loadChecks() {
  try {
    const v = localStorage.getItem(CHECKS_KEY);
    return v ? JSON.parse(v) : {};
  } catch { return {}; }
}
export function saveChecks(c) {
  try { localStorage.setItem(CHECKS_KEY, JSON.stringify(c)); } catch {}
}

/**
 * Load both games and checks, performing Phase-4 migration:
 * event item.done → checks[id__done] = true.
 * Use this instead of calling loadGames() + loadChecks() separately.
 */
export function loadAll() {
  let checks = loadChecks();
  let games  = null;
  try {
    const v = localStorage.getItem(GAMES_KEY);
    if (!v) return { games: null, checks };
    const raw = JSON.parse(v);
    if (!Array.isArray(raw)) return { games: null, checks };

    let migrated = false;
    games = raw.map(migrateGame).map((g) => {
      const items = (g.items ?? []).map((it) => {
        // Phase 4: move item.done (event) into checks map
        if (it.type === EVENT && 'done' in it) {
          if (it.done) checks[`${it.id}__done`] = true;
          const { done, ...rest } = it;
          migrated = true;
          return rest;
        }
        return it;
      });
      return { ...g, items };
    });

    if (migrated) { saveGames(games); saveChecks(checks); }
  } catch { return { games: null, checks }; }
  return { games, checks };
}
