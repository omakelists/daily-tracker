import { motion } from 'motion/react'
import { t } from '../util/i18n'
import type { ReactNode, CSSProperties } from 'react'
import type { Game, Task } from '../types'
import s from './UI.module.css'
import shared from './shared.module.css'

// ── Badge CSS class map ───────────────────────────────────────────
export const BADGE_MAP: Record<string, string> = {
  daily: s.badgeDaily,
  weekly: s.badgeWeekly,
  monthly: s.badgeMonthly,
  halfmonthly: s.badgeHalfmonthly,
  event: s.badgeEvent,
}

// ── Shared motion variants ────────────────────────────────────────
const overlayVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.18 } },
}
const boxVariants = {
  initial: { opacity: 0, y: 14, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.22 } },
  exit: { opacity: 0, y: 8, scale: 0.97, transition: { duration: 0.18 } },
}
const confirmBoxVariants = {
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.18 } },
  exit: { opacity: 0, scale: 0.92, transition: { duration: 0.15 } },
}

// ── GameHeader ────────────────────────────────────────────────────
interface GameHeaderProps {
  barSlot?: ReactNode
  headerTrigger?: Record<string, unknown>
  colorSlot?: ReactNode
  checkbox?: ReactNode
  handleSlot?: ReactNode
  contentSlot?: ReactNode
  metaSlot?: ReactNode
  deleteSlot?: ReactNode
  bg?: string
  borderBottom?: string
  className?: string
  style?: CSSProperties
  onClick?: () => void
  rootProps?: Record<string, unknown>
}

export function GameHeader({
  barSlot,
  headerTrigger,
  colorSlot,
  checkbox,
  handleSlot,
  contentSlot,
  metaSlot,
  deleteSlot,
  bg,
  borderBottom,
  className,
  style,
  onClick,
  rootProps,
}: GameHeaderProps) {
  return (
    <div
      {...rootProps}
      {...headerTrigger}
      className={`${s.gameHeaderRow}${className ? ` ${className}` : ''}`}
      style={{
        background: bg ?? 'transparent',
        borderBottom: borderBottom ?? 'none',
        ...style,
      }}
      onClick={onClick}
    >
      <div className={shared.barSlot}>{barSlot}</div>
      <div className={s.colorSlot}>{colorSlot}</div>
      {checkbox != null && (
        <div className={shared.cbWrap} onClick={(e) => e.stopPropagation()}>
          {checkbox}
        </div>
      )}
      {handleSlot != null && (
        <div className={shared.handleSlot}>{handleSlot}</div>
      )}
      <div className={shared.taskWrapSlot}>
        <div className={shared.taskLabelSlot}>{contentSlot}</div>
        {metaSlot != null && <div className={shared.meta}>{metaSlot}</div>}
      </div>
      {deleteSlot != null && (
        <div className={shared.deleteSlot}>{deleteSlot}</div>
      )}
    </div>
  )
}

interface PrevBarProps {
  show: boolean
  checked?: boolean
  partial?: boolean
}

export function PrevBar({ show, checked, partial }: PrevBarProps) {
  if (!show) return null
  const color =
    checked ? 'var(--prev-done)'
    : partial ? 'var(--prev-partial)'
    : 'var(--prev-miss)'
  return (
    <div title={t('prevTip')} className={s.prevbarWrap}>
      <div
        className={s.prevBar}
        style={{
          background: color,
          boxShadow:
            checked ?
              `0 0 0 1.5px rgba(0,0,0,0.85), 0 0 5px ${color}88`
            : '0 0 0 1.5px rgba(0,0,0,0.85)',
        }}
      />
    </div>
  )
}

export function Badge({ item }: { item: Pick<Task, 'type'> }) {
  return (
    <span className={`${s.taskBadge} ${BADGE_MAP[item.type]}`}>
      <span className={s.badgeText}>{t(`types.${item.type}`)}</span>
    </span>
  )
}

// ── Modal ─────────────────────────────────────────────────────────
interface ModalProps {
  title: string
  titleExtra?: ReactNode
  onClose: () => void
  children: ReactNode
}

export function Modal({ title, titleExtra, onClose, children }: ModalProps) {
  return (
    <motion.div
      className={s.overlay}
      variants={overlayVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <motion.div
        className={s.box}
        variants={boxVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <div className={s.modalHeader}>
          <div className={s.modalTitleGroup}>
            <span className={s.modalTitle}>{title}</span>
            {titleExtra}
          </div>
          <button onClick={onClose} className={s.modalClose}>
            ✕
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  )
}

// ── ConfirmDialog ─────────────────────────────────────────────────
interface ConfirmDialogProps {
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmLabel?: string
}

export function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
  confirmLabel,
}: ConfirmDialogProps) {
  return (
    <motion.div
      className={s.confirmOverlay}
      variants={overlayVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <motion.div
        className={s.confirmBox}
        variants={confirmBoxVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <div className={s.confirmIcon}>🗑️</div>
        <div className={s.confirmMsg}>{message}</div>
        <div className={s.confirmActions}>
          <button onClick={onCancel} className={shared.btn}>
            {t('cancel')}
          </button>
          <button
            onClick={onConfirm}
            className={`${shared.btn} ${shared.btnDanger}`}
          >
            {confirmLabel ?? t('deleteBtn')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// Re-export Game for components that import from UI
export type { Game }
