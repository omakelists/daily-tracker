import { useState } from 'react';
import { cx } from '../util/cx';
import { t } from '../util/i18n';
import s from './UI.module.css';

// ── inputCls: base className for <input> / <select> elements ────
export const inputCls = s.inputCls;
/** @deprecated kept for backward-compat; prefer inputCls */
export const IS = s.inputCls;

// ── Shared styles (exported so GameCard / TaskRow / Settings etc. can use them) ──
export const sharedStyles = {
  // Row layout
  row: s.row, preSlot: s.preSlot, barSlot: s.barSlot,
  content: s.content, meta: s.meta, right: s.right,
  // Checkbox
  cb: s.cb, cbGame: s.cbGame, cbChecked: s.cbChecked, cbPop: s.cbPop,
  // Badges
  badge: s.badge,
  badgeDaily: s.badgeDaily, badgeWeekly: s.badgeWeekly, badgeWebdaily: s.badgeWebdaily,
  badgeMonthly: s.badgeMonthly, badgeHalfmonthly: s.badgeHalfmonthly,
  // Buttons
  btn: s.btn, btnDanger: s.btnDanger, btnAdd: s.btnAdd, btnConfirm: s.btnConfirm,
};

// ── Row ───────────────────────────────────────────────────────────
export function Row({ preSlot, barSlot, checkbox, content, meta, rightSlot, bg, borderBottom, className, style, onClick }) {
  return (
    <div
      className={cx(s.row, className)}
      style={{ background: bg ?? 'transparent', borderBottom: borderBottom ?? 'none', ...style }}
      onClick={onClick}
    >
      {preSlot != null && <div className={s.preSlot}>{preSlot}</div>}
      <div className={s.barSlot}>{barSlot}</div>
      {checkbox != null && <div style={{ flexShrink: 0, display: 'flex' }} onClick={(e) => e.stopPropagation()}>{checkbox}</div>}
      <div className={s.content}>{content}</div>
      {meta      && <div className={s.meta}>{meta}</div>}
      {rightSlot && <div className={s.right}>{rightSlot}</div>}
    </div>
  );
}

// ── PrevBar ───────────────────────────────────────────────────────
export function PrevBar({ show, checked, partial }) {
  if (!show) return null;
  const color = checked ? 'var(--prev-done)' : partial ? 'var(--prev-partial)' : 'var(--prev-miss)';
  return (
    <div title={t('prevTip')} className={s.prevbarWrap}>
      <div style={{
        width: 'var(--bar-w)', height: 18, borderRadius: 2, background: color,
        boxShadow: checked ? `0 0 0 1.5px rgba(0,0,0,0.85), 0 0 5px ${color}88` : '0 0 0 1.5px rgba(0,0,0,0.85)',
      }} />
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────
export function Modal({ title, titleExtra, onClose, children }) {
  const [closing, setClosing] = useState(false);
  const handleClose = () => { setClosing(true); setTimeout(onClose, 170); };
  return (
    <div className={cx(s.overlay, closing && s.overlayClosing)} onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className={cx(s.box, closing && s.boxClosing)}>
        <div className={s.modalHeader}>
          <div className={s.modalTitleGroup}>
            <span className={s.modalTitle}>{title}</span>
            {titleExtra}
          </div>
          <button onClick={handleClose} className={s.modalClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── ConfirmDialog ─────────────────────────────────────────────────
export function ConfirmDialog({ message, onConfirm, onCancel, confirmLabel }) {
  const [closing, setClosing] = useState(false);
  const dismiss = (fn) => () => { setClosing(true); setTimeout(fn, 140); };
  return (
    <div className={cx(s.confirmOverlay, closing && s.confirmOverlayClosing)}>
      <div className={cx(s.confirmBox, closing && s.confirmBoxClosing)}>
        <div className={s.confirmIcon}>🗑️</div>
        <div className={s.confirmMsg}>{message}</div>
        <div className={s.confirmActions}>
          <button onClick={dismiss(onCancel)}  className={s.btn}>{t('cancel')}</button>
          <button onClick={dismiss(onConfirm)} className={cx(s.btn, s.btnDanger)}>{confirmLabel ?? t('deleteBtn')}</button>
        </div>
      </div>
    </div>
  );
}
