let _locale = null;

function detectLang() {
  const l = (navigator.language || 'en').toLowerCase();
  if (l.startsWith('ja')) return 'ja';
  // Traditional Chinese: zh-hant, zh-tw, zh-hk, zh-mo
  if (l.includes('hant') || l === 'zh-tw' || l === 'zh-hk' || l === 'zh-mo') return 'zh-Hant';
  // Simplified Chinese: zh-hans, zh-cn, zh-sg, zh (bare)
  if (l.includes('hans') || l.startsWith('zh')) return 'zh-Hans';
  if (l.startsWith('ko')) return 'ko';
  if (l.startsWith('es')) return 'es';
  return 'en';
}

export async function initI18n() {
  const lang = detectLang();
  try {
    const res = await fetch(`./locales/${lang}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    _locale = await res.json();
  } catch {
    const res = await fetch('./locales/en.json');
    _locale = await res.json();
  }
  document.title = _locale.appTitle;
  document.documentElement.lang = lang;
  return _locale;
}

export function t(key, vars = {}) {
  const val = key.split('.').reduce((o, k) => o?.[k], _locale);
  if (typeof val !== 'string') return val ?? key;
  return val.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

export function ta(key) {
  return key.split('.').reduce((o, k) => o?.[k], _locale) ?? [];
}
