import { useState, useCallback, forwardRef } from 'react';
import { motion, AnimatePresence, useAnimate } from 'motion/react';
import { t } from '../util/i18n';
import { EVENT_TYPES, DAY_MS } from '../constants';
import { ensureContrast, utcToLocalHHMM, getPeriodKey, getPrevPeriodKey, msUntilReset, msUntilTaskReset, msUntilDeadline, formatCountdown, cdColor, checkKey, calcAllDone } from '../util/helpers';
import { useContextTrigger } from '../util/useContextTrigger';
import { GameHeader, PrevBar } from './UI';
import { TaskRow } from './TaskRow.jsx';
import { TaskAddForm } from './TaskAddForm.jsx';
import { ContextMenu } from './ContextMenu';
import s from './GameCard.module.css';
import shared from './shared.module.css';
import {TaskView} from "./TaskView.jsx";

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

// ── ItemRow ───────────────────────────────────────────────────────
// Renders a single game item (task or event) inside GameCard.
// forwardRef is required because AnimatePresence with mode="popLayout"
// attaches a ref to each direct child to measure it during exit animations.
// useAnimate is called unconditionally at the top level, satisfying Rules of Hooks.
const ItemRow = forwardRef(function ItemRow({ item, game, now, checks, editingId, onToggle, onEditItem, onDeleteItem, confirmDeleteItem, handleItemContextMenu, closeEdit, prevChecked }, ref) {
  const [cbScope, animateCb] = useAnimate();

  const isChecked  = !!checks[checkKey(item.id, getPeriodKey(item, game, now))];
  const showPrev   = item.type === 'daily';
  const isEvent    = item.type === 'event';
  const isEditing  = editingId === item.id;
  const showDelete = isEvent && isChecked && onDeleteItem;

  return (
    <motion.div ref={ref} variants={taskVariants} initial="initial" animate="animate" exit="exit" className={shared.clipContents}>
      {isEditing
        ? <TaskAddForm game={game} item={item} onSave={(updates) => { onEditItem?.(game.id, item.id, updates); closeEdit(); }} onCancel={closeEdit} />
        : <TaskRow task={item} showDelete={showDelete} onContextMenu={handleItemContextMenu} onDelete={onDeleteItem ? confirmDeleteItem : undefined}>
            <div className={shared.barSlot}>
              <PrevBar show={showPrev} checked={prevChecked(item)} />
            </div>
            <div className={shared.cbWrap} onClick={(e) => e.stopPropagation()}>
              <button
                ref={cbScope}
                onClick={() => {
                  animateCb(cbScope.current, { scale: [1, 1.3, 0.92, 1.08, 1] }, { duration: 0.22 });
                  onToggle(item.id, game);
                }}
                className={`${s.cb}${isChecked ? ` ${s.cbChecked}` : ''}`}
              >
                {isChecked ? '✓' : ''}
              </button>
            </div>
            <TaskView game={game} task={item} now={now} isChecked={isChecked} showDeadline={!showDelete} />
          </TaskRow>
      }
    </motion.div>
  );
});

const FORM_MODE_TO_TYPE = {
  addDaily:       'daily',
  addWeekly:      'weekly',
  addHalfmonthly: 'halfmonthly',
  addMonthly:     'monthly',
  addEvent:       'event',
};

