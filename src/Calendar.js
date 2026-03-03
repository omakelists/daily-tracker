import { jsx, jsxs } from 'react/jsx-runtime';
import { useState, useEffect } from 'react';
import { t, ta } from './i18n.js';
import { getDaysInMonth, fmtDate, DAILY_TYPES } from './constants.js';
import { checkKey } from './helpers.js';
import { IS, SB, Modal } from './UI.js';

export function CalendarModal({ games, checks, now, onClose }) {
  const [year,    setYear]    = useState(now.getFullYear());
  const [month,   setMonth]   = useState(now.getMonth());
  const [selGame, setSelGame] = useState(games[0]?.id ?? null);
  const [selTask, setSelTask] = useState(null);

  const game       = games.find((g) => g.id === selGame);
  const dailyTasks = (game?.tasks ?? []).filter((tk) => DAILY_TYPES.has(tk.type));

  useEffect(() => { setSelTask(null); }, [selGame]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay    = new Date(year, month, 1).getDay();
  const today       = fmtDate(now);

  function getStatus(dk) {
    if (!game) return 'none';
    const tt   = selTask ? dailyTasks.filter((tk) => tk.id === selTask) : dailyTasks;
    if (!tt.length) return 'none';
    const done = tt.filter((tk) => !!checks[checkKey(tk.id, dk)]).length;
    if (done === 0)         return 'none';
    if (done === tt.length) return 'all';
    return 'partial';
  }

  const nav = (delta) => {
    const d = new Date(year, month + delta);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const dayNames = ta('dayNames');

  return jsx(Modal, {
    title: `📅 ${t('record')}`,
    onClose,
    children: jsxs('div', {
      children: [
        // Game / task selectors
        jsxs('div', {
          style: { display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
          children: [
            jsx('select', {
              value: selGame ?? '', onChange: (e) => setSelGame(e.target.value),
              style: { ...IS, flex: 1, minWidth: 120 },
              children: games.map((g) => jsx('option', { value: g.id, children: g.name }, g.id)),
            }),
            dailyTasks.length > 0 && jsx('select', {
              value: selTask ?? '', onChange: (e) => setSelTask(e.target.value || null),
              style: { ...IS, flex: 1, minWidth: 100 },
              children: [
                jsx('option', { value: '', children: t('taskAll') }),
                ...dailyTasks.map((tk) => jsx('option', { value: tk.id, children: tk.name.trim() || t(`types.${tk.type}`) }, tk.id)),
              ],
            }),
          ],
        }),

        // Month navigation
        jsxs('div', {
          style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
          children: [
            jsx('button', { onClick: () => nav(-1), style: SB, children: '‹' }),
            jsx('span', { style: { fontWeight: 700, fontSize: 15 }, children: new Date(year, month, 1).toLocaleDateString([], { year: 'numeric', month: 'long' }) }),
            jsx('button', { onClick: () => nav(1), style: SB, children: '›' }),
          ],
        }),

        // Calendar grid
        jsx('div', {
          style: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 },
          children: [
            ...dayNames.map((d) => jsx('div', { style: { textAlign: 'center', fontSize: 11, color: '#8b949e', padding: '3px 0' }, children: d }, d)),
            ...Array.from({ length: firstDay }, (_, i) => jsx('div', {}, `e${i}`)),
            ...Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const dk  = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const s   = getStatus(dk);
              return jsx('div', {
                className: 'cal-day',
                style: {
                  fontWeight: dk === today ? 700 : 400,
                  background: s === 'all' ? '#1a7f37' : s === 'partial' ? '#1f3a27' : 'rgba(255,255,255,0.03)',
                  border:     dk === today ? '2px solid #58a6ff' : '1px solid rgba(255,255,255,0.05)',
                  color:      s === 'all' ? '#56d364' : s === 'partial' ? '#3fb950' : '#484f58',
                },
                children: day,
              }, dk);
            }),
          ],
        }),

        // Legend
        jsx('div', {
          style: { display: 'flex', gap: 14, marginTop: 12, fontSize: 12, color: '#8b949e' },
          children: [
            ['#1a7f37', t('allDone')],
            ['#1f3a27', t('partial')],
            ['rgba(255,255,255,0.05)', t('incomplete')],
          ].map(([bg, lbl]) => jsxs('span', {
            children: [
              jsx('span', { style: { display: 'inline-block', width: 11, height: 11, background: bg, border: bg.includes('rgba') ? '1px solid rgba(255,255,255,0.1)' : 'none', borderRadius: 3, marginRight: 4 } }),
              lbl,
            ],
          }, lbl)),
        }),
      ],
    }),
  });
}
