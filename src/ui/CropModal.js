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
  // inline-block shrinks the wrapper to exactly the image's rendered size
  wrap: css({
    position: 'relative',
    display: 'inline-block',
    lineHeight: 0,
    touchAction: 'none',
    cursor: 'crosshair',
    maxWidth: '100%',
  }),
  img: css({
    display: 'block',
    maxWidth: 'min(88vw, 700px)',
    maxHeight: '60vh',
    objectFit: 'contain',
  }),
  // Canvas pinned to top-left; width/height set via inline style after image loads
  canvas: css({
    position: 'absolute',
    top: 0, left: 0,
    pointerEvents: 'none',
  }),
  actions: css({ display: 'flex', gap: 12, marginTop: 14 }),
};

export function CropModal({ file, onConfirm, onCancel }) {
  const [imageSrc, setImageSrc] = useState(null);
  const [disp, setDisp] = useState({ w: 0, h: 0 }); // rendered px of <img>
  const [nat,  setNat]  = useState({ w: 0, h: 0 }); // natural px
  const [crop, setCrop] = useState(null);            // {x,y,w,h} in disp-space

  const dragRef   = useRef(null);
  const imgRef    = useRef(null);
  const canvasRef = useRef(null);

  // ── Load file ─────────────────────────────────────────────────
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // ── Measure image once rendered ───────────────────────────────
  const onImgLoad = () => {
    const img = imgRef.current;
    const dw = img.offsetWidth;
    const dh = img.offsetHeight;
    setNat({ w: img.naturalWidth, h: img.naturalHeight });
    setDisp({ w: dw, h: dh });
    setCrop({ x: 0, y: 0, w: dw, h: dh });
  };

  // ── Draw overlay whenever crop or disp changes ────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !disp.w || !disp.h) return;

    // Internal resolution = exactly the image's rendered pixel size (1:1 mapping)
    canvas.width  = disp.w;
    canvas.height = disp.h;
    // Explicit CSS size prevents browser from scaling the canvas
    canvas.style.width  = `${disp.w}px`;
    canvas.style.height = `${disp.h}px`;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, disp.w, disp.h);

    // Dim everything
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, disp.w, disp.h);

    if (crop && crop.w > 2 && crop.h > 2) {
      const { x, y, w, h } = crop;
      // Reveal selected area
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
      [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].forEach(([hx, hy]) => {
        ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs);
      });
    }
  }, [crop, disp]);

  // ── Coordinate helper ─────────────────────────────────────────
  // Use imgRef (not wrapRef) so coords are always relative to the
  // actual image pixels, even if the wrapper is slightly larger.
  const getRelXY = useCallback((e) => {
    const rect = imgRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(disp.w, e.clientX - rect.left)),
      y: Math.max(0, Math.min(disp.h, e.clientY - rect.top)),
    };
  }, [disp]);

  const inCrop = useCallback((px, py) => {
    if (!crop) return false;
    return px >= crop.x && px <= crop.x + crop.w &&
           py >= crop.y && py <= crop.y + crop.h;
  }, [crop]);

  // ── Pointer handlers ──────────────────────────────────────────
  const onPointerDown = useCallback((e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = getRelXY(e);
    if (inCrop(x, y)) {
      dragRef.current = { mode: 'move', ox: x, oy: y, cx: crop.x, cy: crop.y };
    } else {
      dragRef.current = { mode: 'draw', ox: x, oy: y };
      setCrop({ x, y, w: 0, h: 0 });
    }
  }, [getRelXY, inCrop, crop]);

  const onPointerMove = useCallback((e) => {
    if (!dragRef.current) return;
    const d = dragRef.current;
    const { x, y } = getRelXY(e);

    if (d.mode === 'draw') {
      const nx = Math.min(d.ox, x);
      const ny = Math.min(d.oy, y);
      const nw = Math.min(Math.abs(x - d.ox), disp.w - nx);
      const nh = Math.min(Math.abs(y - d.oy), disp.h - ny);
      setCrop({ x: nx, y: ny, w: nw, h: nh });
    } else {
      setCrop((prev) => {
        if (!prev) return prev;
        const nx = Math.max(0, Math.min(disp.w - prev.w, d.cx + (x - d.ox)));
        const ny = Math.max(0, Math.min(disp.h - prev.h, d.cy + (y - d.oy)));
        return { ...prev, x: nx, y: ny };
      });
    }
  }, [getRelXY, disp]);

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  // ── Export cropped image ──────────────────────────────────────
  const handleConfirm = () => {
    if (!crop || crop.w < 5 || crop.h < 5) { onCancel(); return; }
    const scaleX = nat.w / disp.w;
    const scaleY = nat.h / disp.h;
    const sx = Math.round(crop.x * scaleX);
    const sy = Math.round(crop.y * scaleY);
    const sw = Math.round(crop.w * scaleX);
    const sh = Math.round(crop.h * scaleY);

    const MAX_PX = 1920;
    const ratio  = Math.min(1, MAX_PX / Math.max(sw, sh));
    const out    = document.createElement('canvas');
    out.width  = Math.round(sw * ratio);
    out.height = Math.round(sh * ratio);
    out.getContext('2d').drawImage(imgRef.current, sx, sy, sw, sh, 0, 0, out.width, out.height);
    onConfirm(out.toDataURL('image/jpeg', 0.85));
  };

  if (!imageSrc) return null;

  return jsx('div', {
    className: s.overlay,
    children: jsxs('div', {
      style: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
      children: [
        jsx('div', { className: s.heading, children: '📐 トリミング範囲を選択' }),
        jsx('div', { className: s.hint,   children: 'ドラッグして範囲を描く ／ 内側をドラッグして移動' }),
        jsxs('div', {
          className: s.wrap,
          onPointerDown, onPointerMove, onPointerUp,
          children: [
            jsx('img', {
              ref: imgRef, src: imageSrc,
              className: s.img,
              onLoad: onImgLoad,
              draggable: false,
            }),
            // Render canvas only after disp is known to avoid 0×0 flash
            disp.w > 0 && jsx('canvas', { ref: canvasRef, className: s.canvas }),
          ],
        }),
        jsxs('div', { className: s.actions, children: [
          jsx('button', { onClick: handleConfirm, className: cx(ss.btn, ss.btnConfirm), children: '✓ 確定' }),
          jsx('button', { onClick: onCancel,      className: ss.btn,                    children: 'キャンセル' }),
        ]}),
      ],
    }),
  });
}
