import { useState, useCallback, useMemo, forwardRef } from 'react'
import type { MouseEvent } from 'react'
import { motion, AnimatePresence, useAnimate } from 'motion/react'
import { t } from '../util/i18n'
import {
  DAY_MS,
  DAILY,
  WEEKLY,
  HALFMONTHLY,
  MONTHLY,
  EVENT,
} from '../constants'
import type { TaskType } from '../types'
import {
  ensureContrast,
  getPeriodKey,
  getPrevPeriodKey,
  msUntilReset,
  msUntilTaskReset,
  msUntilDeadline,
  formatCountdown,
  cdColor,
  checkKey,
  calcAllDone,
  applyOrder,
} from '../util/helpers'
import { useContextTrigger } from '../util/useContextTrigger'
import { GameHeader, PrevBar } from './UI'
import { TaskRow } from './TaskRow'
import { TaskAddForm } from './TaskAddForm'
import { ContextMenu } from './ContextMenu'
import type { ContextMenuItem } from './ContextMenu'
import { TaskView } from './TaskView'
import type { Game, Task, ChecksMap } from '../types'
import s from './GameCard.module.css'
import shared from './shared.module.css'

import type { Easing } from 'motion/react'

// ── Motion variants ───────────────────────────────────────────────
const taskVariants = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto', transition: { duration: 0.2 } },
  exit: { opacity: 0, height: 0, transition: { duration: 0.18 } },
}
const bodyVariants = {
  initial: { height: 0, opacity: 0 },
  animate: {
    height: 'auto',
    opacity: 1,
    transition: { duration: 0.24, ease: 'easeOut' as Easing },
  },
  exit: {
    height: 0,
    opacity: 0,
    transition: { duration: 0.2, ease: 'easeIn' as Easing },
  },
}

// ── ItemRow ───────────────────────────────────────────────────────
interface ItemRowProps {
  game: Game
  item: Task
  now: Date
  checks: ChecksMap
  editingId: string | null
  onToggle: (game: Game, taskId: string | null) => void
  onEditItem?: (gameId: string, taskId: string, updates: Partial<Task>) => void
  onDeleteItem?: (gameId: string, taskId: string) => void
  confirmDeleteItem?: (taskId: string) => void
  handleItemContextMenu?: (taskId: string, x: number, y: number) => void
  closeEdit?: () => void
  prevChecked?: (task: Task) => boolean
}

