import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { useState } from 'react';
import { css, cx } from '@emotion/css';
import { t } from '../util/i18n.js';
import { DAILY_TYPES, utcToLocalHHMM } from '../constants.js';
import { getPeriodKey, getPrevPeriodKey, msUntilTaskReset, formatCountdown, checkKey } from '../util/helpers.js';
import { Row, PrevBar, sharedStyles as ss } from './UI.js';

// ── Styles ────────────────────────────────────────────────────────
const BADGE_MAP = {
  daily:        ss.badgeDaily,
  weekly:       ss.badgeWeekly,
  webdaily:     ss.badgeWebdaily,
  monthly:      ss.badgeMonthly,
  halfmonthly:  ss.badgeHalfmonthly,
};

const s = {
  row: css({
    paddingTop: 7, paddingBottom: 7,
    borderBottom: '1px solid rgba(255,255,255,0.03)',
    transition: 'background 0.12s',
    '&:hover': { background: 'rgba(255,255,255,0.025)' },
  }),
  countdown: css({ fontSize: 11, fontWeight: 600, fontFamily: 'monospace', flexShrink: 0 }),
  resetLbl:  css({ fontSize: 10, color: 'var(--dim)' }),
};

export function TaskRow({ task, game, checks, now, onToggle, cd }) {
  const [pop, setPop] = useState(false);
  const firePop = () => { setPop(true); setTimeout(() => setPop(false), 260); };

  const isChecked   = !!checks[checkKey(task.id, getPeriodKey(task, game, now))];
  const prevChecked = !!checks[checkKey(task.id, getPrevPeriodKey(task, game, now))];
  const showPrev    = DAILY_TYPES.has(task.type);

  const ms      = msUntilTaskReset(task, game, now);
  const h       = ms / 3600000;
  const cdColor = h < 3 ? 'var(--cd-urgent)' : h < 6 ? 'var(--cd-warn)' : 'var(--muted)';
  const showCD  = task.type === 'monthly' || task.type === 'halfmonthly' ||
    (task.type === 'webdaily' && task.webResetTime && task.webResetTime !== game.resetTime);

  const localWebReset = task.webResetTime ? utcToLocalHHMM(task.webResetTime) : null;

  return jsx(Row, {
    className: s.row,
    barSlot: jsx(PrevBar, { show: showPrev, checked: prevChecked }),
    checkbox: jsx('button', {
      onClick: () => { firePop(); onToggle(task.id, game); },
      className: cx(ss.cb, isChecked && ss.cbChecked, pop && ss.cbPop),
      children: isChecked ? '✓' : '',
    }),
    content: jsxs(Fragment, { children: [
      jsx('span', { className: cx(ss.badge, BADGE_MAP[task.type]), children: t(`types.${task.type}`) }),
      jsx('span', {
        style: { fontSize: 13, color: isChecked ? 'var(--dim)' : 'var(--text)', textDecoration: isChecked ? 'line-through' : 'none', textShadow: isChecked ? '0 1px 2px rgba(0,0,0,0.6)' : 'none', transition: 'color 0.2s', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
        children: task.name.trim() || t(`types.${task.type}`),
      }),
    ]}),
    meta: jsxs(Fragment, { children: [
      showCD && !isChecked && jsxs('span', { className: s.countdown, style: { color: cdColor }, children: ['⏱', formatCountdown(ms, cd)] }),
      task.type === 'webdaily' && localWebReset && localWebReset !== utcToLocalHHMM(game.resetTime) &&
        jsx('span', { className: s.resetLbl, children: localWebReset }),
      task.type === 'monthly' &&
        jsx('span', { className: s.resetLbl, children: t('everyDay', { day: task.monthlyResetDay ?? 1 }) }),
    ]}),
    rightSlot: null,
  });
}
