import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { useState, useCallback } from 'react';
import { css, cx, keyframes } from '@emotion/css';
import { t } from '../util/i18n.js';
import { PERIOD_TYPES, ensureContrast, utcToLocalHHMM } from '../constants.js';
import { getPeriodKey, getPrevPeriodKey, msUntilReset, formatCountdown, checkKey } from '../util/helpers.js';
import { Row, PrevBar, sharedStyles as ss } from './UI.js';
import { TaskRow } from './TaskRow.js';

// ── Animation constants ───────────────────────────────────────────
const EXIT_MS  = 220;  // task exit duration
const OPEN_MS  = 280;  // accordion open duration
const CLOSE_MS = 240;  // accordion close duration

// Task exits upward (collapses above the body top edge)
const taskExit = keyframes({
  from: { opacity: 1,  transform: 'translateY(0)   scaleY(1)',    maxHeight: '80px' },
  to:   { opacity: 0,  transform: 'translateY(-14px) scaleY(0.7)', maxHeight: '0',   marginBottom: '0' },
});

// Task enters from slightly above (expanding: items slide down into view)
const taskEnter = keyframes({
  from: { opacity: 0,  transform: 'translateY(-10px) scaleY(0.85)' },
  to:   { opacity: 1,  transform: 'translateY(0)    scaleY(1)' },
});

// Accordion icon rotation
const chevronDown = keyframes({
  from: { transform: 'rotate(-90deg)' },
  to:   { transform: 'rotate(0deg)' },
});
const chevronRight = keyframes({
  from: { transform: 'rotate(0deg)' },
  to:   { transform: 'rotate(-90deg)' },
});

// ── Styles ────────────────────────────────────────────────────────
const s = {
  card: css({
    borderRadius: 12, marginBottom: 10, overflow: 'hidden',
    border: 'var(--card-border) solid var(--border)',
    transition: `opacity 0.5s`,
    position: 'relative',
  }),
  cardDone: css({ opacity: 0.62 }),

  bgLayer:   css({ position: 'absolute', inset: 0, backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0 }),
  bgOverlay: css({ position: 'absolute', inset: 0, background: 'black', zIndex: 1 }),
  content:   css({ position: 'relative', zIndex: 2 }),

  // Accordion chevron — animated rotation
  accordionBtn: css({
    width: 'var(--bar-slot)', height: 'var(--bar-slot)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--dim)', fontSize: 9, padding: 0, flexShrink: 0,
    transition: 'color 0.15s',
    '&:hover': { color: 'var(--text)' },
  }),
  chevronOpen:  css({ animation: `${chevronDown}  ${CLOSE_MS}ms ease forwards` }),
  chevronClose: css({ animation: `${chevronRight} ${CLOSE_MS}ms ease forwards` }),

  // Body accordion — open/close timing matches constants
  bodyWrap: css({
    display: 'grid',
    gridTemplateRows: '0fr',
    transition: `grid-template-rows ${CLOSE_MS}ms ease`,
  }),
  bodyWrapOpen: css({
    gridTemplateRows: '1fr',
    transition: `grid-template-rows ${OPEN_MS}ms ease`,
  }),
  body:       css({ overflow: 'hidden', minHeight: 0, background: 'rgba(13,17,23,0.50)', paddingTop: 2, paddingBottom: 4 }),
  bodyWithBg: css({ background: 'rgba(13,17,23,0.30)' }),

  // Task wrapper — base (no animation; enter animation applied separately)
  taskRow: css({}),
  taskRowEnter: css({ animation: `${taskEnter} ${EXIT_MS}ms ease forwards` }),
  // Task wrapper — exit animation
  taskRowExit: css({
    animation: `${taskExit} ${EXIT_MS}ms ease forwards`,
    pointerEvents: 'none',
    overflow: 'hidden',
    transformOrigin: 'top center',
  }),

  divider:  css({ margin: '5px 0', borderTop: '1px solid rgba(255,255,255,0.07)', position: 'relative' }),
  sepLabel: css({
    position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)',
    background: 'transparent', padding: '0 8px', fontSize: 10,
    color: '#8b949e', letterSpacing: 1, whiteSpace: 'nowrap',
  }),

  countdown: css({ fontSize: 11, fontWeight: 600, fontFamily: 'monospace', flexShrink: 0, WebkitTextStroke: '0.6px rgba(0,0,0,0.85)', textStroke: '0.6px rgba(0,0,0,0.85)', paintOrder: 'stroke fill' }),
  resetTime: css({ fontSize: 11, color: 'var(--dim)', WebkitTextStroke: '0.6px rgba(0,0,0,0.85)', textStroke: '0.6px rgba(0,0,0,0.85)', paintOrder: 'stroke fill' }),
};

