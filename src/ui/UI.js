import { jsx, jsxs } from 'react/jsx-runtime';
import { useState } from 'react';
import { css, cx, keyframes } from '@emotion/css';
import { t } from '../util/i18n.js';

// ── inputCls: base className for <input> / <select> elements ────
// Extra per-element overrides (width, flex, etc.) go into style={} alongside className.
export const inputCls = css({
  background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6,
  color: 'var(--text)', padding: '6px 9px', fontSize: 13, outline: 'none',
  fontFamily: 'inherit',
});
/** @deprecated kept for backward-compat; prefer inputCls */
export const IS = inputCls;

// ── Shared keyframes ──────────────────────────────────────────────
const cbPopAnim = keyframes({
  '0%':   { transform: 'scale(1)'    },
  '35%':  { transform: 'scale(1.3)'  },
  '65%':  { transform: 'scale(0.92)' },
  '100%': { transform: 'scale(1.08)' },
});
const overlayIn  = keyframes({ from: { opacity: 0 }, to: { opacity: 1 } });
const overlayOut = keyframes({ from: { opacity: 1 }, to: { opacity: 0 } });
const boxIn  = keyframes({
  from: { opacity: 0, transform: 'translateY(14px) scale(0.97)' },
  to:   { opacity: 1, transform: 'translateY(0) scale(1)'        },
});
const boxOut = keyframes({
  from: { opacity: 1, transform: 'translateY(0) scale(1)'      },
  to:   { opacity: 0, transform: 'translateY(8px) scale(0.97)' },
});
const confirmIn  = keyframes({ from: { opacity: 0, transform: 'scale(0.92)' }, to: { opacity: 1, transform: 'scale(1)' } });
const confirmOut = keyframes({ from: { opacity: 1, transform: 'scale(1)' }, to: { opacity: 0, transform: 'scale(0.92)' } });