const ItemRow = forwardRef<HTMLDivElement, ItemRowProps>(function ItemRow(
  {
    game,
    item,
    now,
    checks,
    editingId,
    onToggle,
    onEditItem,
    onDeleteItem,
    confirmDeleteItem,
    handleItemContextMenu,
    closeEdit,
    prevChecked,
  },
  ref
) {
  const [cbScope, animateCb] = useAnimate()

  const isChecked = checks[checkKey(item.id, getPeriodKey(item, game, now))]
  const isEditing = editingId === item.id
  const showDelete = item.type === EVENT && isChecked && !!onDeleteItem

  return (
    <motion.div
      ref={ref}
      variants={taskVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={shared.clipContents}
    >
      {isEditing ?
        <TaskAddForm
          game={game}
          item={item}
          onSave={(updates) => {
            onEditItem?.(game.id, item.id, updates)
            closeEdit?.()
          }}
          onCancel={closeEdit}
        />
      : <TaskRow
          task={item}
          showDelete={showDelete}
          onContextMenu={handleItemContextMenu}
          onDelete={onDeleteItem ? confirmDeleteItem : undefined}
        >
          <div className={shared.barSlot}>
            <PrevBar show={item.type === DAILY} checked={prevChecked?.(item)} />
          </div>
          <div className={shared.cbWrap} onClick={(e) => e.stopPropagation()}>
            <button
              ref={cbScope}
              onClick={() => {
                animateCb(
                  cbScope.current,
                  { scale: [1, 1.3, 0.92, 1.08, 1] },
                  { duration: 0.22 }
                )
                onToggle(game, item.id)
              }}
              className={`${s.cb}${isChecked ? ` ${s.cbChecked}` : ''}`}
            >
              {isChecked ? '✓' : ''}
            </button>
          </div>
          <TaskView
            game={game}
            task={item}
            now={now}
            isChecked={isChecked}
            showDeadline={!showDelete}
          />
        </TaskRow>
      }
    </motion.div>
  )
})

// ── GameCard ──────────────────────────────────────────────────────
interface CtxMenuState {
  x: number
  y: number
  target: 'header' | 'item'
  itemId?: string
}

export interface GameCardProps {
  game: Game
  checks: ChecksMap
  now: Date
  onToggle: (game: Game, taskId: string | null, isMaster?: boolean) => void
  allDone: boolean
  dailyTasks: Task[]
  collapsed: boolean
  onToggleCollapse: (taskId: string) => void
  bgDataUrl?: string | null
  bgOpacity?: number
  onAddItem: (gameId: string, task: Task) => void
  onDeleteItem: (gameId: string, taskId: string) => void
  onEditItem: (gameId: string, taskId: string, updates: Partial<Task>) => void
  showConfirm: (msg: string, fn: () => void, lbl: string) => void
}

export const GameCard = forwardRef<HTMLDivElement, GameCardProps>(
  function GameCard(
    {
      game,
      checks,
      now,
      onToggle,
      allDone,
      dailyTasks,
      collapsed,
      onToggleCollapse,
      bgDataUrl,
      bgOpacity = 0.5,
      onAddItem,
      onDeleteItem,
      onEditItem,
      showConfirm,
    },
    ref
  ) {
    const [cbScope, animateCb] = useAnimate()
    const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null)
    const [formState, setFormState] = useState<{ mode: TaskType } | null>(null)
    const [editingId, setEditingId] = useState<string | null>(null)

    const cd = useMemo(() => ({ d: t('cd.d'), h: t('cd.h'), m: t('cd.m') }), [])

    const closeCtx = useCallback(() => setCtxMenu(null), [])
    const closeEdit = useCallback(() => setEditingId(null), [])

    const confirmDeleteItem = useCallback(
      (taskId: string) => {
        const task = game.items.find((it) => it.id === taskId)
        const isExpiredEvent =
          task?.type === EVENT
          && msUntilDeadline(task.deadline, now, task.deadlineTime) <= 0
        const doDelete = () => onDeleteItem?.(game.id, taskId)
        if (isExpiredEvent || !showConfirm) {
          doDelete()
          return
        }
        const name = task?.name?.trim() || t(`types.${task?.type}`)
        showConfirm(t('deleteMsg', { name }), doDelete, t('deleteBtn'))
      },
      [game, now, onDeleteItem, showConfirm]
    )

    const headerTrigger = useContextTrigger(
      useCallback((x, y) => setCtxMenu({ x, y, target: 'header' }), [])
    )
    const handleItemContextMenu = useCallback(
      (taskId: string, x: number, y: number) => {
        setCtxMenu({ x, y, target: 'item', itemId: taskId })
      },
      []
    )

    const handleToggleCollapse = useCallback(() => {
      if (document.startViewTransition)
        document.startViewTransition(() => onToggleCollapse(game.id))
      else onToggleCollapse(game.id)
    }, [game.id, onToggleCollapse])

    const handleMasterClick = useCallback(
      (e: MouseEvent) => {
        e.stopPropagation()
        animateCb(
          cbScope.current,
          { scale: [1, 1.3, 0.92, 1.08, 1] },
          { duration: 0.22 }
        )
        onToggle(game, null, true)
      },
      [animateCb, cbScope, onToggle, game]
    )

    const allItems = game.items

    const isChecked = (task: Task) =>
      checks[checkKey(task.id, getPeriodKey(task, game, now))]
    const prevChecked = (task: Task) =>
      checks[checkKey(task.id, getPrevPeriodKey(task, game, now))]

    const allSortedItems = applyOrder(allItems, game.itemOrder)
    const visItems =
      collapsed ?
        allSortedItems.filter((it) => !isChecked(it) || it.id === editingId)
      : allSortedItems

    const showBody = visItems.length > 0 || formState !== null

    const allTodayDone = calcAllDone(game, checks, now, `${game.id}_solo`)
    const prevCount = dailyTasks.filter(
      (tk) => checks[checkKey(tk.id, getPrevPeriodKey(tk, game, now))]
    ).length
    const prevAll = dailyTasks.length > 0 && prevCount === dailyTasks.length
    const prevPartial = prevCount > 0 && prevCount < dailyTasks.length

    const ms = msUntilReset(now, game.resetTime)

    let urgentMs: number | null = null
    if (allItems.length > 0) {
      let min = Infinity
      for (const it of allItems) {
        if (isChecked(it)) continue
        let m: number
        if (it.type === EVENT) {
          m = msUntilDeadline(it.deadline, now, it.deadlineTime)
        } else {
          m = msUntilTaskReset(it, game, now)
        }
        if (m > 0 && m < DAY_MS) min = Math.min(min, m)
      }
      if (min < Infinity) urgentMs = min
    }

    const displayMs =
      allItems.length === 0 ?
        allTodayDone ? null
        : ms
      : urgentMs
    const headerCdColor = cdColor(displayMs ?? 0, 3, 6)
    const visColor = ensureContrast(game.color)
    const headerBg =
      bgDataUrl ?
        `linear-gradient(90deg, ${game.color}40 0%, ${game.color}18 40%, rgba(13,17,23,0.60) 100%)`
      : `linear-gradient(90deg, ${game.color}28 0%, ${game.color}10 40%, rgba(22,27,34,0.92) 100%)`

    const isMasterClickable = allItems.length === 0

    const ctxItems = useMemo((): ContextMenuItem[] => {
      if (!ctxMenu) return []
      if (ctxMenu.target === 'header')
        return [
          {
            label: t('types.daily'),
            icon: '➕',
            onClick: () => setFormState({ mode: DAILY }),
          },
          {
            label: t('types.weekly'),
            icon: '➕',
            onClick: () => setFormState({ mode: WEEKLY }),
          },
          {
            label: t('types.halfmonthly'),
            icon: '➕',
            onClick: () => setFormState({ mode: HALFMONTHLY }),
          },
          {
            label: t('types.monthly'),
            icon: '➕',
            onClick: () => setFormState({ mode: MONTHLY }),
          },
          {
            label: t('types.event'),
            icon: '➕',
            onClick: () => setFormState({ mode: EVENT }),
          },
        ]
      if (ctxMenu.target === 'item')
        return [
          {
            label: t('ctxEditTask'),
            icon: '✏️',
            onClick: () => setEditingId(ctxMenu.itemId ?? null),
          },
          { separator: true },
          {
            label: t('ctxDeleteTask'),
            icon: '🗑️',
            danger: true,
            onClick: () => confirmDeleteItem(ctxMenu.itemId!),
          },
        ]
      return []
    }, [ctxMenu, confirmDeleteItem])

    return (
      <div
        ref={ref}
        className={`${s.gameItem}${allDone && !bgDataUrl ? ` ${s.gameItemDone}` : ''}`}
        style={{
          border: `var(--card-border) solid ${game.color}60`,
          viewTransitionName: `game-${game.id}`,
        }}
        data-game-card="true"
      >
        {bgDataUrl && (
          <div
            className={s.bgLayer}
            style={{ backgroundImage: `url(${bgDataUrl})` }}
          />
        )}
        {bgDataUrl && (
          <div className={s.bgOverlay} style={{ opacity: bgOpacity }} />
        )}

        <div className={s.content}>
          <GameHeader
            bg={headerBg}
            headerTrigger={headerTrigger}
            borderBottom={
              showBody ? '1px solid rgba(255,255,255,0.055)' : 'none'
            }
            onClick={allItems.length > 0 ? handleToggleCollapse : undefined}
            className={allItems.length > 0 ? s.gameItemClickable : undefined}
            barSlot={
              <PrevBar
                show={dailyTasks.length > 0}
                checked={prevAll}
                partial={prevPartial}
              />
            }
            handleSlot={
              allItems.length > 0 ?
                <motion.span
                  className={s.accordionBtn}
                  animate={{ rotate: collapsed ? -90 : 0 }}
                  transition={{ duration: 0.22 }}
                >
                  ▼
                </motion.span>
              : null
            }
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
              <span
                className={s.gameName}
                style={{
                  color: allDone ? 'var(--muted)' : visColor,
                  textDecoration: allDone ? 'line-through' : 'none',
                  textDecorationThickness: allDone ? '2px' : undefined,
                }}
              >
                {game.name}
              </span>
            }
            metaSlot={
              <>
                {displayMs !== null && (
                  <span
                    className={s.countdown}
                    style={{ color: headerCdColor }}
                  >
                    ⏱{formatCountdown(displayMs, cd)}
                  </span>
                )}
                <span className={s.resetTime}>{game.resetTime}</span>
              </>
            }
          />

          <AnimatePresence initial={false}>
            {showBody && (
              <motion.div
                key="body"
                variants={bodyVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className={shared.clipContents}
              >
                <div
                  className={`${s.gameBody}${bgDataUrl ? ` ${s.gameBodyWithBg}` : ''}`}
                >
                  <AnimatePresence mode="popLayout" initial={false}>
                    {visItems.map((item) => (
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
                    ))}
                  </AnimatePresence>

                  <AnimatePresence initial={false}>
                    {formState && (
                      <motion.div
                        key="add-form"
                        variants={taskVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className={shared.clipContents}
                      >
                        <TaskAddForm
                          type={formState.mode}
                          game={game}
                          onAdd={(task) => {
                            onAddItem?.(game.id, task)
                            setFormState(null)
                          }}
                          onCancel={() => setFormState(null)}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {ctxMenu && (
            <ContextMenu
              key="ctx"
              x={ctxMenu.x}
              y={ctxMenu.y}
              items={ctxItems}
              onClose={closeCtx}
            />
          )}
        </AnimatePresence>
      </div>
    )
  }
)
