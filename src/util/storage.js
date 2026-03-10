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
        ...(events ?? []).map((ev) => ({ ...ev, type: ev.type ?? 'event' })),
      ],
    };
  }
  // Phase 2: webdaily → daily
  // Phase 3: webResetTime → resetTime (task-level reset time unified with game field name)
  return {
    ...g,
    items: g.items.map((it) => {
      const { webResetTime, ...rest } = it.type === 'webdaily' ? { ...it, type: 'daily' } : it;
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

