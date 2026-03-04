import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { useState } from 'react';
import { css, cx } from '@emotion/css';
import { t } from '../util/i18n.js';
import { PERIOD_TYPES, ensureContrast, utcToLocalHHMM } from '../constants.js';
import { getPeriodKey, getPrevPeriodKey, msUntilReset, formatCountdown, checkKey } from '../util/helpers.js';
import { Row, PrevBar, sharedStyles as ss } from './UI.js';
import { TaskRow } from './TaskRow.js';

// ── Styles ────────────────────────────────────────────────────────
const s = {
  card:     css({ borderRadius: 12, marginBottom: 10, overflow: 'hidden', border: 'var(--card-border) solid var(--border)', transition: 'opacity 0.5s', position: 'relative' }),
  cardDone: css({ opacity: 0.62 }),

  // Background image layer — fully opaque image
  bgLayer: css({
    position: 'absolute', inset: 0,
    backgroundSize: 'cover', backgroundPosition: 'center',
    zIndex: 0,
  }),

  // Black overlay on top of image; opacity = 1 - bgOpacity (inline style)
  bgOverlay: css({ position: 'absolute', inset: 0, background: 'black', zIndex: 1 }),

  // Content wrapper — sits above both layers
  content: css({ position: 'relative', zIndex: 2 }),

  accordionBtn: css({
    width: 'var(--bar-slot)', height: 'var(--bar-slot)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--dim)', fontSize: 9, padding: 0, flexShrink: 0,
    transition: 'color 0.15s',
    '&:hover': { color: 'var(--text)' },
  }),

  bodyWrap:     css({ display: 'grid', gridTemplateRows: '0fr', transition: 'grid-template-rows 0.25s ease' }),
  bodyWrapOpen: css({ gridTemplateRows: '1fr' }),

  // Slightly more opaque when no bg image, more transparent to reveal image when present
  body:      css({ overflow: 'hidden', minHeight: 0, background: 'rgba(13,17,23,0.50)', paddingTop: 2, paddingBottom: 4 }),
  bodyWithBg: css({ background: 'rgba(13,17,23,0.30)' }),

  divider:  css({ margin: '5px 0', borderTop: '1px solid rgba(255,255,255,0.07)', position: 'relative' }),
  sepLabel: css({ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', background: 'transparent', padding: '0 8px', fontSize: 10, color: '#8b949e', letterSpacing: 1, whiteSpace: 'nowrap' }),

  countdown: css({ fontSize: 11, fontWeight: 600, fontFamily: 'monospace', flexShrink: 0, textShadow: '-1px -1px 0 rgba(0,0,0,0.9), 1px -1px 0 rgba(0,0,0,0.9), -1px 1px 0 rgba(0,0,0,0.9), 1px 1px 0 rgba(0,0,0,0.9)' }),
  resetTime: css({ fontSize: 11, color: 'var(--dim)', textShadow: '-1px -1px 0 rgba(0,0,0,0.9), 1px -1px 0 rgba(0,0,0,0.9), -1px 1px 0 rgba(0,0,0,0.9), 1px 1px 0 rgba(0,0,0,0.9)' }),
};

export function GameCard({ game, checks, now, onToggle, allDone, dailyTasks, cd, collapsed, onToggleCollapse, bgDataUrl, bgOpacity = 0.5 }) {
  const [masterPop, setMasterPop] = useState(false);
  const fireMasterPop = () => { setMasterPop(true); setTimeout(() => setMasterPop(false), 260); };

  const dailyGroup  = game.tasks.filter((tk) => !PERIOD_TYPES.has(tk.type));
  const periodGroup = game.tasks.filter((tk) =>  PERIOD_TYPES.has(tk.type));
  const hasDailyTasks = dailyGroup.length > 0;

  const isChecked    = (tk) => !!checks[checkKey(tk.id, getPeriodKey(tk, game, now))];
  const visibleDaily  = collapsed ? dailyGroup.filter((tk)  => !isChecked(tk)) : dailyGroup;
  const visiblePeriod = collapsed ? periodGroup.filter((tk) => !isChecked(tk)) : periodGroup;
  const hasVisible    = visibleDaily.length > 0 || visiblePeriod.length > 0;

  const allTodayDone = dailyTasks.length > 0 && dailyTasks.every((tk) => !!checks[checkKey(tk.id, getPeriodKey(tk, game, now))]);
  const prevCount    = dailyTasks.filter((tk) => !!checks[checkKey(tk.id, getPrevPeriodKey(tk, game, now))]).length;
  const prevAll      = dailyTasks.length > 0 && prevCount === dailyTasks.length;
  const prevPartial  = prevCount > 0 && prevCount < dailyTasks.length;

  const ms       = msUntilReset(now, game.resetTime);
  const h        = ms / 3600000;
  const cdColor  = h < 3 ? 'var(--cd-urgent)' : h < 6 ? 'var(--cd-warn)' : 'var(--muted)';
  const visColor = ensureContrast(game.color);
  const localReset = utcToLocalHHMM(game.resetTime);

  // Header gradient: more transparent when bg image present so the image shows through
  const headerBg = bgDataUrl
    ? `linear-gradient(90deg, ${game.color}40 0%, ${game.color}18 40%, rgba(13,17,23,0.60) 100%)`
    : `linear-gradient(90deg, ${game.color}28 0%, ${game.color}10 40%, rgba(22,27,34,0.92) 100%)`;

  const accordionIcon = hasDailyTasks
    ? jsx('span', { className: s.accordionBtn, style: { pointerEvents: 'none' }, children: collapsed ? '▶' : '▼' })
    : null;

  return jsxs('div', {
    className: cx(s.card, allDone && s.cardDone),
    style: { border: `var(--card-border) solid ${game.color}60`, viewTransitionName: `game-${game.id}` },
    children: [
      // ── Background image layer ────────────────────────────────
      bgDataUrl && jsx('div', {
        className: s.bgLayer,
        style: { backgroundImage: `url(${bgDataUrl})` },
      }),

      // ── Black overlay (dims the image) ───────────────────────
      bgDataUrl && jsx('div', { className: s.bgOverlay, style: { opacity: 1 - bgOpacity } }),

      // ── All content above bg layer ────────────────────────────
      jsxs('div', {
        className: s.content,
        children: [
          jsx(Row, {
            bg: headerBg,
            borderBottom: hasVisible ? '1px solid rgba(255,255,255,0.055)' : 'none',
            onClick: hasDailyTasks ? () => onToggleCollapse(game.id) : undefined,
            style: hasDailyTasks ? { cursor: 'pointer' } : undefined,
            preSlot: accordionIcon,
            barSlot: jsx(PrevBar, { show: dailyTasks.length > 0, checked: prevAll, partial: prevPartial }),
            checkbox: jsx('button', {
              onClick: (e) => { e.stopPropagation(); fireMasterPop(); onToggle(null, game, true); },
              className: cx(ss.cb, ss.cbGame, allTodayDone && ss.cbChecked, masterPop && ss.cbPop),
              children: allTodayDone ? '✓' : '',
            }),
            content: jsx('span', {
              style: { fontWeight: 700, fontSize: 14, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: allDone ? 'var(--dim)' : visColor, textDecoration: allDone ? 'line-through' : 'none', textShadow: '-1px -1px 0 rgba(0,0,0,0.9), 1px -1px 0 rgba(0,0,0,0.9), -1px 1px 0 rgba(0,0,0,0.9), 1px 1px 0 rgba(0,0,0,0.9)', transition: 'all 0.3s' },
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
            children: jsxs('div', {
              className: cx(s.body, bgDataUrl && s.bodyWithBg),
              children: [
                visibleDaily.map((tk)  => jsx(TaskRow, { task: tk, game, checks, now, onToggle, cd }, tk.id)),
                visibleDaily.length > 0 && visiblePeriod.length > 0 && jsx('div', {
                  className: s.divider,
                  children: jsx('span', { className: s.sepLabel, children: `— ${t('periodic')} —` }),
                }),
                visiblePeriod.map((tk) => jsx(TaskRow, { task: tk, game, checks, now, onToggle, cd }, tk.id)),
              ],
            }),
          }),
        ],
      }),
    ],
  });
}
