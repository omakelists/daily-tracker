import { useState, useCallback } from 'react';
import { motion, AnimatePresence, useAnimate } from 'motion/react';
import { t } from '../util/i18n';
import { ensureContrast, utcToLocalHHMM, DAILY_TYPES, PERIOD_TYPES, EVENT_TYPES } from '../constants';
import { getPeriodKey, getPrevPeriodKey, msUntilReset, msUntilTaskReset, msUntilDeadline, formatCountdown, cdColor, checkKey } from '../util/helpers';
import { useContextTrigger } from '../util/useContextTrigger';
import { Row, PrevBar, TaskSection } from './UI';
import { TaskRow } from './TaskRow';
import { DailyAddForm, PeriodicAddForm, EventAddForm } from './InlineAddForm';
import { ContextMenu } from './ContextMenu';
import s from './GameCard.module.css';
import shared from './shared.module.css';

const taskVariants = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto', transition: { duration: 0.2 } },
  exit:    { opacity: 0, height: 0,    transition: { duration: 0.18 } },
};

// Wraps an add-form component in an animated motion.div for GameCard's addSlot.
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

// Derive type option arrays from constants Sets (aligned with Settings.jsx)
const DAILY_TYPE_OPTS    = [...DAILY_TYPES];
const PERIODIC_TYPE_OPTS = [...PERIOD_TYPES];

// ── Edit form map: one add-form component per variant ────────────
const EDIT_FORM = {
  daily: ({ item, game, onSave, onCancel }) => (
    <DailyAddForm
      typeOpts={DAILY_TYPE_OPTS}
      gameResetTime={game.resetTime}
      initialName={item.name}
      initialType={item.type}
      initialResetTime={item.resetTime ?? ''}
      submitLabel={t('save')}
      onSave={onSave}
      onCancel={onCancel}
    />
  ),
  periodic: ({ item, game, onSave, onCancel }) => (
    <PeriodicAddForm
      typeOpts={PERIODIC_TYPE_OPTS}
      initialName={item.name}
      initialType={item.type}
      initialMonthlyResetDay={item.monthlyResetDay ?? 1}
      initialWeeklyResetDay={item.weeklyResetDay ?? 1}
      initialHalfMonthlyStartDay={item.halfMonthlyStartDay ?? 1}
      submitLabel={t('save')}
      onSave={onSave}
      onCancel={onCancel}
    />
  ),
  event: ({ item, game, onSave, onCancel }) => (
    <EventAddForm
      defaultTime={game.resetTime}
      initialName={item.name}
      initialDeadline={item.deadline || ''}
      initialDeadlineTime={item.deadlineTime || ''}
      submitLabel={t('save')}
      onSave={onSave}
      onCancel={onCancel}
    />
  ),
};

