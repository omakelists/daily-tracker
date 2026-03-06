import { useCallback } from 'react';
import { motion, AnimatePresence, useAnimate } from 'motion/react';
import { cx } from '../util/cx';
import { t } from '../util/i18n';
import { PERIOD_TYPES, ensureContrast, utcToLocalHHMM } from '../constants';
import { getPeriodKey, getPrevPeriodKey, msUntilReset, formatCountdown, checkKey } from '../util/helpers';
import { Row, PrevBar } from './UI';
import { TaskRow } from './TaskRow';
import s from './GameCard.module.css';
import shared from './shared.module.css';

// Task enter/exit variants
const taskVariants = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto', transition: { duration: 0.2 } },
  exit:    { opacity: 0, height: 0,    transition: { duration: 0.18 } },
};

// Accordion body variants
const bodyVariants = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1, transition: { duration: 0.24, ease: 'easeOut' } },
  exit:    { height: 0, opacity: 0,    transition: { duration: 0.2,  ease: 'easeIn' } },
};

export function GameCard({ game, checks, now, onToggle, allDone, dailyTasks, cd, collapsed, onToggleCollapse, bgDataUrl, bgOpacity = 0.5 }) {
  const [cbScope, animateCb] = useAnimate();

  const dailyGroup    = game.tasks.filter((tk) => !PERIOD_TYPES.has(tk.type));
  const periodGroup   = game.tasks.filter((tk) =>  PERIOD_TYPES.has(tk.type));
  const hasDailyTasks = dailyGroup.length > 0;

  const isChecked = (tk) => !!checks[checkKey(tk.id, getPeriodKey(tk, game, now))];

  // When collapsed, hide checked tasks — AnimatePresence handles their exit animation
  const visibleDaily  = collapsed ? dailyGroup.filter((tk)  => !isChecked(tk)) : dailyGroup;
  const visiblePeriod = collapsed ? periodGroup.filter((tk) => !isChecked(tk)) : periodGroup;
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

  const handleToggleCollapse = useCallback(() => {
    if (document.startViewTransition) document.startViewTransition(() => onToggleCollapse(game.id));
    else onToggleCollapse(game.id);
  }, [game.id, onToggleCollapse]);

  const handleMasterClick = (e) => {
    e.stopPropagation();
    animateCb(cbScope.current, { scale: [1, 1.3, 0.92, 1.08, 1] }, { duration: 0.22 });
    onToggle(null, game, true);
  };

  const wrapTask = (tk) => (
    <motion.div
      key={tk.id}
      variants={taskVariants}
      initial="initial" animate="animate" exit="exit"
      style={{ overflow: 'hidden' }}
    >
      <TaskRow task={tk} game={game} checks={checks} now={now} onToggle={onToggle} cd={cd} />
    </motion.div>
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
            <motion.span
              className={s.accordionBtn}
              animate={{ rotate: collapsed ? -90 : 0 }}
              transition={{ duration: 0.22 }}
              style={{ pointerEvents: 'none' }}
            >▼</motion.span>
          ) : null}
          barSlot={<PrevBar show={dailyTasks.length > 0} checked={prevAll} partial={prevPartial} />}
          checkbox={
            <button
              ref={cbScope}
              onClick={handleMasterClick}
              className={cx(shared.cb, shared.cbGame, allTodayDone && shared.cbChecked)}
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

        <AnimatePresence initial={false}>
          {hasDailyTasks && hasVisible && (
            <motion.div
              key="body"
              variants={bodyVariants}
              initial="initial" animate="animate" exit="exit"
              style={{ overflow: 'hidden' }}
            >
              <div className={cx(s.body, bgDataUrl && s.bodyWithBg)}>
                <AnimatePresence mode="popLayout" initial={false}>
                  {visibleDaily.map(wrapTask)}
                </AnimatePresence>

                {visibleDaily.length > 0 && visiblePeriod.length > 0 && (
                  <div className={s.divider}>
                    <span className={s.sepLabel}>— {t('periodic')} —</span>
                  </div>
                )}

                <AnimatePresence mode="popLayout" initial={false}>
                  {visiblePeriod.map(wrapTask)}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
