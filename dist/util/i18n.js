let _locale = null;
function detectLang() {
  const l = (navigator.language || "en").toLowerCase();
  if (l.startsWith("ja")) return "ja";
  if (l.includes("hant") || l === "zh-tw" || l === "zh-hk" || l === "zh-mo") return "zh-Hant";
  if (l.includes("hans") || l.startsWith("zh")) return "zh-Hans";
  if (l.startsWith("ko")) return "ko";
  if (l.startsWith("es")) return "es";
  return "en";
}
async function initI18n() {
  const lang = detectLang();
  try {
    const res = await fetch(`./locales/${lang}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    _locale = await res.json();
  } catch {
    const res = await fetch("./locales/en.json");
    _locale = await res.json();
  }
  document.title = _locale.appTitle;
  document.documentElement.lang = lang;
  return _locale;
}
function t(key, vars = {}) {
  const val = key.split(".").reduce((o, k) => o == null ? void 0 : o[k], _locale);
  if (typeof val !== "string") return val ?? key;
  return val.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}
function ta(key) {
  return key.split(".").reduce((o, k) => o == null ? void 0 : o[k], _locale) ?? [];
}
export {
  initI18n,
  t,
  ta
};
