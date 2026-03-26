type LocaleData = Record<string, unknown>;

let _locale: LocaleData | null = null;

function detectLang(): string {
  const l = (navigator.language || 'en').toLowerCase();
  if (l.startsWith('ja')) return 'ja';
  if (l.includes('hant') || l === 'zh-tw' || l === 'zh-hk' || l === 'zh-mo') return 'zh-Hant';
  if (l.includes('hans') || l.startsWith('zh')) return 'zh-Hans';
  if (l.startsWith('ko')) return 'ko';
  if (l.startsWith('es')) return 'es';
  return 'en';
}

export async function initI18n(): Promise<LocaleData> {
  const lang = detectLang();
  try {
    const res = await fetch(`./locales/${lang}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    _locale = await res.json() as LocaleData;
  } catch {
    const res = await fetch('./locales/en.json');
    _locale = await res.json() as LocaleData;
  }
  document.title = _locale.appTitle as string;
  document.documentElement.lang = lang;

  const badgeScaleX: Record<string, string> = {
    'en':      (4.5 / 4.5).toFixed(4),
    'es':      (4.5 / 3.5).toFixed(4),
    'ja':      '1',
    'ko':      '1',
    'zh-Hans': '1',
    'zh-Hant': '1',
  };
  document.documentElement.style.setProperty(
    '--badge-scale-x',
    badgeScaleX[lang] ?? '1',
  );

  return _locale;
}

export function t(key: string, vars: Record<string, string | number> = {}): string {
  const val = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], _locale);
  if (typeof val !== 'string') return key;
  return val.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}

export function ta(key: string): string[] {
  const val = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], _locale);
  return Array.isArray(val) ? (val as string[]) : [];
}
