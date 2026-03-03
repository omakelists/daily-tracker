import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { t } from './i18n.js';
import { PERIOD_TYPES, L, ensureContrast } from './constants.js';
import { getPeriodKey, getPrevPeriodKey, msUntilReset, formatCountdown, checkKey } from './helpers.js';
import { Row, PrevBar, LinkButton } from './UI.js';
import { TaskRow } from './TaskRow.js';

export function GameCard({ game, checks, now, onToggle, allDone, dailyTasks, cd }) {
  const hasTasks = game.tasks.length > 0;

  const allTodayDone = dailyTasks.length > 0 &&
    dailyTasks.every((tk) => !!checks[checkKey(tk.id, getPeriodKey(tk, game, now))]);

  const prevCount   = dailyTasks.filter((tk) => !!checks[checkKey(tk.id, getPrevPeriodKey(tk, game, now))]).length;
  const prevAll     = dailyTasks.length > 0 && prevCount === dailyTasks.length;
  const prevPartial = prevCount > 0 && prevCount < dailyTasks.length;

  const ms       = msUntilReset(now, game.resetTime);
  const h        = ms / 3600000;
  const cdColor  = h < 3 ? '#f85149' : h < 6 ? '#e3b341' : '#8b949e';
  const visColor = ensureContrast(game.color);

  const dailyGroup  = game.tasks.filter((tk) => !PERIOD_TYPES.has(tk.type));
  const periodGroup = game.tasks.filter((tk) =>  PERIOD_TYPES.has(tk.type));

  return jsxs('div', {
    style: { background: 'rgba(22,27,34,0.85)', border: `1px solid ${allDone ? `${game.color}55` : 'rgba(255,255,255,0.07)'}`, borderLeft: `${L.CARD_BORDER}px solid ${game.color}`, borderRadius: 12, marginBottom: 10, overflow: 'hidden', opacity: allDone ? 0.62 : 1, transition: 'opacity 0.5s, border-color 0.5s' },
    children: [
      jsx(Row, {
        bg: `linear-gradient(90deg, ${game.color}14, transparent)`,
        borderBottom: hasTasks ? '1px solid rgba(255,255,255,0.055)' : 'none',
        prevBar: jsx(PrevBar, { show: dailyTasks.length > 0, checked: prevAll, partial: prevPartial }),
        checkbox: jsx('button', {
          onClick: () => onToggle(null, game, true),
          style: { width: L.CB_W, height: L.CB_W, borderRadius: 7, cursor: 'pointer', flexShrink: 0, background: allTodayDone ? game.color : 'transparent', border: `2px solid ${allTodayDone ? game.color : 'rgba(255,255,255,0.22)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff', transition: 'all 0.2s', boxShadow: allTodayDone ? `0 0 10px ${game.color}55` : 'none' },
          children: allTodayDone ? '✓' : '',
        }),
        content: jsx('span', {
          style: { fontWeight: 700, fontSize: 14, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: allDone ? '#6e7681' : visColor, textDecoration: allDone ? 'line-through' : 'none', textShadow: '0 1px 3px rgba(0,0,0,0.85)', transition: 'all 0.3s' },
          children: game.name,
        }),
        meta: jsxs(Fragment, {
          children: [
            jsx('span', { style: { fontSize: 11, color: '#6e7681' }, children: game.resetTime }),
            jsxs('span', { style: { fontSize: 11, fontWeight: 600, color: cdColor, fontFamily: 'monospace' }, children: ['⏱', formatCountdown(ms, cd)] }),
          ],
        }),
        rightSlot: jsx(LinkButton, { url: game.launchUrl, label: t('launchUrl') }),
      }),
      hasTasks && jsxs('div', {
        style: { paddingTop: 2, paddingBottom: 4 },
        children: [
          dailyGroup.map((tk) => jsx(TaskRow, { task: tk, game, checks, now, onToggle, cd }, tk.id)),
          dailyGroup.length > 0 && periodGroup.length > 0 && jsx('div', {
            style: { margin: '5px 0', borderTop: '1px solid rgba(255,255,255,0.07)', position: 'relative' },
            children: jsxs('span', { className: 'sep-label', children: ['— ', t('periodic'), ' —'] }),
          }),
          periodGroup.map((tk) => jsx(TaskRow, { task: tk, game, checks, now, onToggle, cd }, tk.id)),
        ],
      }),
    ],
  });
}
