let _locale = null;

function detectLang() {
  const l = (navigator.language || 'en').toLowerCase();
  if (l.startsWith('ja')) return 'ja';
  if (l.startsWith('zh')) return 'zh';
  if (l.startsWith('ko')) return 'ko';
  if (l.startsWith('es')) return 'es';
  return 'en';
}

export async function initI18n() {
  const lang = detectLang();
  try {
    const res = await fetch(`./locales/${lang}.json`);
    _locale = await res.json();
  } catch {
    const res = await fetch('./locales/en.json');
    _locale = await res.json();
  }
  document.title = _locale.appTitle;
  document.documentElement.lang = lang;
  return _locale;
}

/**
 * Translate a key with optional variable substitution.
 * Supports dot-notation for nested keys: t('types.daily')
 * Supports placeholders: t('deleteMsg', { name: 'Foo' }) → 'Delete "Foo"?'
 */
export function t(key, vars = {}) {
  const val = key.split('.').reduce((o, k) => o?.[k], _locale);
  if (typeof val !== 'string') return val ?? key;
  return val.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}
