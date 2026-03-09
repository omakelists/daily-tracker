import { useState, useCallback } from 'react';
import { motion, AnimatePresence, useAnimate } from 'motion/react';
import { t } from '../util/i18n';
import { ensureContrast, utcToLocalHHMM, DAILY_TYPES, PERIOD_TYPES } from '../constants';
import { getPeriodKey, getPrevPeriodKey, msUntilReset, formatCountdown, checkKey } from '../util/helpers';
import { useContextTrigger } from '../util/useContextTrigger';
import { Row, PrevBar, TaskSection } from './UI';
import { TaskRow } from './TaskRow';
import { InlineAddForm } from './InlineAddForm';
import { ContextMenu } from './ContextMenu';
import s from './GameCard.module.css';
import shared from './shared.module.css';

const taskVariants = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto', transition: { duration: 0.2 } },
  exit:    { opacity: 0, height: 0,    transition: { duration: 0.18 } },
};

// Wraps an InlineAddForm in an animated motion.div for GameCard's addSlot.
// Passing `false` as `form` lets AnimatePresence animate the exit cleanly.
const animatedForm = (key, form) => (
  <AnimatePresence initial={false}>
    {form && (
      <motion.div key={key} variants={taskVariants} initial="initial" animate="animate" exit="exit" className={shared.clipContents}>
        {form}
      </motion.div>
    )}
  </AnimatePresence>
);
const bodyVariants = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1, transition: { duration: 0.24, ease: 'easeOut' } },
  exit:    { height: 0, opacity: 0,    transition: { duration: 0.2,  ease: 'easeIn' } },
};

// Convert shared Sets to arrays for use as typeOpts in InlineAddForm / TypeSelect
const DAILY_TASK_TYPES  = [...DAILY_TYPES];
const PERIOD_TASK_TYPES = [...PERIOD_TYPES];

function applyOrder(items, storedOrder) {
  const orderedIds = (storedOrder ?? []).filter((id) => items.some((x) => x.id === id));
  const unordered  = items.filter((x) => !orderedIds.includes(x.id));
  return [
    ...orderedIds.map((id) => items.find((x) => x.id === id)).filter(Boolean),
    ...unordered,
  ];
}

