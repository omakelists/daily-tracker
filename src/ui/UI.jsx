import { useState } from 'react';
import { cx } from '../util/cx';
import { t } from '../util/i18n';
import s from './UI.module.css';
import shared from './shared.module.css';

// ── Row ───────────────────────────────────────────────────────────
export function Row({ preSlot, barSlot, checkbox, content, meta, rightSlot, bg, borderBottom, className, style, onClick }) {
  return (
    <div
      className={cx(shared.row, className)}
      style={{ background: bg ?? 'transparent', borderBottom: borderBottom ?? 'none', ...style }}
      onClick={onClick}
    >
      {preSlot != null && <div className={shared.preSlot}>{preSlot}</div>}
      <div className={shared.barSlot}>{barSlot}</div>
      {checkbox != null && <div style={{ flexShrink: 0, display: 'flex' }} onClick={(e) => e.stopPropagation()}>{checkbox}</div>}
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
          <button onClick={dismiss(onCancel)}  className={shared.btn}>{t('cancel')}</button>
          <button onClick={dismiss(onConfirm)} className={cx(shared.btn, shared.btnDanger)}>{confirmLabel ?? t('deleteBtn')}</button>
        </div>
      </div>
    </div>
  );
}
