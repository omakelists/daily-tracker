import { jsx, jsxs } from 'react/jsx-runtime';
import { t } from './i18n.js';
import { L } from './constants.js';

// ── Shared style objects ───────────────────────────────────────────

export const IS = {
  background: '#21262d', border: '1px solid #30363d', borderRadius: 6,
  color: '#e6edf3', padding: '6px 9px', fontSize: 13, outline: 'none',
};
export const SB = {
  background: 'transparent', border: '1px solid #30363d', borderRadius: 6,
  color: '#8b949e', padding: '5px 10px', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
};
export const btnStyle = (bg, col) => ({
  background: bg, border: `1px solid ${col}44`, borderRadius: 8,
  color: col, padding: '7px 13px', fontSize: 13, cursor: 'pointer', fontWeight: 600,
});

// ── Row ────────────────────────────────────────────────────────────
/**
 * [prevBar BAR_SLOT] [checkbox CB_W] [CB_GAP] [content flex:1] [meta] [rightSlot far-right]
 */
export function Row({ prevBar, checkbox, content, meta, rightSlot, bg, borderBottom, className, style }) {
  return jsxs('div', {
    className,
    style: {
      display: 'flex', alignItems: 'center',
      paddingLeft: L.ROW_PL, paddingRight: L.ROW_PR,
      paddingTop: 10, paddingBottom: 10,
      background: bg ?? 'transparent',
      borderBottom: borderBottom ?? 'none',
      ...style,
    },
    children: [
      prevBar,
      checkbox,
      jsx('div', {
        style: { flex: 1, display: 'flex', alignItems: 'center', gap: 8, marginLeft: L.CB_GAP, minWidth: 0 },
        children: content,
      }),
      meta && jsx('div', {
        style: { display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 10 },
        children: meta,
      }),
      rightSlot && jsx('div', { style: { flexShrink: 0, marginLeft: 6 }, children: rightSlot }),
    ],
  });
}

// ── PrevBar ────────────────────────────────────────────────────────
export function PrevBar({ show, checked, partial }) {
  if (!show) return jsx('div', { style: { width: L.BAR_SLOT, flexShrink: 0 } });
  const color = checked ? '#2ea043' : partial ? '#e3b341' : '#6e3535';
  return jsx('div', {
    title: t('prevTip'),
    style: { width: L.BAR_SLOT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'help' },
    children: jsx('div', {
      style: { width: L.BAR_W, height: 18, borderRadius: 2, background: color, boxShadow: checked ? `0 0 4px ${color}88` : 'none' },
    }),
  });
}

// ── Modal ──────────────────────────────────────────────────────────
export function Modal({ title, onClose, children }) {
  return jsx('div', {
    style: { position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '18px 14px', overflowY: 'auto' },
    onClick: (e) => { if (e.target === e.currentTarget) onClose(); },
    children: jsxs('div', {
      style: { background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: '100%', maxWidth: 580, padding: '22px', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' },
      children: [
        jsxs('div', {
          style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
          children: [
            jsx('span', { style: { fontWeight: 800, fontSize: 16 }, children: title }),
            jsx('button', { onClick: onClose, style: { background: 'none', border: 'none', color: '#8b949e', fontSize: 20, cursor: 'pointer' }, children: '✕' }),
          ],
        }),
        children,
      ],
    }),
  });
}

// ── ConfirmDialog ──────────────────────────────────────────────────
export function ConfirmDialog({ message, onConfirm, onCancel }) {
  return jsx('div', {
    style: { position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
    children: jsxs('div', {
      style: { background: '#161b22', border: '1px solid rgba(248,81,73,0.4)', borderRadius: 14, padding: '24px', maxWidth: 300, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' },
      children: [
        jsx('div', { style: { fontSize: 30, marginBottom: 10 }, children: '🗑️' }),
        jsx('div', { style: { fontSize: 14, color: '#e6edf3', marginBottom: 20, lineHeight: 1.7, whiteSpace: 'pre-line' }, children: message }),
        jsxs('div', {
          style: { display: 'flex', gap: 10, justifyContent: 'center' },
          children: [
            jsx('button', { onClick: onCancel, style: { background: '#21262d', border: '1px solid #30363d', borderRadius: 8, color: '#8b949e', padding: '8px 18px', fontSize: 13, cursor: 'pointer' }, children: t('cancel') }),
            jsx('button', { onClick: onConfirm, style: { background: '#3d1f1f', border: '1px solid #f8514988', borderRadius: 8, color: '#f85149', padding: '8px 18px', fontSize: 13, cursor: 'pointer', fontWeight: 700 }, children: t('deleteBtn') }),
          ],
        }),
      ],
    }),
  });
}

// ── LinkButton ─────────────────────────────────────────────────────
export function LinkButton({ url, label }) {
  if (!url) return null;
  return jsx('a', {
    href: url, target: '_blank', rel: 'noopener noreferrer', title: label ?? url,
    style: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 5, flexShrink: 0, background: 'rgba(88,166,255,0.12)', color: '#58a6ff', textDecoration: 'none', fontSize: 12, border: '1px solid rgba(88,166,255,0.3)', transition: 'background 0.15s' },
    onMouseEnter: (e) => { e.currentTarget.style.background = 'rgba(88,166,255,0.25)'; },
    onMouseLeave: (e) => { e.currentTarget.style.background = 'rgba(88,166,255,0.12)'; },
    children: '↗',
  });
}
