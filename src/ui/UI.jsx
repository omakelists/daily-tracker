import { motion, AnimatePresence } from 'motion/react';
import { t } from '../util/i18n';
import s from './UI.module.css';
import shared from './shared.module.css';

// ── Badge CSS class map ───────────────────────────────────────────
export const BADGE_MAP = {
  daily:       s.badgeDaily,
  weekly:      s.badgeWeekly,
  monthly:     s.badgeMonthly,
  halfmonthly: s.badgeHalfmonthly,
  event:       s.badgeEvent,
};

// ── Shared motion variants ────────────────────────────────────────
const overlayVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit:    { opacity: 0, transition: { duration: 0.18 } },
};
const boxVariants = {
  initial: { opacity: 0, y: 14, scale: 0.97 },
  animate: { opacity: 1, y: 0,  scale: 1,    transition: { duration: 0.22 } },
  exit:    { opacity: 0, y: 8,  scale: 0.97, transition: { duration: 0.18 } },
};
const confirmBoxVariants = {
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1,    transition: { duration: 0.18 } },
  exit:    { opacity: 0, scale: 0.92, transition: { duration: 0.15 } },
};

// ── TaskSection ───────────────────────────────────────────────────
// Shared animated section container used in both GameCard and Settings.
//
// Props
//   header    ReactNode | false  — optional divider/label rendered above the list
//   items     Array              — items passed to wrapItem
//   wrapItem  (item) => Node     — must return a keyed element
//   popLayout boolean            — enables mode="popLayout" on the list AnimatePresence
//                                  (GameCard uses this; Settings does not)
//   addSlot   ReactNode          — the "add form or add button" area below the list,
//                                  fully composed by the caller
export function TaskSection({ header, items, wrapItem, popLayout = false, addSlot }) {
  return (
    <>
      {header}
      <AnimatePresence mode={popLayout ? 'popLayout' : undefined} initial={false}>
        {items.map(wrapItem)}
      </AnimatePresence>
      {addSlot}
    </>
  );
}

// ── GameHeader ────────────────────────────────────────────────────
// Game-level header row. Used by both GameCard (main) and Settings.
// Slot structure (left→right):
//   barSlot | colorSlot | checkbox | handleSlot | contentSlot | metaSlot | deleteSlot
export function GameHeader({ barSlot, headerTrigger, colorSlot, checkbox, handleSlot, contentSlot, metaSlot, deleteSlot, bg, borderBottom, className, style, onClick, rootProps }) {
  return (
    <div
      {...rootProps}
      {...headerTrigger}
      className={`${s.gameHeaderRow}${className ? ` ${className}` : ''}`}
      style={{ background: bg ?? 'transparent', borderBottom: borderBottom ?? 'none', ...style }}
      onClick={onClick}
    >
      <div className={shared.barSlot}>{barSlot}</div>
      <div className={s.colorSlot}>{colorSlot}</div>
      {checkbox   != null && <div className={shared.cbWrap}     onClick={(e) => e.stopPropagation()}>{checkbox}</div>}
      {handleSlot != null && <div className={shared.handleSlot} >{handleSlot}</div>}
      <div className={shared.taskWrapSlot}>
        <div className={shared.taskLabelSlot}>{contentSlot}</div>
        {metaSlot != null && (
          <div className={shared.meta}>{metaSlot}</div>
        )}
      </div>
      {deleteSlot != null && <div className={shared.deleteSlot}>{deleteSlot}</div>}
    </div>
  );
}
export function PrevBar({ show, checked, partial }) {
  if (!show) return null;
  const color = checked ? 'var(--prev-done)' : partial ? 'var(--prev-partial)' : 'var(--prev-miss)';
  return (
    <div title={t('prevTip')} className={s.prevbarWrap}>
      <div className={s.prevBar} style={{
        background: color,
        boxShadow: checked ? `0 0 0 1.5px rgba(0,0,0,0.85), 0 0 5px ${color}88` : '0 0 0 1.5px rgba(0,0,0,0.85)',
      }} />
    </div>
  );
}
export function Badge({item}) {
  return (
    <span className={`${s.taskBadge} ${BADGE_MAP[item.type]}`}>
      <span className={s.badgeText}>{t(`types.${item.type}`)}</span>
    </span>
  );
}

// ── Modal ─────────────────────────────────────────────────────────
// AnimatePresence must wrap the conditional render at the call site.
export function Modal({ title, titleExtra, onClose, children }) {
  return (
    <motion.div
      className={s.overlay}
      variants={overlayVariants}
      initial="initial" animate="animate" exit="exit"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className={s.box}
        variants={boxVariants}
        initial="initial" animate="animate" exit="exit"
      >
        <div className={s.modalHeader}>
          <div className={s.modalTitleGroup}>
            <span className={s.modalTitle}>{title}</span>
            {titleExtra}
          </div>
          <button onClick={onClose} className={s.modalClose}>✕</button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

// ── ConfirmDialog ─────────────────────────────────────────────────
// AnimatePresence must wrap the conditional render at the call site.
export function ConfirmDialog({ message, onConfirm, onCancel, confirmLabel }) {
  return (
    <motion.div
      className={s.confirmOverlay}
      variants={overlayVariants}
      initial="initial" animate="animate" exit="exit"
    >
      <motion.div
        className={s.confirmBox}
        variants={confirmBoxVariants}
        initial="initial" animate="animate" exit="exit"
      >
        <div className={s.confirmIcon}>🗑️</div>
        <div className={s.confirmMsg}>{message}</div>
        <div className={s.confirmActions}>
          <button onClick={onCancel}  className={shared.btn}>{t('cancel')}</button>
          <button onClick={onConfirm} className={`${shared.btn} ${shared.btnDanger}`}>{confirmLabel ?? t('deleteBtn')}</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
