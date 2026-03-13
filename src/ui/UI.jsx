import { motion, AnimatePresence } from 'motion/react';
import { t } from '../util/i18n';
import s from './UI.module.css';
import shared from './shared.module.css';

// ── Badge CSS class map ───────────────────────────────────────────
export const BADGE_MAP = {
  daily:       shared.badgeDaily,
  weekly:      shared.badgeWeekly,
  monthly:     shared.badgeMonthly,
  halfmonthly: shared.badgeHalfmonthly,
  event:       shared.badgeEvent,
  todo:        shared.badgeTodo,
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

// ── Row ───────────────────────────────────────────────────────────
export function Row({ preSlot, barSlot, checkbox, content, meta, rightSlot, bg, borderBottom, className, style, onClick }) {
  return (
    <div
      className={`${shared.row}${className ? ` ${className}` : ""}`}
      style={{ background: bg ?? 'transparent', borderBottom: borderBottom ?? 'none', ...style }}
      onClick={onClick}
    >
      {preSlot != null && <div className={shared.preSlot}>{preSlot}</div>}
      <div className={shared.barSlot}>{barSlot}</div>
      {checkbox != null && <div className={shared.cbWrap} onClick={(e) => e.stopPropagation()}>{checkbox}</div>}
      <div className={shared.content}>{content}</div>
      {meta      && <div className={shared.meta}>{meta}</div>}
      {rightSlot && <div className={shared.right}>{rightSlot}</div>}
    </div>
  );
}

// ── PrevBar ───────────────────────────────────────────────────────
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
