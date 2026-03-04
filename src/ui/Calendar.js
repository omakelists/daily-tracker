import { jsx, jsxs } from 'react/jsx-runtime';
import { useState, useEffect } from 'react';
import { css, cx } from '@emotion/css';
import { t, ta } from '../util/i18n.js';
import { getDaysInMonth, fmtDate, DAILY_TYPES } from '../constants.js';
import { checkKey } from '../util/helpers.js';
import { inputCls, Modal, sharedStyles as ss } from './UI.js';

// ── Styles ────────────────────────────────────────────────────────
const s = {
  filters:  css({ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }),
  header:   css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }),
  month:    css({ fontWeight: 700, fontSize: 15 }),
  grid:     css({ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }),
  dayName:  css({ textAlign: 'center', fontSize: 11, color: 'var(--muted)', padding: '3px 0' }),
  day:      css({ aspectRatio: '1', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }),
  legend:   css({ display: 'flex', gap: 14, marginTop: 12, fontSize: 12, color: 'var(--muted)' }),
  legendDot: css({ display: 'inline-block', width: 11, height: 11, borderRadius: 3, marginRight: 4 }),
};

export function CalendarModal({ games, checks, now, onClose }) {
  const [year,    setYear]    = useState(now.getUTCFullYear());
  const [month,   setMonth]   = useState(now.getUTCMonth());
  const [selGame, setSelGame] = useState(games[0]?.id ?? null);
  const [selTask, setSelTask] = useState(null);

  const game       = games.find((g) => g.id === selGame);
  const rawTasks   = game?.tasks ?? [];
  const dailyTasks = rawTasks.length
    ? rawTasks.filter((tk) => DAILY_TYPES.has(tk.type))
    : [{ id: `${game?.id}_solo`, type: 'daily', name: '' }];

  useEffect(() => { setSelTask(null); }, [selGame]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay    = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const today       = fmtDate(now);

  const getStatus = (dk) => {
    if (!game) return 'none';
    const tt   = selTask ? dailyTasks.filter((tk) => tk.id === selTask) : dailyTasks;
    if (!tt.length) return 'none';
    const done = tt.filter((tk) => !!checks[checkKey(tk.id, dk)]).length;
    if (done === 0)         return 'none';
    if (done === tt.length) return 'all';
    return 'partial';
  };

  const nav = (delta) => {
    const d = new Date(Date.UTC(year, month + delta, 1));
    setYear(d.getUTCFullYear()); setMonth(d.getUTCMonth());
  };

  const dayNames = ta('dayNames');

  return jsx(Modal, {
    title: `📅 ${t('record')}`,
    onClose,
    children: jsxs('div', { children: [
      jsxs('div', { className: s.filters, children: [
        jsx('select', {
          value: selGame ?? '', onChange: (e) => setSelGame(e.target.value),
          className: inputCls, style: { flex: 1, minWidth: 120 },
          children: games.map((g) => jsx('option', { value: g.id, children: g.name }, g.id)),
        }),
        dailyTasks.length > 0 && jsx('select', {
          value: selTask ?? '', onChange: (e) => setSelTask(e.target.value || null),
          className: inputCls, style: { flex: 1, minWidth: 100 },
          children: [
            jsx('option', { value: '', children: t('taskAll') }),
            ...dailyTasks.map((tk) => jsx('option', { value: tk.id, children: tk.name.trim() || t(`types.${tk.type}`) }, tk.id)),
          ],
        }),
      ]}),
      jsxs('div', { className: s.header, children: [
        jsx('button', { onClick: () => nav(-1), className: ss.btn, children: '‹' }),
        jsx('span', { className: s.month, children: new Date(Date.UTC(year, month, 1)).toLocaleDateString([], { year: 'numeric', month: 'long' }) }),
        jsx('button', { onClick: () => nav(1),  className: ss.btn, children: '›' }),
      ]}),
      jsx('div', { className: s.grid, children: [
        ...dayNames.map((d) => jsx('div', { className: s.dayName, children: d }, d)),
        ...Array.from({ length: firstDay }, (_, i) => jsx('div', {}, `e${i}`)),
        ...Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const dk  = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const st  = getStatus(dk);
          return jsx('div', {
            className: s.day,
            style: {
              fontWeight: dk === today ? 700 : 400,
              background: st === 'all' ? 'var(--checked-bg)' : st === 'partial' ? '#1f3a27' : 'rgba(255,255,255,0.03)',
              border: dk === today ? '2px solid var(--link)' : '1px solid rgba(255,255,255,0.05)',
              color: st === 'all' ? 'var(--green)' : st === 'partial' ? 'var(--green)' : 'var(--dim)',
            },
            children: day,
          }, dk);
        }),
      ]}),
      jsx('div', { className: s.legend, children: [
        ['var(--checked-bg)', t('allDone')],
        ['#1f3a27',           t('partial')],
        ['rgba(255,255,255,0.05)', t('incomplete')],
      ].map(([bg, lbl]) => jsxs('span', { children: [
        jsx('span', { className: s.legendDot, style: { background: bg, border: bg.includes('rgba') ? '1px solid rgba(255,255,255,0.1)' : 'none' } }),
        lbl,
      ]}, lbl))}),
    ]}),
  });
}
