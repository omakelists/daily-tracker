const GAMES_KEY  = 'dailytracker:games';
const CHECKS_KEY = 'dailytracker:checks';
const TODOS_KEY  = 'dailytracker:todos';

export function loadGames() {
  try {
    const v = localStorage.getItem(GAMES_KEY);
    return v ? JSON.parse(v) : null;
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
export function loadTodos() {
  try { const v = localStorage.getItem(TODOS_KEY); return v ? JSON.parse(v) : []; }
  catch { return []; }
}
export function saveTodos(t) {
  try { localStorage.setItem(TODOS_KEY, JSON.stringify(t)); } catch {}
}
