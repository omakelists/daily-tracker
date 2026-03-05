import { useState, useCallback } from 'react';
import { cx } from '../util/cx';
import { t } from '../util/i18n';
import { PERIOD_TYPES, ensureContrast, utcToLocalHHMM } from '../constants';
import { getPeriodKey, getPrevPeriodKey, msUntilReset, formatCountdown, checkKey } from '../util/helpers';
import { Row, PrevBar, sharedStyles as ss } from './UI';
import { TaskRow } from './TaskRow';
import s from './GameCard.module.css';

// Animation duration constants — keep in sync with GameCard.module.css
const EXIT_MS  = 220;
const OPEN_MS  = 280;
const CLOSE_MS = 240;

export function GameCard({ game, checks, now, onToggle, allDone, dailyTasks, cd, collapsed, onToggleCollapse, bgDataUrl, bgOpacity = 0.5 }) {
  const [masterPop,   setMasterPop]   = useState(false);
  const [exitingIds,  setExitingIds]  = useState(new Set());
  const [enteringIds, setEnteringIds] = useState(new Set());
  const [animDir,     setAnimDir]     = useState(null);

  const fireMasterPop = () => { setMasterPop(true); setTimeout(() => setMasterPop(false), 260); };

  const dailyGroup    = game.tasks.filter((tk) => !PERIOD_TYPES.has(tk.type));
  const periodGroup   = game.tasks.filter((tk) =>  PERIOD_TYPES.has(tk.type));
  const hasDailyTasks = dailyGroup.length > 0;

  const isChecked = (tk) => !!checks[checkKey(tk.id, getPeriodKey(tk, game, now))];

  // ── Accordion toggle with animations ─────────────────────────
  const handleToggleCollapse = useCallback(() => {
    const doToggle = () => {
      if (document.startViewTransition) document.startViewTransition(() => onToggleCollapse(game.id));
      else onToggleCollapse(game.id);
    };

    if (!collapsed) {
      setAnimDir('close');
      const toExit = [...dailyGroup.filter(isChecked), ...periodGroup.filter(isChecked)];
      if (toExit.length > 0) {
        setExitingIds(new Set(toExit.map((tk) => tk.id)));
        doToggle();
        setTimeout(() => setExitingIds(new Set()), CLOSE_MS);
      } else {
        doToggle();
      }
    } else {
      setAnimDir('open');
      setTimeout(() => setAnimDir(null), OPEN_MS);
      const toEnter = [...dailyGroup.filter(isChecked), ...periodGroup.filter(isChecked)];
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
  const visibleDaily  = collapsed ? dailyGroup.filter((tk)  => !isChecked(tk) || exitingIds.has(tk.id)) : dailyGroup;
  const visiblePeriod = collapsed ? periodGroup.filter((tk) => !isChecked(tk) || exitingIds.has(tk.id)) : periodGroup;
  const hasVisible    = visibleDaily.length > 0 || visiblePeriod.length > 0;

  const allTodayDone = dailyTasks.length > 0 && dailyTasks.every((tk) => !!checks[checkKey(tk.id, getPeriodKey(tk, game, now))]);
  const prevCount    = dailyTasks.filter((tk) => !!checks[checkKey(tk.id, getPrevPeriodKey(tk, game, now))]).length;
  const prevAll      = dailyTasks.length > 0 && prevCount === dailyTasks.length;
  const prevPartial  = prevCount > 0 && prevCount < dailyTasks.length;

  const ms         = msUntilReset(now, game.resetTime);
  const h          = ms / 3600000;
  const cdColor    = h < 3 ? 'var(--cd-urgent)' : h < 6 ? 'var(--cd-warn)' : 'var(--muted)';
  const visColor   = ensureContrast(game.color);
  const localReset = utcToLocalHHMM(game.resetTime);

  const headerBg = bgDataUrl
    ? `linear-gradient(90deg, ${game.color}40 0%, ${game.color}18 40%, rgba(13,17,23,0.60) 100%)`
    : `linear-gradient(90deg, ${game.color}28 0%, ${game.color}10 40%, rgba(22,27,34,0.92) 100%)`;

  const wrapTask = (tk) => (
    <div key={tk.id} className={cx(s.taskRow, exitingIds.has(tk.id) ? s.taskRowExit : (enteringIds.has(tk.id) ? s.taskRowEnter : null))}>
      <TaskRow task={tk} game={game} checks={checks} now={now} onToggle={onToggle} cd={cd} />
    </div>
  );

  return (
    <div
      className={cx(s.card, allDone && s.cardDone)}
      style={{ border: `var(--card-border) solid ${game.color}60`, viewTransitionName: `game-${game.id}` }}
    >
      {bgDataUrl && <div className={s.bgLayer} style={{ backgroundImage: `url(${bgDataUrl})` }} />}
      {bgDataUrl && <div className={s.bgOverlay} style={{ opacity: 1 - bgOpacity }} />}

      <div className={s.content}>
        <Row
          bg={headerBg}
          borderBottom={hasVisible ? '1px solid rgba(255,255,255,0.055)' : 'none'}
          onClick={hasDailyTasks ? handleToggleCollapse : undefined}
          style={hasDailyTasks ? { cursor: 'pointer' } : undefined}
          preSlot={hasDailyTasks ? (
            <span
              className={cx(s.accordionBtn, animDir === 'open' && s.chevronOpen, animDir === 'close' && s.chevronClose)}
              style={{ pointerEvents: 'none' }}
            >▼</span>
          ) : null}
          barSlot={<PrevBar show={dailyTasks.length > 0} checked={prevAll} partial={prevPartial} />}
          checkbox={
            <button
              onClick={(e) => { e.stopPropagation(); fireMasterPop(); onToggle(null, game, true); }}
              className={cx(ss.cb, ss.cbGame, allTodayDone && ss.cbChecked, masterPop && ss.cbPop)}
            >
              {allTodayDone ? '✓' : ''}
            </button>
          }
          content={
            <span style={{
              fontWeight: 700, fontSize: 14, flex: 1, minWidth: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              color: allDone ? 'var(--dim)' : visColor,
              textDecoration: allDone ? 'line-through' : 'none',
              WebkitTextStroke: '0.6px rgba(0,0,0,0.85)', paintOrder: 'stroke fill',
              transition: 'all 0.3s',
            }}>
              {game.name}
            </span>
          }
          meta={
            <>
              {!allTodayDone && <span className={s.countdown} style={{ color: cdColor }}>⏱{formatCountdown(ms, cd)}</span>}
              <span className={s.resetTime}>{localReset}</span>
            </>
          }
          rightSlot={null}
        />

        <div className={cx(s.bodyWrap, hasVisible && s.bodyWrapOpen)} style={!hasDailyTasks ? { display: 'none' } : undefined}>
          <div className={cx(s.body, bgDataUrl && s.bodyWithBg)}>
            {visibleDaily.map(wrapTask)}
            {visibleDaily.length > 0 && visiblePeriod.length > 0 && (
              <div className={s.divider}>
                <span className={s.sepLabel}>— {t('periodic')} —</span>
              </div>
            )}
            {visiblePeriod.map(wrapTask)}
          </div>
        </div>
      </div>
    </div>
  );
}
