const GAMES_KEY = "dailytracker:games";
const CHECKS_KEY = "dailytracker:checks";
function loadGames() {
  try {
    const v = localStorage.getItem(GAMES_KEY);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}
function saveGames(g) {
  try {
    localStorage.setItem(GAMES_KEY, JSON.stringify(g));
  } catch {
  }
}
function loadChecks() {
  try {
    const v = localStorage.getItem(CHECKS_KEY);
    return v ? JSON.parse(v) : {};
  } catch {
    return {};
  }
}
function saveChecks(c) {
  try {
    localStorage.setItem(CHECKS_KEY, JSON.stringify(c));
  } catch {
  }
}
export {
  loadChecks,
  loadGames,
  saveChecks,
  saveGames
};
