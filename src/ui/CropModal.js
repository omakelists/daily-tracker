import { jsx, jsxs } from 'react/jsx-runtime';
import { useState, useEffect, useRef, useCallback } from 'react';
import { css, cx } from '@emotion/css';
import { sharedStyles as ss } from './UI.js';

// ── Styles ────────────────────────────────────────────────────────
const s = {
  overlay: css({
    position: 'fixed', inset: 0, zIndex: 600,
    background: 'rgba(0,0,0,0.92)',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: 20,
  }),
  heading: css({ color: 'white', fontSize: 14, fontWeight: 700, marginBottom: 10, textAlign: 'center' }),
  hint:    css({ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginBottom: 10, textAlign: 'center' }),
  wrap: css({
    position: 'relative',
    lineHeight: 0,
    touchAction: 'none',
    userSelect: 'none',
    cursor: 'crosshair',
    maxWidth: '100%',
  }),
  img: css({ display: 'block', maxWidth: 'min(88vw, 700px)', maxHeight: '60vh', objectFit: 'contain' }),
  canvas: css({ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }),
  actions: css({ display: 'flex', gap: 12, marginTop: 14 }),
};

/**
 * CropModal
 * @param {File}     file       – image file to crop
 * @param {function} onConfirm  – called with dataUrl of cropped image
 * @param {function} onCancel
 */
export function CropModal({ file, onConfirm, onCancel }) {
  const [imageSrc, setImageSrc] = useState(null);
  const [disp,     setDisp]     = useState({ w: 0, h: 0 });  // displayed px
  const [nat,      setNat]      = useState({ w: 0, h: 0 });  // natural px
  const [crop,     setCrop]     = useState(null);             // {x,y,w,h} in display px
  const dragRef  = useRef(null);  // { mode:'draw'|'move', ox, oy, cx, cy }
  const imgRef   = useRef(null);
  const canvasRef = useRef(null);
  const wrapRef  = useRef(null);

  // Load file as object-URL
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onImgLoad = () => {
    const img = imgRef.current;
    const dw = img.offsetWidth, dh = img.offsetHeight;
    setNat({ w: img.naturalWidth, h: img.naturalHeight });
    setDisp({ w: dw, h: dh });
    setCrop({ x: 0, y: 0, w: dw, h: dh });
  };

  // Draw crop overlay on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !disp.w) return;
    canvas.width  = disp.w;
    canvas.height = disp.h;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, disp.w, disp.h);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, disp.w, disp.h);

    if (crop && crop.w > 2 && crop.h > 2) {
      const { x, y, w, h } = crop;
      ctx.clearRect(x, y, w, h);

      // Border
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5);

      // Rule-of-thirds grid
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 0.5;
      for (let i = 1; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(x + w * i / 3, y); ctx.lineTo(x + w * i / 3, y + h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, y + h * i / 3); ctx.lineTo(x + w, y + h * i / 3); ctx.stroke();
      }

      // Corner handles
      const hs = 8;
      ctx.fillStyle = 'white';
      [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].forEach(([cx2, cy2]) => {
        ctx.fillRect(cx2 - hs / 2, cy2 - hs / 2, hs, hs);
      });
    }
  }, [crop, disp]);

  // ── Pointer helpers ───────────────────────────────────────────
  const getRelXY = useCallback((e) => {
    const rect = wrapRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(disp.w, e.clientX - rect.left)),
      y: Math.max(0, Math.min(disp.h, e.clientY - rect.top)),
    };
  }, [disp]);

  const inCrop = (px, py) => {
    if (!crop) return false;
    return px >= crop.x && px <= crop.x + crop.w && py >= crop.y && py <= crop.y + crop.h;
  };

  const onPointerDown = useCallback((e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = getRelXY(e);
    if (crop && inCrop(x, y)) {
      dragRef.current = { mode: 'move', ox: x, oy: y, cx: crop.x, cy: crop.y };
    } else {
      dragRef.current = { mode: 'draw', ox: x, oy: y };
      setCrop({ x, y, w: 0, h: 0 });
    }
  }, [crop, getRelXY]);

  const onPointerMove = useCallback((e) => {
    if (!dragRef.current) return;
    const { x, y } = getRelXY(e);
    const d = dragRef.current;

    if (d.mode === 'draw') {
      const nx = Math.min(d.ox, x), ny = Math.min(d.oy, y);
      const nw = Math.abs(x - d.ox),  nh = Math.abs(y - d.oy);
      setCrop({ x: nx, y: ny, w: Math.min(nw, disp.w - nx), h: Math.min(nh, disp.h - ny) });
    } else {
      const nx = Math.max(0, Math.min(disp.w - crop.w, d.cx + (x - d.ox)));
      const ny = Math.max(0, Math.min(disp.h - crop.h, d.cy + (y - d.oy)));
      setCrop((prev) => ({ ...prev, x: nx, y: ny }));
    }
  }, [crop, disp, getRelXY]);

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  // ── Export crop ───────────────────────────────────────────────
  const handleConfirm = () => {
    if (!crop || crop.w < 5 || crop.h < 5) { onCancel(); return; }
    const scaleX = nat.w / disp.w, scaleY = nat.h / disp.h;
    const sw = Math.round(crop.w * scaleX), sh = Math.round(crop.h * scaleY);
    const sx = Math.round(crop.x * scaleX), sy = Math.round(crop.y * scaleY);

    // Limit output to 1920px max dimension to keep storage reasonable
    const MAX_PX = 1920;
    const ratio  = Math.min(1, MAX_PX / Math.max(sw, sh));
    const canvas = document.createElement('canvas');
    canvas.width  = Math.round(sw * ratio);
    canvas.height = Math.round(sh * ratio);
    canvas.getContext('2d').drawImage(imgRef.current, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    onConfirm(canvas.toDataURL('image/jpeg', 0.85));
  };

  if (!imageSrc) return null;

  return jsx('div', {
    className: s.overlay,
    children: jsxs('div', { children: [
      jsx('div', { className: s.heading, children: '📐 トリミング範囲を選択' }),
      jsx('div', { className: s.hint, children: 'ドラッグして範囲を描く ／ 内側をドラッグして移動' }),
      jsxs('div', {
        ref: wrapRef,
        className: s.wrap,
        onPointerDown, onPointerMove, onPointerUp,
        children: [
          jsx('img', { ref: imgRef, src: imageSrc, className: s.img, onLoad: onImgLoad, draggable: false }),
          jsx('canvas', { ref: canvasRef, className: s.canvas }),
        ],
      }),
      jsxs('div', { className: s.actions, children: [
        jsx('button', { onClick: handleConfirm, className: cx(ss.btn, ss.btnConfirm), children: '✓ 確定' }),
        jsx('button', { onClick: onCancel,      className: ss.btn,                   children: 'キャンセル' }),
      ]}),
    ]}),
  });
}
