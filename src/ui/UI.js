import { jsx, jsxs } from 'react/jsx-runtime';
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
  if (!show) return null;  // barSlot div already exists in Row
  const color = checked ? 'var(--prev-done)' : partial ? 'var(--prev-partial)' : 'var(--prev-miss)';
  return jsx('div', {
    title: t('prevTip'),
    style: { cursor: 'help', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' },
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
  return jsx('div', {
    style: { position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '18px 14px', overflowY: 'auto' },
    onClick: (e) => { if (e.target === e.currentTarget) onClose(); },
    children: jsxs('div', {
      style: { background: 'var(--bg-app)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: '100%', padding: '22px', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' },
      children: [
        jsxs('div', {
          style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
          children: [
            jsxs('div', {
              style: { display: 'flex', alignItems: 'center', gap: 8 },
              children: [
                jsx('span', { style: { fontWeight: 800, fontSize: 16 }, children: title }),
                titleExtra,
              ],
            }),
            jsx('button', { onClick: onClose, style: { background: 'none', border: 'none', color: 'var(--muted)', fontSize: 20, cursor: 'pointer' }, children: '✕' }),
          ],
        }),
        children,
      ],
    }),
  });
}

// ── ConfirmDialog ────────────────────────────────────────────────────
export function ConfirmDialog({ message, onConfirm, onCancel, confirmLabel }) {
  return jsx('div', {
    style: { position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
    children: jsxs('div', {
      style: { background: 'var(--bg-surface)', border: '1px solid rgba(248,81,73,0.4)', borderRadius: 14, padding: '24px', maxWidth: 300, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' },
      children: [
        jsx('div', { style: { fontSize: 30, marginBottom: 10 }, children: '🗑️' }),
        jsx('div', { style: { fontSize: 14, color: 'var(--text)', marginBottom: 20, lineHeight: 1.7, whiteSpace: 'pre-line' }, children: message }),
        jsxs('div', {
          style: { display: 'flex', gap: 10, justifyContent: 'center' },
          children: [
            jsx('button', { onClick: onCancel,  className: 'dt-btn',              children: t('cancel') }),
            jsx('button', { onClick: onConfirm, className: 'dt-btn dt-btn-danger', children: confirmLabel ?? t('deleteBtn') }),
          ],
        }),
      ],
    }),
  });
}


