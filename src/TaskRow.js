import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { t } from './i18n.js';
import { DAILY_TYPES, utcToLocalHHMM } from './constants.js';
import { getPeriodKey, getPrevPeriodKey, msUntilTaskReset, formatCountdown, checkKey } from './helpers.js';
import { Row, PrevBar, LinkButton } from './UI.js';

export function TaskRow({ task, game, checks, now, onToggle, cd }) {
  const isChecked   = !!checks[checkKey(task.id, getPeriodKey(task, game, now))];
  const prevChecked = !!checks[checkKey(task.id, getPrevPeriodKey(task, game, now))];
  const showPrev    = DAILY_TYPES.has(task.type);

  const ms      = msUntilTaskReset(task, game, now);
  const h       = ms / 3600000;
  const cdClass = h < 3 ? 'var(--cd-urgent)' : h < 6 ? 'var(--cd-warn)' : 'var(--cd-ok)';
  const showCD  = task.type === 'monthly' || task.type === 'halfmonthly' ||
    (task.type === 'webdaily' && task.webResetTime && task.webResetTime !== game.resetTime);

  const localWebReset = task.webResetTime ? utcToLocalHHMM(task.webResetTime) : null;

  return jsx(Row, {
    className: 'task-row',
    barSlot: jsx(PrevBar, { show: showPrev, checked: prevChecked }),
    checkbox: jsx('button', {
      onClick: () => onToggle(task.id, game),
      className: `dt-cb${isChecked ? ' dt-cb-checked' : ''}`,
      children: isChecked ? '✓' : '',
    }),
    content: jsxs(Fragment, {
      children: [
        jsx('span', { className: `type-badge type-badge-${task.type}`, children: t(`types.${task.type}`) }),
        jsx('span', {
          style: {
            fontSize: 13,
            color: isChecked ? 'var(--dim)' : 'var(--text)',
            textDecoration: isChecked ? 'line-through' : 'none',
            textShadow: isChecked ? '0 1px 2px rgba(0,0,0,0.6)' : 'none',
            transition: 'color 0.2s',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          },
          children: task.name.trim() || t(`types.${task.type}`),
        }),
        showCD && jsx('span', {
          style: { fontSize: 11, color: cdClass, fontFamily: 'monospace', flexShrink: 0 },
          children: `(${formatCountdown(ms, cd)})`,
        }),
      ],
    }),
    meta: jsxs(Fragment, {
      children: [
        task.type === 'webdaily' && localWebReset && localWebReset !== utcToLocalHHMM(game.resetTime) &&
          jsx('span', { style: { fontSize: 10, color: 'var(--dim)' }, children: localWebReset }),
        task.type === 'monthly' &&
          jsx('span', { style: { fontSize: 10, color: 'var(--dim)' }, children: t('everyDay', { day: task.monthlyResetDay ?? 1 }) }),
      ],
    }),
    rightSlot: jsx(LinkButton, { url: task.url, label: t('openLink') }),
  });
}
