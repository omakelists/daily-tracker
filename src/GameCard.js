import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { t } from './i18n.js';
import { PERIOD_TYPES, ensureContrast, utcToLocalHHMM } from './constants.js';
import { getPeriodKey, getPrevPeriodKey, msUntilReset, formatCountdown, checkKey } from './helpers.js';
import { Row, PrevBar, LinkButton } from './UI.js';
import { TaskRow } from './TaskRow.js';

export function GameCard({ game, checks, now, onToggle, allDone, dailyTasks, cd, collapsed, onToggleCollapse }) {
  const hasTasks    = game.tasks.length > 0;
  const dailyGroup  = game.tasks.filter((tk) => !PERIOD_TYPES.has(tk.type));
  const periodGroup = game.tasks.filter((tk) =>  PERIOD_TYPES.has(tk.type));
  const hasDailyTasks = dailyGroup.length > 0;

  // Collapsed: hide daily tasks; always show unchecked periodic tasks
  const visibleDaily  = collapsed ? [] : dailyGroup;
  const visiblePeriod = collapsed
    ? periodGroup.filter((tk) => !checks[checkKey(tk.id, getPeriodKey(tk, game, now))])
    : periodGroup;
  const hasVisible = visibleDaily.length > 0 || visiblePeriod.length > 0;

  // Master state — daily tasks only
  const allTodayDone = dailyTasks.length > 0 &&
    dailyTasks.every((tk) => !!checks[checkKey(tk.id, getPeriodKey(tk, game, now))]);
  const prevCount   = dailyTasks.filter((tk) => !!checks[checkKey(tk.id, getPrevPeriodKey(tk, game, now))]).length;
  const prevAll     = dailyTasks.length > 0 && prevCount === dailyTasks.length;
  const prevPartial = prevCount > 0 && prevCount < dailyTasks.length;

  // Countdown
  const ms       = msUntilReset(now, game.resetTime);
  const h        = ms / 3600000;
  const cdColor  = h < 3 ? 'var(--cd-urgent)' : h < 6 ? 'var(--cd-warn)' : 'var(--muted)';
  const visColor = ensureContrast(game.color);
  const localReset = utcToLocalHHMM(game.resetTime);

  // ── Accordion toggle ──────────────────────────────────────────────
  const accordionBtn = hasDailyTasks
    ? jsx('button', {
        className: 'dt-accordion-btn',
        onClick: () => onToggleCollapse(game.id),
        title: collapsed ? 'Expand' : 'Collapse',
        children: collapsed ? '▶' : '▼',
      })
    : jsx(PrevBar, { show: dailyTasks.length > 0, checked: prevAll, partial: prevPartial });

  return jsxs('div', {
    className: `game-card${allDone ? ' game-card-done' : ''}`,
    style: { border: `var(--card-border) solid ${game.color}60` },
    children: [
      // ── Header ────────────────────────────────────────────────────
      jsx(Row, {
        bg: `linear-gradient(90deg, ${game.color}28 0%, ${game.color}10 40%, rgba(22,27,34,0.92) 100%)`,
        borderBottom: hasVisible ? '1px solid rgba(255,255,255,0.055)' : 'none',
        barSlot: accordionBtn,
        checkbox: jsx('button', {
          onClick: () => onToggle(null, game, true),
          className: `dt-cb dt-cb-game${allTodayDone ? ' dt-cb-checked' : ''}`,
          children: allTodayDone ? '✓' : '',
        }),
        content: jsx('span', {
          style: {
            fontWeight: 700, fontSize: 14, flex: 1, minWidth: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            color: allDone ? 'var(--dim)' : visColor,
            textDecoration: allDone ? 'line-through' : 'none',
            textShadow: '0 1px 3px rgba(0,0,0,0.85)',
            transition: 'all 0.3s',
          },
          children: game.name,
        }),
        // meta: countdown first, then reset time (right-aligns reset time with task meta column)
        meta: jsxs(Fragment, {
          children: [
            // Condensed prev-bar dot when accordion toggle is visible
            hasDailyTasks && jsx('div', {
              className: 'dt-prev-dot',
              title: t('prevTip'),
              style: { background: prevAll ? 'var(--prev-done)' : prevPartial ? 'var(--prev-partial)' : 'var(--prev-miss)' },
            }),
            jsxs('span', {
              style: { fontSize: 11, fontWeight: 600, color: cdColor, fontFamily: 'monospace' },
              children: ['⏱', formatCountdown(ms, cd)],
            }),
            jsx('span', { style: { fontSize: 11, color: 'var(--dim)' }, children: localReset }),
          ],
        }),
        rightSlot: jsx(LinkButton, { url: game.launchUrl, label: t('launchUrl') }),
      }),

      // ── Tasks ──────────────────────────────────────────────────────
      hasVisible && jsxs('div', {
        className: 'game-card-body',
        children: [
          visibleDaily.map((tk) => jsx(TaskRow, { task: tk, game, checks, now, onToggle, cd }, tk.id)),
          visibleDaily.length > 0 && visiblePeriod.length > 0 && jsx('div', {
            style: { margin: '5px 0', borderTop: '1px solid rgba(255,255,255,0.07)', position: 'relative' },
            children: jsxs('span', { className: 'sep-label', children: ['— ', t('periodic'), ' —'] }),
          }),
          visiblePeriod.map((tk) => jsx(TaskRow, { task: tk, game, checks, now, onToggle, cd }, tk.id)),
        ],
      }),
    ],
  });
}
