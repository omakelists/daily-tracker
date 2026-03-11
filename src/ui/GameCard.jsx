import { useState, useCallback } from 'react';
import { motion, AnimatePresence, useAnimate } from 'motion/react';
import { t } from '../util/i18n';
import { ensureContrast, utcToLocalHHMM, DAILY_TYPES, PERIOD_TYPES, EVENT_TYPES, DAY_MS } from '../constants';
import { getPeriodKey, getPrevPeriodKey, msUntilReset, msUntilTaskReset, msUntilDeadline, formatCountdown, cdColor, checkKey, calcAllDone } from '../util/helpers';
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
  onAddItem, onDeleteItem, onEditItem,
}) {
  const [cbScope, animateCb] = useAnimate();
  const [ctxMenu,   setCtxMenu]   = useState(null);
  const [formState, setFormState] = useState(null); // modes: addDaily | addWeekly | addHalfmonthly | addMonthly | addEvent
  const [editingId, setEditingId] = useState(null); // id of the task/event currently being edited inline

  const closeCtx    = useCallback(() => setCtxMenu(null), []);
  const closeEdit   = useCallback(() => setEditingId(null), []);

  const headerTrigger = useContextTrigger(
    useCallback((x, y) => setCtxMenu({ x, y, target: 'header' }), [])
  );
  const handleItemContextMenu = useCallback((id, x, y) => {
    setCtxMenu({ x, y, target: 'item', itemId: id });
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
  const visEvents = collapsed ? sortedEvents.filter((it) => !isChecked(it) || it.id === editingId) : sortedEvents;

  const allTodayDone = calcAllDone(game, checks, now, `${game.id}_solo`);
  const prevCount    = dailyTasks.filter((tk) => !!checks[checkKey(tk.id, getPrevPeriodKey(tk, game, now))]).length;
  const prevAll      = dailyTasks.length > 0 && prevCount === dailyTasks.length;
  const prevPartial  = prevCount > 0 && prevCount < dailyTasks.length;

  const hasVisDaily  = visDaily.length > 0;
  const hasVisPeriod = visPeriod.length > 0;
  const hasVisEvents = visEvents.length > 0;

  // Each section is visible if it has items OR its add-form is active
  const showDailySection  = hasVisDaily  || formState?.mode === 'addDaily';
  const showPeriodSection = hasVisPeriod || formState?.mode === 'addWeekly' || formState?.mode === 'addHalfmonthly' || formState?.mode === 'addMonthly';
  const showEventSection  = hasVisEvents || formState?.mode === 'addEvent';
  const showBody = showDailySection || showPeriodSection || showEventSection;

  const ms      = msUntilReset(now, game.resetTime);

  // When items exist: show nearest unchecked task deadline within 24h (null if none).
  // When no items (solo mode): show game reset countdown unless master is checked.
  const urgentMs = (() => {
    if (allItems.length === 0) return null;
    let min = Infinity;
    for (const it of allItems) {
      if (isChecked(it)) continue;
      let m;
      if (EVENT_TYPES.has(it.type)) {
        if (!it.deadline) continue;
        m = msUntilDeadline(it.deadline, now, it.deadlineTime);
      } else {
        m = msUntilTaskReset(it, game, now);
      }
      if (m > 0 && m < DAY_MS) min = Math.min(min, m);
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
    return (
      <motion.div key={item.id} variants={taskVariants} initial="initial" animate="animate" exit="exit" className={shared.clipContents}>
        {isEditing
          ? <InlineAddForm  game={game} item={item} onSave={(updates) => { onEditItem?.(game.id, item.id, updates); closeEdit(); }} onCancel={closeEdit} />
          : <TaskRow task={item} game={game} checks={checks} now={now} cd={cd} onToggle={onToggle} onContextMenu={handleItemContextMenu} onDelete={onDeleteItem ? (id) => onDeleteItem(game.id, id) : undefined} />}
      </motion.div>
    );
  };

  // ── Context menu ─────────────────────────────────────────────────
  const ctxItems = ctxMenu
    ? ctxMenu.target === 'header'
      ? [
          { label: t('ctxAddDaily'),       icon: '➕', onClick: () => setFormState({ mode: 'addDaily' }) },
          { label: t('types.weekly'),       icon: '➕', onClick: () => setFormState({ mode: 'addWeekly' }) },
          { label: t('types.halfmonthly'),  icon: '➕', onClick: () => setFormState({ mode: 'addHalfmonthly' }) },
          { label: t('types.monthly'),      icon: '➕', onClick: () => setFormState({ mode: 'addMonthly' }) },
          { label: t('ctxAddEvent'),        icon: '➕', onClick: () => setFormState({ mode: 'addEvent' }) },
        ]
      : ctxMenu.target === 'item'
        ? [
            { label: t(EVENT_TYPES.has((game.items ?? []).find((it) => it.id === ctxMenu.itemId)?.type) ? 'ctxEditEvent' : 'ctxEditTask'), icon: '✏️', onClick: () => setEditingId(ctxMenu.itemId) },
            ...(EVENT_TYPES.has((game.items ?? []).find((it) => it.id === ctxMenu.itemId)?.type)
              ? [{ separator: true }, { label: t('ctxDeleteEvent'), icon: '🗑️', danger: true, onClick: () => onDeleteItem?.(game.id, ctxMenu.itemId) }]
              : []),
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
                        <InlineAddForm
                          type="daily"
                          game={game}
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
                      (formState?.mode === 'addWeekly' || formState?.mode === 'addHalfmonthly' || formState?.mode === 'addMonthly') && (
                        <InlineAddForm
                          type={formState.mode === 'addWeekly' ? 'weekly' : formState.mode === 'addHalfmonthly' ? 'halfmonthly' : 'monthly'}
                          game={game}
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
                        <InlineAddForm
                          type="event"
                          game={game}
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