// ── Shared styles (exported so GameCard / TaskRow / Settings etc. can use them) ──
export const sharedStyles = {
  // Row layout
  row:      css({ display: 'flex', alignItems: 'center', padding: '10px var(--row-pr) 10px var(--row-pl)' }),
  preSlot:  css({ width: 'var(--bar-slot)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }),
  barSlot:  css({ width: 'var(--bar-slot)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }),
  content:  css({ flex: 1, display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'var(--cb-gap)', minWidth: 0 }),
  meta:     css({ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 10 }),
  right:    css({ flexShrink: 0, marginLeft: 6 }),

  // Checkbox
  cb: css({
    width: 'var(--cb-w)', height: 'var(--cb-w)', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', fontSize: 14, color: 'var(--text)',
    background: 'rgba(0,0,0,0.42)', border: '2px solid var(--border)',
    borderRadius: 6, transition: 'all 0.15s',
    boxShadow: '0 0 0 1px rgba(0,0,0,0.6)',
  }),
  cbGame:    css({ borderRadius: 7, fontSize: 13, borderColor: 'rgba(255,255,255,0.3)' }),
  cbChecked: css({ background: 'var(--checked-bg) !important', borderColor: 'var(--checked-br) !important', transform: 'scale(1.08)' }),
  cbPop:     css({ animation: `${cbPopAnim} 0.22s ease forwards` }),

  // Type badges
  badge:           css({ fontSize: 10, borderRadius: 4, padding: '1px 5px', flexShrink: 0, border: '1px solid transparent' }),
  badgeDaily:       css({ color: 'var(--type-daily)',       background: 'rgba(88,166,255,.09)',  borderColor: 'rgba(88,166,255,.25)' }),
  badgeWeekly:      css({ color: 'var(--type-weekly)',      background: 'rgba(188,140,255,.09)', borderColor: 'rgba(188,140,255,.25)' }),
  badgeWebdaily:    css({ color: 'var(--type-webdaily)',    background: 'rgba(63,185,80,.09)',   borderColor: 'rgba(63,185,80,.25)' }),
  badgeMonthly:     css({ color: 'var(--type-monthly)',     background: 'rgba(255,123,114,.09)', borderColor: 'rgba(255,123,114,.25)' }),
  badgeHalfmonthly: css({ color: 'var(--type-halfmonthly)', background: 'rgba(255,166,87,.09)',  borderColor: 'rgba(255,166,87,.25)' }),

  // Buttons
  btn:        css({ background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--muted)', padding: '5px 10px', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }),
  btnDanger:  css({ color: 'var(--danger)', borderColor: 'rgba(248,81,73,.27)' }),
  btnAdd:     css({ color: 'var(--link)',   borderColor: 'rgba(88,166,255,.27)' }),
  btnConfirm: css({ color: 'var(--green)',  borderColor: 'rgba(63,185,80,.27)' }),
};

// ── Private styles for this file ──────────────────────────────────
const s = {
  prevbarWrap: css({ cursor: 'help', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }),

  overlay: css({
    position: 'fixed', inset: 0, zIndex: 200,
    background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    padding: '18px 14px', overflowY: 'auto',
    animation: `${overlayIn} 0.2s ease forwards`,
  }),
  overlayClosing: css({ animation: `${overlayOut} 0.18s ease forwards` }),

  box: css({
    background: 'var(--bg-app)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 16, width: '100%', maxWidth: 740, padding: 22,
    boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
    animation: `${boxIn} 0.22s ease forwards`,
  }),
  boxClosing: css({ animation: `${boxOut} 0.18s ease forwards` }),

  modalHeader:     css({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }),
  modalTitleGroup: css({ display: 'flex', alignItems: 'center', gap: 8 }),
  modalTitle:      css({ fontWeight: 800, fontSize: 16 }),
  modalClose:      css({ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 20, cursor: 'pointer' }),

  confirmOverlay: css({
    position: 'fixed', inset: 0, zIndex: 500,
    background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    animation: `${overlayIn} 0.15s ease forwards`,
  }),
  confirmOverlayClosing: css({ animation: `${overlayOut} 0.15s ease forwards` }),
  confirmBox: css({
    background: 'var(--bg-surface)', border: '1px solid rgba(248,81,73,0.4)',
    borderRadius: 14, padding: 24, maxWidth: 300, width: '100%',
    textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    animation: `${confirmIn} 0.18s ease forwards`,
  }),
  confirmBoxClosing: css({ animation: `${confirmOut} 0.15s ease forwards` }),
  confirmIcon:    css({ fontSize: 30, marginBottom: 10 }),
  confirmMsg:     css({ fontSize: 14, color: 'var(--text)', marginBottom: 20, lineHeight: 1.7, whiteSpace: 'pre-line' }),
  confirmActions: css({ display: 'flex', gap: 10, justifyContent: 'center' }),
};

// ── Row ──────────────────────────────────────────────────────────────
export function Row({ preSlot, barSlot, checkbox, content, meta, rightSlot, bg, borderBottom, className, style, onClick }) {
  return jsxs('div', {
    className: cx(sharedStyles.row, className),
    style: { background: bg ?? 'transparent', borderBottom: borderBottom ?? 'none', ...style },
    onClick,
    children: [
      preSlot != null && jsx('div', { className: sharedStyles.preSlot, children: preSlot }),
      jsx('div', { className: sharedStyles.barSlot, children: barSlot }),
      checkbox,
      jsx('div', { className: sharedStyles.content, children: content }),
      meta      && jsx('div', { className: sharedStyles.meta,  children: meta }),
      rightSlot && jsx('div', { className: sharedStyles.right, children: rightSlot }),
    ],
  });
}

// ── PrevBar ──────────────────────────────────────────────────────────
export function PrevBar({ show, checked, partial }) {
  if (!show) return null;
  const color = checked ? 'var(--prev-done)' : partial ? 'var(--prev-partial)' : 'var(--prev-miss)';
  return jsx('div', {
    title: t('prevTip'),
    className: s.prevbarWrap,
    children: jsx('div', {
      style: { width: 'var(--bar-w)', height: 18, borderRadius: 2, background: color, boxShadow: checked ? `0 0 0 1.5px rgba(0,0,0,0.85), 0 0 5px ${color}88` : '0 0 0 1.5px rgba(0,0,0,0.85)' },
    }),
  });
}

// ── Modal ────────────────────────────────────────────────────────────
export function Modal({ title, titleExtra, onClose, children }) {
  const [closing, setClosing] = useState(false);
  const handleClose = () => { setClosing(true); setTimeout(onClose, 170); };
  return jsx('div', {
    className: cx(s.overlay, closing && s.overlayClosing),
    onClick: (e) => { if (e.target === e.currentTarget) handleClose(); },
    children: jsxs('div', {
      className: cx(s.box, closing && s.boxClosing),
      children: [
        jsxs('div', {
          className: s.modalHeader,
          children: [
            jsxs('div', { className: s.modalTitleGroup, children: [
              jsx('span', { className: s.modalTitle, children: title }),
              titleExtra,
            ]}),
            jsx('button', { onClick: handleClose, className: s.modalClose, children: '✕' }),
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
    className: cx(s.confirmOverlay, closing && s.confirmOverlayClosing),
    children: jsxs('div', {
      className: cx(s.confirmBox, closing && s.confirmBoxClosing),
      children: [
        jsx('div', { className: s.confirmIcon, children: '🗑️' }),
        jsx('div', { className: s.confirmMsg,  children: message }),
        jsxs('div', { className: s.confirmActions, children: [
          jsx('button', { onClick: dismiss(onCancel),  className: sharedStyles.btn,                              children: t('cancel') }),
          jsx('button', { onClick: dismiss(onConfirm), className: cx(sharedStyles.btn, sharedStyles.btnDanger),  children: confirmLabel ?? t('deleteBtn') }),
        ]}),
      ],
    }),
  });
}