// ── View row map: one TaskRow config per variant ──────────────────
const VIEW_ROW = {
  daily: ({ item, game, checks, now, cd, onToggle, onContextMenu }) => (
    <TaskRow task={item} game={game} checks={checks} now={now} onToggle={onToggle} cd={cd} onContextMenu={onContextMenu} />
  ),
  periodic: ({ item, game, checks, now, cd, onToggle, onContextMenu }) => (
    <TaskRow task={item} game={game} checks={checks} now={now} onToggle={onToggle} cd={cd} onContextMenu={onContextMenu} />
  ),
  event: ({ item, game, now, cd, onToggleItem, onDeleteItem, onContextMenu }) => (
    <TaskRow task={item} now={now} cd={cd} onToggle={(id) => onToggleItem?.(game.id, id)} onContextMenu={onContextMenu} onDelete={(id) => onDeleteItem?.(game.id, id)} gameResetTime={game.resetTime} />
  ),
};

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
  showSectionHeaders = true,
  onAddItem, onDeleteItem, onToggleItem, onEditItem,
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
  const allItems    = game.items ?? [];
  const dailyItems  = allItems.filter((it) => DAILY_TYPES.has(it.type));
  const periodItems = allItems.filter((it) => PERIOD_TYPES.has(it.type));
  const eventItems  = allItems.filter((it) => EVENT_TYPES.has(it.type));

  const isChecked = (tk) => !!checks[checkKey(tk.id, getPeriodKey(tk, game, now))];

  const sortedDaily  = applyOrder(dailyItems,  game.itemOrder);
  const sortedPeriod = applyOrder(periodItems, game.itemOrder);
  const sortedEvents = applyOrder(eventItems,  game.itemOrder);

  // Keep the item being edited visible even when collapsed
  const visDaily  = collapsed ? sortedDaily.filter((tk) => !isChecked(tk) || tk.id === editingId)  : sortedDaily;
  const visPeriod = collapsed ? sortedPeriod.filter((tk) => !isChecked(tk) || tk.id === editingId) : sortedPeriod;
  const visEvents = collapsed ? sortedEvents.filter((it) => !it.done || it.id === editingId)       : sortedEvents;

  // allTodayDone rules (when allItems.length > 0):
  //   - daily tasks exist → all unchecked tasks with < 24h remaining are checked (≥1 such task must exist)
  //   - no daily tasks    → every item (task/event) is checked/done
  const allTodayDone = (() => {
    if (allItems.length === 0) {
      // Solo mode: driven by virtual solo task via dailyTasks
      return dailyTasks.length > 0 && dailyTasks.every((tk) => !!checks[checkKey(tk.id, getPeriodKey(tk, game, now))]);
    }
    if (dailyItems.length > 0) {
      // Has daily tasks: checked when all tasks due within 24h are checked
      const DAY = 24 * 3600000;
      const urgentTasks = allItems.filter((it) => {
        if (EVENT_TYPES.has(it.type)) return false;
        const m = msUntilTaskReset(it, game, now);
        return m > 0 && m < DAY;
      });
      return urgentTasks.length > 0 && urgentTasks.every((tk) => !!checks[checkKey(tk.id, getPeriodKey(tk, game, now))]);
    }
    // No daily tasks: checked when every item is checked/done
    const allTasksDone  = allItems.filter((it) => !EVENT_TYPES.has(it.type)).every((tk) => !!checks[checkKey(tk.id, getPeriodKey(tk, game, now))]);
    const allEventsDone = allItems.filter((it) => EVENT_TYPES.has(it.type)).every((it) => !!it.done);
    return allTasksDone && allEventsDone;
  })();
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

  // When items exist: show nearest unchecked task deadline within 24h (null if none).
  // When no items (solo mode): show game reset countdown unless master is checked.
  const urgentMs = (() => {
    if (allItems.length === 0) return null;
    const DAY = 24 * 3600000;
    let min = Infinity;
    for (const it of allItems) {
      if (EVENT_TYPES.has(it.type)) {
        if (it.done || !it.deadline) continue;
        const m = msUntilDeadline(it.deadline, now, it.deadlineTime);
        if (m > 0 && m < DAY) min = Math.min(min, m);
      } else {
        if (!!checks[checkKey(it.id, getPeriodKey(it, game, now))]) continue;
        const m = msUntilTaskReset(it, game, now);
        if (m > 0 && m < DAY) min = Math.min(min, m);
      }
    }
    return min < Infinity ? min : null;
  })();
  // Solo mode (no items): display game reset cd when unchecked; items mode: display urgentMs only.
  const displayMs     = allItems.length === 0 ? (allTodayDone ? null : ms) : urgentMs;
  const headerCdColor = cdColor(displayMs ?? 0, 3, 6);
  const visColor = ensureContrast(game.color);

  const headerBg = bgDataUrl
    ? `linear-gradient(90deg, ${game.color}40 0%, ${game.color}18 40%, rgba(13,17,23,0.60) 100%)`
    : `linear-gradient(90deg, ${game.color}28 0%, ${game.color}10 40%, rgba(22,27,34,0.92) 100%)`;

  const handleToggleCollapse = useCallback(() => {
    if (document.startViewTransition) document.startViewTransition(() => onToggleCollapse(game.id));
    else onToggleCollapse(game.id);
  }, [game.id, onToggleCollapse]);

  // Master checkbox acts as daily substitute only when the game has no items at all.
  const isMasterClickable = allItems.length === 0;

  const handleMasterClick = (e) => {
    e.stopPropagation();
    animateCb(cbScope.current, { scale: [1, 1.3, 0.92, 1.08, 1] }, { duration: 0.22 });
    onToggle(null, game, true);
  };

  // Unified wrapper for all item types — variant resolves which map entry to use
  const wrapItem = (item) => {
    const isEditing = editingId === item.id;
    const variant   = EVENT_TYPES.has(item.type) ? 'event'
                    : DAILY_TYPES.has(item.type)  ? 'daily' : 'periodic';
    const sharedProps = {
      item,
      game,
      checks,
      now,
      cd,
      onToggle,
      onToggleItem,
      onDeleteItem,
      onContextMenu: variant === 'event' ? handleEventContextMenu : handleTaskContextMenu,
      onSave:   (updates) => { onEditItem?.(game.id, item.id, updates); closeEdit(); },
      onCancel: closeEdit,
    };
    return (
      <motion.div key={item.id} variants={taskVariants} initial="initial" animate="animate" exit="exit" className={shared.clipContents}>
        {isEditing ? EDIT_FORM[variant](sharedProps) : VIEW_ROW[variant](sharedProps)}
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
              { label: t('ctxDeleteEvent'), icon: '🗑️', danger: true, onClick: () => onDeleteItem?.(game.id, ctxMenu.eventId) },
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
            onClick={allItems.length > 0 ? handleToggleCollapse : undefined}
            className={allItems.length > 0 ? s.cardClickable : undefined}
            preSlot={allItems.length > 0 ? (
              <motion.span className={s.accordionBtn} animate={{ rotate: collapsed ? -90 : 0 }} transition={{ duration: 0.22 }}>▼</motion.span>
            ) : null}
            barSlot={<PrevBar show={dailyTasks.length > 0} checked={prevAll} partial={prevPartial} />}
            checkbox={
              <button
                ref={cbScope}
                onClick={isMasterClickable ? handleMasterClick : undefined}
                className={`${shared.cb} ${shared.cbGame}${allTodayDone ? ` ${shared.cbChecked}` : ''}${!isMasterClickable ? ` ${shared.cbReadOnly}` : ''}`}
              >
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
                {displayMs !== null && <span className={s.countdown} style={{ color: headerCdColor }}>⏱{formatCountdown(displayMs, cd)}</span>}
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
                    // [DAILY SECTION HEADER HIDDEN] Uncomment to restore:
                    // header={showSectionHeaders && <div className={s.divider}><span className={s.sepLabel}>— {t('types.daily')} —</span></div>}
                    items={visDaily}
                    wrapItem={wrapItem}
                    popLayout
                    addSlot={animatedForm('add-daily',
                      formState?.mode === 'addDaily' && (
                        <DailyAddForm
                          typeOpts={DAILY_TYPE_OPTS}
                          gameResetTime={game.resetTime}
                          onAdd={(task) => { onAddItem?.(game.id, task); setFormState(null); }}
                          onCancel={() => setFormState(null)}
                        />
                      )
                    )}
                  />
                )}

                {/* Section 2: Periodic tasks */}
                {showPeriodSection && (
                  <TaskSection
                    header={showSectionHeaders && <div className={s.divider}><span className={s.sepLabel}>— {t('periodic')} —</span></div>}
                    items={visPeriod}
                    wrapItem={wrapItem}
                    popLayout
                    addSlot={animatedForm('add-periodic',
                      formState?.mode === 'addPeriodic' && (
                        <PeriodicAddForm
                          typeOpts={PERIODIC_TYPE_OPTS}
                          gameResetTime={game.resetTime}
                          onAdd={(task) => { onAddItem?.(game.id, task); setFormState(null); }}
                          onCancel={() => setFormState(null)}
                        />
                      )
                    )}
                  />
                )}

                {/* Section 3: Events */}
                {showEventSection && (
                  <TaskSection
                    header={showSectionHeaders && <div className={s.divider}><span className={s.sepLabel}>— {t('events')} —</span></div>}
                    items={visEvents}
                    wrapItem={wrapItem}
                    popLayout
                    addSlot={animatedForm('add-event',
                      formState?.mode === 'addEvent' && (
                        <EventAddForm
                          defaultTime={game.resetTime}
                          onAdd={(item) => { onAddItem?.(game.id, { ...item, type: 'event' }); setFormState(null); }}
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
