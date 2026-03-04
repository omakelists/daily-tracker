import { jsx, jsxs } from 'react/jsx-runtime';
import { useState } from 'react';
import { t } from '../util/i18n.js';

// ── Static form-control style helpers (kept as JS for Settings inline use) ──
export const IS = {
  background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6,
  color: 'var(--text)', padding: '6px 9px', fontSize: 13, outline: 'none',
};

// ── Row ─────────────────────────────────────────────────────────────
/**
 * [preSlot?] [barSlot] [checkbox] [content flex:1] [meta] [rightSlot]
 *
 * preSlot – optional extra slot rendered before barSlot, same width as barSlot.
 *           Used on game-card headers to place the accordion toggle there while
 *           keeping the prev-bar in barSlot, so prev-bars align vertically with
 *           sub-task prev-bars.
 */
export function Row({ preSlot, barSlot, checkbox, content, meta, rightSlot, bg, borderBottom, className, style, onClick }) {
  return jsxs('div', {
    className: `dt-row${className ? ` ${className}` : ''}`,
    style: { background: bg ?? 'transparent', borderBottom: borderBottom ?? 'none', ...style },
    onClick,
    children: [
      preSlot != null && jsx('div', { className: 'dt-pre-slot', children: preSlot }),
      jsx('div', { className: 'dt-bar-slot', children: barSlot }),
      checkbox,
      jsx('div', { className: 'dt-content', children: content }),
      meta      && jsx('div', { className: 'dt-meta',  children: meta }),
      rightSlot && jsx('div', { className: 'dt-right', children: rightSlot }),
    ],
  });
}

// ── PrevBar ──────────────────────────────────────────────────────────
export function PrevBar({ show, checked, partial }) {
  if (!show) return null;
  const color = checked ? 'var(--prev-done)' : partial ? 'var(--prev-partial)' : 'var(--prev-miss)';
  return jsx('div', {
    title: t('prevTip'),
    className: 'dt-prevbar-wrap',
    children: jsx('div', {
      style: {
        width: 'var(--bar-w)', height: 18, borderRadius: 2, background: color,
        boxShadow: checked ? `0 0 4px ${color}88` : 'none',
      },
    }),
  });
}

// ── Modal ────────────────────────────────────────────────────────────
export function Modal({ title, titleExtra, onClose, children }) {
  const [closing, setClosing] = useState(false);
  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 170);
  };
  return jsx('div', {
    className: `dt-modal-overlay${closing ? ' closing' : ''}`,
    onClick: (e) => { if (e.target === e.currentTarget) handleClose(); },
    children: jsxs('div', {
      className: 'dt-modal-box',
      children: [
        jsxs('div', {
          className: 'dt-modal-header',
          children: [
            jsxs('div', {
              className: 'dt-modal-title-group',
              children: [
                jsx('span', { className: 'dt-modal-title', children: title }),
                titleExtra,
              ],
            }),
            jsx('button', { onClick: handleClose, className: 'dt-modal-close', children: '✕' }),
          ],
        }),
        children,
      ],
    }),
  });
}

// ── ConfirmDialog ────────────────────────────────────────────────────
export function ConfirmDialog({ message, onConfirm, onCancel, confirmLabel }) {
  const [closing, setClosing] = useState(false);
  const dismiss = (fn) => () => { setClosing(true); setTimeout(fn, 140); };
  return jsx('div', {
    className: `dt-confirm-overlay${closing ? ' closing' : ''}`,
    children: jsxs('div', {
      className: 'dt-confirm-box',
      children: [
        jsx('div', { className: 'dt-confirm-icon', children: '🗑️' }),
        jsx('div', { className: 'dt-confirm-msg',  children: message }),
        jsxs('div', {
          className: 'dt-confirm-actions',
          children: [
            jsx('button', { onClick: dismiss(onCancel),  className: 'dt-btn',               children: t('cancel') }),
            jsx('button', { onClick: dismiss(onConfirm), className: 'dt-btn dt-btn-danger',  children: confirmLabel ?? t('deleteBtn') }),
          ],
        }),
      ],
    }),
  });
}