export function GameCard({ game, checks, now, onToggle, allDone, dailyTasks, cd, collapsed, onToggleCollapse, bgDataUrl, bgOpacity = 0.5 }) {
  const [masterPop,  setMasterPop]  = useState(false);
  const [exitingIds,  setExitingIds]  = useState(new Set()); // task IDs mid-exit-animation
  const [enteringIds, setEnteringIds] = useState(new Set()); // task IDs mid-enter-animation
  const [animDir,     setAnimDir]     = useState(null);      // 'open'|'close' for chevron

  const fireMasterPop = () => { setMasterPop(true); setTimeout(() => setMasterPop(false), 260); };

  const dailyGroup  = game.tasks.filter((tk) => !PERIOD_TYPES.has(tk.type));
  const periodGroup = game.tasks.filter((tk) =>  PERIOD_TYPES.has(tk.type));
  const hasDailyTasks = dailyGroup.length > 0;

  const isChecked = (tk) => !!checks[checkKey(tk.id, getPeriodKey(tk, game, now))];

  // ── Accordion toggle with animations ─────────────────────────
  const handleToggleCollapse = useCallback(() => {
    const doToggle = () => {
      if (document.startViewTransition) {
        document.startViewTransition(() => onToggleCollapse(game.id));
      } else {
        onToggleCollapse(game.id);
      }
    };

    if (!collapsed) {
      // ── Closing: start grid collapse and task exit simultaneously ─
      setAnimDir('close');
      const toExit = [
        ...dailyGroup.filter(isChecked),
        ...periodGroup.filter(isChecked),
      ];
      if (toExit.length > 0) {
        setExitingIds(new Set(toExit.map((tk) => tk.id)));
        // Collapse grid immediately (same frame as exit animations start)
        doToggle();
        // Clean up exiting nodes only after grid is fully closed
        setTimeout(() => setExitingIds(new Set()), CLOSE_MS);
      } else {
        doToggle();
      }
    } else {
      // ── Opening: reveal checked tasks with enter animation ──────
      setAnimDir('open');
      setTimeout(() => setAnimDir(null), OPEN_MS);
      const toEnter = [
        ...dailyGroup.filter(isChecked),
        ...periodGroup.filter(isChecked),
      ];
      if (toEnter.length > 0) {
        setEnteringIds(new Set(toEnter.map((tk) => tk.id)));
        onToggleCollapse(game.id);
        setTimeout(() => setEnteringIds(new Set()), EXIT_MS);
      } else {
        onToggleCollapse(game.id);
      }
    }
  }, [collapsed, dailyGroup, periodGroup, game.id, onToggleCollapse, checks, now]);

  // ── Visible task lists (include exiting tasks temporarily) ────
  const visibleDaily = collapsed
    ? dailyGroup.filter((tk) => !isChecked(tk) || exitingIds.has(tk.id))
    : dailyGroup;
  const visiblePeriod = collapsed
    ? periodGroup.filter((tk) => !isChecked(tk) || exitingIds.has(tk.id))
    : periodGroup;
  const hasVisible = visibleDaily.length > 0 || visiblePeriod.length > 0;

  const allTodayDone = dailyTasks.length > 0 && dailyTasks.every((tk) => !!checks[checkKey(tk.id, getPeriodKey(tk, game, now))]);
  const prevCount    = dailyTasks.filter((tk) => !!checks[checkKey(tk.id, getPrevPeriodKey(tk, game, now))]).length;
  const prevAll      = dailyTasks.length > 0 && prevCount === dailyTasks.length;
  const prevPartial  = prevCount > 0 && prevCount < dailyTasks.length;

  const ms       = msUntilReset(now, game.resetTime);
  const h        = ms / 3600000;
  const cdColor  = h < 3 ? 'var(--cd-urgent)' : h < 6 ? 'var(--cd-warn)' : 'var(--muted)';
  const visColor = ensureContrast(game.color);
  const localReset = utcToLocalHHMM(game.resetTime);

  const headerBg = bgDataUrl
    ? `linear-gradient(90deg, ${game.color}40 0%, ${game.color}18 40%, rgba(13,17,23,0.60) 100%)`
    : `linear-gradient(90deg, ${game.color}28 0%, ${game.color}10 40%, rgba(22,27,34,0.92) 100%)`;

  const accordionIcon = hasDailyTasks
    ? jsx('span', {
        className: cx(
          s.accordionBtn,
          animDir === 'open'  && s.chevronOpen,
          animDir === 'close' && s.chevronClose,
        ),
        style: { pointerEvents: 'none' },
        children: '▼',
      })
    : null;

  // Wrap a task row with enter/exit animation div
  const wrapTask = (tk, el) => jsx('div', {
    key: tk.id,
    className: cx(s.taskRow, exitingIds.has(tk.id) ? s.taskRowExit : (enteringIds.has(tk.id) ? s.taskRowEnter : null)),
    children: el,
  }, tk.id);

  return jsxs('div', {
    className: cx(s.card, allDone && s.cardDone),
    style: { border: `var(--card-border) solid ${game.color}60`, viewTransitionName: `game-${game.id}` },
    children: [
      bgDataUrl && jsx('div', { className: s.bgLayer, style: { backgroundImage: `url(${bgDataUrl})` } }),
      bgDataUrl && jsx('div', { className: s.bgOverlay, style: { opacity: 1 - bgOpacity } }),

      jsxs('div', {
        className: s.content,
        children: [
          jsx(Row, {
            bg: headerBg,
            borderBottom: hasVisible ? '1px solid rgba(255,255,255,0.055)' : 'none',
            onClick: hasDailyTasks ? handleToggleCollapse : undefined,
            style: hasDailyTasks ? { cursor: 'pointer' } : undefined,
            preSlot: accordionIcon,
            barSlot: jsx(PrevBar, { show: dailyTasks.length > 0, checked: prevAll, partial: prevPartial }),
            checkbox: jsx('button', {
              onClick: (e) => { e.stopPropagation(); fireMasterPop(); onToggle(null, game, true); },
              className: cx(ss.cb, ss.cbGame, allTodayDone && ss.cbChecked, masterPop && ss.cbPop),
              children: allTodayDone ? '✓' : '',
            }),
            content: jsx('span', {
              style: {
                fontWeight: 700, fontSize: 14, flex: 1, minWidth: 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                color: allDone ? 'var(--dim)' : visColor,
                textDecoration: allDone ? 'line-through' : 'none',
                WebkitTextStroke: '0.6px rgba(0,0,0,0.85)', textStroke: '0.6px rgba(0,0,0,0.85)', paintOrder: 'stroke fill',
                transition: 'all 0.3s',
              },
              children: game.name,
            }),
            meta: jsxs(Fragment, { children: [
              !allTodayDone && jsxs('span', { className: s.countdown, style: { color: cdColor }, children: ['⏱', formatCountdown(ms, cd)] }),
              jsx('span', { className: s.resetTime, children: localReset }),
            ]}),
            rightSlot: null,
          }),

          jsx('div', {
            className: cx(s.bodyWrap, hasVisible && s.bodyWrapOpen),
            style: !hasDailyTasks ? { display: 'none' } : undefined,
            children: jsxs('div', {
              className: cx(s.body, bgDataUrl && s.bodyWithBg),
              children: [
                visibleDaily.map((tk) => wrapTask(tk,
                  jsx(TaskRow, { task: tk, game, checks, now, onToggle, cd }, tk.id)
                )),
                visibleDaily.length > 0 && visiblePeriod.length > 0 && jsx('div', {
                  className: s.divider,
                  children: jsx('span', { className: s.sepLabel, children: `— ${t('periodic')} —` }),
                }),
                visiblePeriod.map((tk) => wrapTask(tk,
                  jsx(TaskRow, { task: tk, game, checks, now, onToggle, cd }, tk.id)
                )),
              ],
            }),
          }),
        ],
      }),
    ],
  });
}
