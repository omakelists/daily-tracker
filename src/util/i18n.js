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

  // Set badge scaleX as a CSS custom property so only the inner text is compressed
  // to fit within the fixed 4.5rem badge border. Scale = 4.5 / needed-width-in-rem.
  // Locales whose longest label already fits in 4.5rem use 1 (no compression).
  const badgeScaleX = {
    'en':      (4.5 / 5.5).toFixed(4), // "Half-Monthly" → ~0.8182
    'es':      (4.5 / 5.0).toFixed(4), // "Quincenal"    → 0.9000
    'ja':      '1',                     // "ウィークリー" fits in 4.5rem
    'ko':      '1',                     // "데일리" etc.  fits in 4.5rem
    'zh-Hans': '1',                     // "每日" etc.    fits in 4.5rem
    'zh-Hant': '1',                     // "每日" etc.    fits in 4.5rem
  };
  document.documentElement.style.setProperty(
    '--badge-scale-x',
    badgeScaleX[lang] ?? '1',
  );

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
