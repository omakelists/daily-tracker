import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { t } from './i18n.js';
import { TYPE_COLORS, DAILY_TYPES, L } from './constants.js';
import { getPeriodKey, getPrevPeriodKey, msUntilTaskReset, formatCountdown, checkKey } from './helpers.js';
import { Row, PrevBar, LinkButton } from './UI.js';

export function TaskRow({ task, game, checks, now, onToggle, cd }) {
  const isChecked   = !!checks[checkKey(task.id, getPeriodKey(task, game, now))];
  const prevChecked = !!checks[checkKey(task.id, getPrevPeriodKey(task, game, now))];
  const showPrev    = DAILY_TYPES.has(task.type);
  const typeColor   = TYPE_COLORS[task.type] ?? '#8b949e';

  const ms      = msUntilTaskReset(task, game, now);
  const h       = ms / 3600000;
  const cdColor = h < 3 ? '#f85149' : h < 6 ? '#e3b341' : '#6e7681';
  const showCD  = task.type === 'monthly' || task.type === 'halfmonthly' ||
    (task.type === 'webdaily' && task.webResetTime && task.webResetTime !== game.resetTime);

  return jsx(Row, {
    className: 'task-row',
    style: { paddingTop: 7, paddingBottom: 7, borderBottom: '1px solid rgba(255,255,255,0.03)' },
    prevBar: jsx(PrevBar, { show: showPrev, checked: prevChecked }),
    checkbox: jsx('button', {
      onClick: () => onToggle(task.id, game),
      style: { width: L.CB_W, height: L.CB_W, borderRadius: 6, cursor: 'pointer', flexShrink: 0, background: isChecked ? '#1a7f37' : 'transparent', border: `2px solid ${isChecked ? '#2ea043' : '#30363d'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, transition: 'all 0.15s', color: '#e6edf3', transform: isChecked ? 'scale(1.08)' : 'scale(1)' },
      children: isChecked ? '✓' : '',
    }),
    content: jsxs(Fragment, {
      children: [
        jsx('span', { style: { fontSize: 10, background: `${typeColor}18`, color: typeColor, border: `1px solid ${typeColor}40`, borderRadius: 4, padding: '1px 5px', flexShrink: 0 }, children: t(`types.${task.type}`) }),
        jsx('span', { style: { fontSize: 13, color: isChecked ? '#5a6370' : '#e6edf3', textDecoration: isChecked ? 'line-through' : 'none', textShadow: isChecked ? '0 1px 2px rgba(0,0,0,0.6)' : 'none', transition: 'color 0.2s', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: task.name.trim() || t(`types.${task.type}`) }),
        showCD && jsx('span', { style: { fontSize: 11, color: cdColor, fontFamily: 'monospace', flexShrink: 0 }, children: `(${formatCountdown(ms, cd)})` }),
      ],
    }),
    meta: jsxs(Fragment, {
      children: [
        task.type === 'webdaily' && task.webResetTime && task.webResetTime !== game.resetTime &&
          jsx('span', { style: { fontSize: 10, color: '#6e7681' }, children: task.webResetTime }),
        task.type === 'monthly' &&
          jsx('span', { style: { fontSize: 10, color: '#6e7681' }, children: t('everyDay', { day: task.monthlyResetDay ?? 1 }) }),
      ],
    }),
    rightSlot: jsx(LinkButton, { url: task.url, label: t('openLink') }),
  });
}