// ─────────────────────────────────────────────────────────────────
// forwardRef is required because AnimatePresence with mode="popLayout"
// attaches a ref to the direct child to measure it during exit animation.
export const GameCard = forwardRef(function GameCard({
  game, checks, now, onToggle, allDone, dailyTasks,
  collapsed, onToggleCollapse, bgDataUrl, bgOpacity = 0.5,
  onAddItem, onDeleteItem, onEditItem, showConfirm,
}, ref) {
  const cd = {d: t('cd.d'), h: t('cd.h'), m: t('cd.m')};
  const [cbScope, animateCb] = useAnimate();
  const [ctxMenu,   setCtxMenu]   = useState(null);
  const [formState, setFormState] = useState(null); // modes: addDaily | addWeekly | addHalfmonthly | addMonthly | addEvent
  const [editingId, setEditingId] = useState(null); // id of the task/event currently being edited inline

  const closeCtx    = useCallback(() => setCtxMenu(null), []);
  const closeEdit   = useCallback(() => setEditingId(null), []);

  // Show confirm dialog before deleting.
  // Exception: expired events are deleted immediately without confirmation.
  const confirmDeleteItem = useCallback((itemId) => {
    const item = (game.items ?? []).find((it) => it.id === itemId);
    const isExpiredEvent = EVENT_TYPES.has(item?.type) &&
      item?.deadline &&
      msUntilDeadline(item.deadline, now, item.deadlineTime ?? null) <= 0;
    const doDelete = () => onDeleteItem?.(game.id, itemId);
    if (isExpiredEvent || !showConfirm) { doDelete(); return; }
    const name = item?.name?.trim() || t(`types.${item?.type}`);
    showConfirm(t('deleteMsg', { name }), doDelete, t('deleteBtn'));
  }, [game, now, onDeleteItem, showConfirm]);

  const headerTrigger = useContextTrigger(
    useCallback((x, y) => setCtxMenu({ x, y, target: 'header' }), [])
  );
  const handleItemContextMenu = useCallback((id, x, y) => {
    setCtxMenu({ x, y, target: 'item', itemId: id });
  }, []);

  // ── Item list ────────────────────────────────────────────────────
  const allItems = game.items ?? [];

  const isChecked   = (task) => !!checks[checkKey(task.id, getPeriodKey(task, game, now))];
  const prevChecked = (task) => !!checks[checkKey(task.id, getPrevPeriodKey(task, game, now))];

  // All items in user-defined order, collapsed state hides checked items.
  const allSortedItems = applyOrder(allItems, game.itemOrder);
  const visItems = collapsed
    ? allSortedItems.filter((it) => !isChecked(it) || it.id === editingId)
    : allSortedItems;

  const showBody = visItems.length > 0 || formState !== null;

  const allTodayDone = calcAllDone(game, checks, now, `${game.id}_solo`);
  const prevCount   = dailyTasks.filter((tk) => !!checks[checkKey(tk.id, getPrevPeriodKey(tk, game, now))]).length;
  const prevAll     = dailyTasks.length > 0 && prevCount === dailyTasks.length;
  const prevPartial = prevCount > 0 && prevCount < dailyTasks.length;

  const ms = msUntilReset(now, game.resetTime);

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

  // Returns a keyed ItemRow element for each item — no hooks called here.
  const wrapItem = (item) => (
    <ItemRow
      key={item.id}
      item={item}
      game={game}
      now={now}
      checks={checks}
      editingId={editingId}
      onToggle={onToggle}
      onEditItem={onEditItem}
      onDeleteItem={onDeleteItem}
      confirmDeleteItem={confirmDeleteItem}
      handleItemContextMenu={handleItemContextMenu}
      closeEdit={closeEdit}
      prevChecked={prevChecked}
    />
  );

  // ── Context menu ─────────────────────────────────────────────────
  const ctxItems = ctxMenu
    ? ctxMenu.target === 'header'
      ? [
          { label: t('types.daily'),        icon: '➕', onClick: () => setFormState({ mode: 'addDaily' }) },
          { label: t('types.weekly'),       icon: '➕', onClick: () => setFormState({ mode: 'addWeekly' }) },
          { label: t('types.halfmonthly'),  icon: '➕', onClick: () => setFormState({ mode: 'addHalfmonthly' }) },
          { label: t('types.monthly'),      icon: '➕', onClick: () => setFormState({ mode: 'addMonthly' }) },
          { label: t('types.event'),        icon: '➕', onClick: () => setFormState({ mode: 'addEvent' }) },
        ]
      : ctxMenu.target === 'item'
        ? [
            { label: t('ctxEditTask'), icon: '✏️', onClick: () => setEditingId(ctxMenu.itemId) },
            { separator: true },
            { label: t('ctxDeleteTask'), icon: '🗑️', danger: true, onClick: () => confirmDeleteItem(ctxMenu.itemId) },
          ]
        : []
    : [];

  return (
    <div
      ref={ref}
      className={`${s.gameItem}${allDone && !bgDataUrl ? ` ${s.gameItemDone}` : ''}`}
      style={{ border: `var(--card-border) solid ${game.color}60`, viewTransitionName: `game-${game.id}` }}
      data-game-card="true"
    >
      {bgDataUrl && <div className={s.bgLayer} style={{ backgroundImage: `url(${bgDataUrl})` }} />}
      {bgDataUrl && <div className={s.bgOverlay} style={{ opacity: bgOpacity }} />}

      <div className={s.content}>
        {/* Header */}
        <GameHeader
          bg={headerBg}
          headerTrigger={headerTrigger}
          borderBottom={showBody ? '1px solid rgba(255,255,255,0.055)' : 'none'}
          onClick={allItems.length > 0 ? handleToggleCollapse : undefined}
          className={allItems.length > 0 ? s.gameItemClickable : undefined}
          barSlot={<PrevBar show={dailyTasks.length > 0} checked={prevAll} partial={prevPartial} />}
          handleSlot={allItems.length > 0 ? (
            <motion.span className={s.accordionBtn} animate={{ rotate: collapsed ? -90 : 0 }} transition={{ duration: 0.22 }}>▼</motion.span>
          ) : null}
          checkbox={
            <button
              ref={cbScope}
              onClick={isMasterClickable ? handleMasterClick : undefined}
              className={`${s.cb} ${s.cbGame}${allTodayDone ? ` ${s.cbChecked}` : ''}${!isMasterClickable ? ` ${s.cbReadOnly}` : ''}`}
            >
              {allTodayDone ? '✓' : ''}
            </button>
          }
          contentSlot={
            <span className={s.gameName} style={{ color: allDone ? 'var(--muted)' : visColor, textDecoration: allDone ? 'line-through' : 'none', textDecorationThickness: allDone ? '2px' : undefined }}>
              {game.name}
            </span>
          }
          metaSlot={
            <>
              {displayMs !== null && <span className={s.countdown} style={{ color: headerCdColor }}>⏱{formatCountdown(displayMs, cd)}</span>}
              <span className={s.resetTime}>{utcToLocalHHMM(game.resetTime)}</span>
            </>
          }
        />

        {/* Body */}
        <AnimatePresence initial={false}>
          {showBody && (
            <motion.div key="body" variants={bodyVariants} initial="initial" animate="animate" exit="exit" className={shared.clipContents}>
              <div className={`${s.gameBody}${bgDataUrl ? ` ${s.gameBodyWithBg}` : ''}`}>

                <AnimatePresence mode="popLayout" initial={false}>
                  {visItems.map(wrapItem)}
                </AnimatePresence>

                {animatedForm('add-form', formState && (
                  <TaskAddForm
                    type={FORM_MODE_TO_TYPE[formState.mode]}
                    game={game}
                    onAdd={(task) => { onAddItem?.(game.id, task); setFormState(null); }}
                    onCancel={() => setFormState(null)}
                  />
                ))}

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
});