// ─────────────────────────────────────────────────────────────────
export function GameCard({
  game, checks, now, onToggle, allDone, dailyTasks, cd,
  collapsed, onToggleCollapse, bgDataUrl, bgOpacity = 0.5,
  events = [], onAddEvent, onAddTask, onDeleteEvent, onToggleEvent, onEditEvent, onEditTask,
}) {
  const [cbScope, animateCb] = useAnimate();
  const [ctxMenu,   setCtxMenu]   = useState(null);
  const [formState, setFormState] = useState(null); // add-only modes: addDaily | addPeriodic | addEvent
  const [editingId, setEditingId] = useState(null); // id of the task/event currently being edited inline

  const closeCtx    = useCallback(() => setCtxMenu(null), []);
  const closeEdit   = useCallback(() => setEditingId(null), []);

  const headerTrigger = useContextTrigger(
    useCallback((x, y) => setCtxMenu({ x, y, target: 'header' }), [])
  );
  const handleEventContextMenu = useCallback((id, x, y) => {
    setCtxMenu({ x, y, target: 'event', eventId: id });
  }, []);
  const handleTaskContextMenu = useCallback((id, x, y) => {
    setCtxMenu({ x, y, target: 'task', taskId: id });
  }, []);

  // ── Item grouping ────────────────────────────────────────────────
  const dailyItems  = game.tasks.filter((tk) => DAILY_TASK_TYPES.includes(tk.type));
  const periodItems = game.tasks.filter((tk) => PERIOD_TASK_TYPES.includes(tk.type));

  const isChecked = (tk) => !!checks[checkKey(tk.id, getPeriodKey(tk, game, now))];

  const sortedDaily  = applyOrder(dailyItems,  game.dailyOrder);
  const sortedPeriod = applyOrder(periodItems, game.periodicOrder);
  const sortedEvents = applyOrder(events,      game.eventOrder);

  // Keep the item being edited visible even when collapsed
  const visDaily  = collapsed ? sortedDaily.filter((tk) => !isChecked(tk) || tk.id === editingId)  : sortedDaily;
  const visPeriod = collapsed ? sortedPeriod.filter((tk) => !isChecked(tk) || tk.id === editingId) : sortedPeriod;
  const visEvents = collapsed ? sortedEvents.filter((ev) => !ev.done || ev.id === editingId)       : sortedEvents;

  const allTodayDone = dailyTasks.length > 0 && dailyTasks.every((tk) => !!checks[checkKey(tk.id, getPeriodKey(tk, game, now))]);
  const prevCount    = dailyTasks.filter((tk) => !!checks[checkKey(tk.id, getPrevPeriodKey(tk, game, now))]).length;
  const prevAll      = dailyTasks.length > 0 && prevCount === dailyTasks.length;
  const prevPartial  = prevCount > 0 && prevCount < dailyTasks.length;

  const hasVisDaily  = visDaily.length > 0;
  const hasVisPeriod = visPeriod.length > 0;
  const hasVisEvents = visEvents.length > 0;

  // Each section is visible if it has items OR its add-form is active
  const showDailySection  = hasVisDaily  || formState?.mode === 'addDaily';
  const showPeriodSection = hasVisPeriod || formState?.mode === 'addPeriodic';
  const showEventSection  = hasVisEvents || formState?.mode === 'addEvent';
  const showBody = showDailySection || showPeriodSection || showEventSection;

  const ms      = msUntilReset(now, game.resetTime);
  const h       = ms / 3600000;
  const cdColor = h < 3 ? 'var(--cd-urgent)' : h < 6 ? 'var(--cd-warn)' : 'var(--muted)';
  const visColor = ensureContrast(game.color);

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

  const wrapTask = (tk) => {
    const isEditing = editingId === tk.id;
    const typeGroup = DAILY_TASK_TYPES.includes(tk.type) ? 'daily' : 'periodic';
    return (
      <motion.div key={tk.id} variants={taskVariants} initial="initial" animate="animate" exit="exit" className={shared.clipContents}>
        {isEditing ? (
          <InlineAddForm
            typeOpts={typeGroup === 'daily' ? DAILY_TASK_TYPES : PERIOD_TASK_TYPES}
            gameResetTime={game.resetTime}
            initialName={tk.name}
            initialType={tk.type}
            initialWebResetTime={tk.webResetTime ?? ''}
            initialMonthlyResetDay={tk.monthlyResetDay ?? 1}
            submitLabel={t('save')}
            onSave={(updates) => { onEditTask?.(game.id, tk.id, updates); closeEdit(); }}
            onCancel={closeEdit}
          />
        ) : (
          <TaskRow task={tk} game={game} checks={checks} now={now} onToggle={onToggle} cd={cd} onContextMenu={handleTaskContextMenu} />
        )}
      </motion.div>
    );
  };

  const wrapEvent = (ev) => {
    const isEditing = editingId === ev.id;
    return (
      <motion.div key={ev.id} variants={taskVariants} initial="initial" animate="animate" exit="exit" className={shared.clipContents}>
        {isEditing ? (
          <InlineAddForm
            defaultTime={game.resetTime}
            initialName={ev.name}
            initialDeadline={ev.deadline || ''}
            initialDeadlineTime={ev.deadlineTime || ''}
            submitLabel={t('save')}
            onSave={(updates) => { onEditEvent(game.id, ev.id, updates); closeEdit(); }}
            onCancel={closeEdit}
          />
        ) : (
          <TaskRow task={ev} now={now} cd={cd} onToggle={(id) => onToggleEvent(game.id, id)} onContextMenu={handleEventContextMenu} onDelete={(id) => onDeleteEvent(game.id, id)} gameResetTime={game.resetTime} />
        )}
      </motion.div>
    );
  };

  // ── Context menu ─────────────────────────────────────────────────
  const ctxItems = ctxMenu
    ? ctxMenu.target === 'header'
      ? [
          { label: t('ctxAddDaily'),    icon: '➕', onClick: () => setFormState({ mode: 'addDaily' }) },
          { label: t('ctxAddPeriodic'), icon: '➕', onClick: () => setFormState({ mode: 'addPeriodic' }) },
          { label: t('ctxAddEvent'),    icon: '➕', onClick: () => setFormState({ mode: 'addEvent' }) },
        ]
      : ctxMenu.target === 'task'
        ? [
            { label: t('ctxEditTask'), icon: '✏️', onClick: () => setEditingId(ctxMenu.taskId) },
          ]
        : ctxMenu.target === 'event'
          ? [
              { label: t('ctxEditEvent'),   icon: '✏️', onClick: () => setEditingId(ctxMenu.eventId) },
              { separator: true },
              { label: t('ctxDeleteEvent'), icon: '🗑️', danger: true, onClick: () => onDeleteEvent(game.id, ctxMenu.eventId) },
            ]
          : []
    : [];

  return (
    <div
      className={`${s.card}${allDone && !bgDataUrl ? ` ${s.cardDone}` : ''}`}
      style={{ border: `var(--card-border) solid ${game.color}60`, viewTransitionName: `game-${game.id}` }}
      data-game-card="true"
    >
      {bgDataUrl && <div className={s.bgLayer} style={{ backgroundImage: `url(${bgDataUrl})` }} />}
      {bgDataUrl && <div className={s.bgOverlay} style={{ opacity: bgOpacity }} />}

      <div className={s.content}>
        {/* Header */}
        <div {...headerTrigger}>
          <Row
            bg={headerBg}
            borderBottom={showBody ? '1px solid rgba(255,255,255,0.055)' : 'none'}
            onClick={dailyItems.length > 0 ? handleToggleCollapse : undefined}
            className={dailyItems.length > 0 ? s.cardClickable : undefined}
            preSlot={dailyItems.length > 0 ? (
              <motion.span className={s.accordionBtn} animate={{ rotate: collapsed ? -90 : 0 }} transition={{ duration: 0.22 }}>▼</motion.span>
            ) : null}
            barSlot={<PrevBar show={dailyTasks.length > 0} checked={prevAll} partial={prevPartial} />}
            checkbox={
              <button ref={cbScope} onClick={handleMasterClick} className={`${shared.cb} ${shared.cbGame}${allTodayDone ? ` ${shared.cbChecked}` : ''}`}>
                {allTodayDone ? '✓' : ''}
              </button>
            }
            content={
              <span className={s.gameName} style={{ color: allDone ? 'var(--muted)' : visColor, textDecoration: allDone ? 'line-through' : 'none', textDecorationThickness: allDone ? '2px' : undefined }}>
                {game.name}
              </span>
            }
            meta={
              <>
                {!allTodayDone && <span className={s.countdown} style={{ color: cdColor }}>⏱{formatCountdown(ms, cd)}</span>}
                <span className={s.resetTime}>{utcToLocalHHMM(game.resetTime)}</span>
              </>
            }
            rightSlot={null}
          />
        </div>

        {/* Body */}
        <AnimatePresence initial={false}>
          {showBody && (
            <motion.div key="body" variants={bodyVariants} initial="initial" animate="animate" exit="exit" className={shared.clipContents}>
              <div className={`${s.body}${bgDataUrl ? ` ${s.bodyWithBg}` : ''}`}>

                {/* Section 1: Daily / WebDaily */}
                {showDailySection && (
                  <TaskSection
                    items={visDaily}
                    wrapItem={wrapTask}
                    popLayout
                    addSlot={animatedForm('add-daily',
                      formState?.mode === 'addDaily' && (
                        <InlineAddForm
                          typeOpts={DAILY_TASK_TYPES}
                          gameResetTime={game.resetTime}
                          onAdd={(task) => { onAddTask?.(game.id, task); setFormState(null); }}
                          onCancel={() => setFormState(null)}
                        />
                      )
                    )}
                  />
                )}

                {/* Section 2: Periodic tasks */}
                {showPeriodSection && (
                  <TaskSection
                    header={<div className={s.divider}><span className={s.sepLabel}>— {t('periodic')} —</span></div>}
                    items={visPeriod}
                    wrapItem={wrapTask}
                    popLayout
                    addSlot={animatedForm('add-periodic',
                      formState?.mode === 'addPeriodic' && (
                        <InlineAddForm
                          typeOpts={PERIOD_TASK_TYPES}
                          gameResetTime={game.resetTime}
                          onAdd={(task) => { onAddTask?.(game.id, task); setFormState(null); }}
                          onCancel={() => setFormState(null)}
                        />
                      )
                    )}
                  />
                )}

                {/* Section 3: Events */}
                {showEventSection && (
                  <TaskSection
                    header={<div className={s.divider}><span className={s.sepLabel}>— {t('events')} —</span></div>}
                    items={visEvents}
                    wrapItem={wrapEvent}
                    popLayout
                    addSlot={animatedForm('add-event',
                      formState?.mode === 'addEvent' && (
                        <InlineAddForm
                          defaultTime={game.resetTime}
                          onAdd={(item) => { onAddEvent(game.id, { ...item, type: 'event' }); setFormState(null); }}
                          onCancel={() => setFormState(null)}
                        />
                      )
                    )}
                  />
                )}

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {ctxMenu && <ContextMenu key="ctx" x={ctxMenu.x} y={ctxMenu.y} items={ctxItems} onClose={closeCtx} />}
      </AnimatePresence>
    </div>
  );
}
