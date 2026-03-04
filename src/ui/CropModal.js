import { jsx, jsxs } from 'react/jsx-runtime';
import { useState, useEffect, useRef, useCallback } from 'react';
import { css, cx } from '@emotion/css';
import { sharedStyles as ss } from './UI.js';

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
  // Transform toolbar
  toolbar: css({ display: 'flex', gap: 6, marginBottom: 10 }),
  toolBtn: css({
    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 6, color: 'white', padding: '5px 10px', fontSize: 14,
    cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1,
    transition: 'background 0.12s',
    '&:hover': { background: 'rgba(255,255,255,0.2)' },
  }),
  // inline-block shrinks wrapper to exactly image rendered size
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
    maxHeight: '55vh',
    objectFit: 'contain',
  }),
  canvas: css({
    position: 'absolute',
    top: 0, left: 0,
    pointerEvents: 'none',
  }),
  actions: css({ display: 'flex', gap: 12, marginTop: 14 }),
};

export function CropModal({ file, onConfirm, onCancel }) {
  const [imageSrc, setImageSrc] = useState(null);
  const [disp, setDisp] = useState({ w: 0, h: 0 });
  const [nat,  setNat]  = useState({ w: 0, h: 0 });
  const [crop, setCrop] = useState(null);

  // Transform state
  const [flipH, setFlipH]  = useState(false);
  const [flipV, setFlipV]  = useState(false);
  const [rot,   setRot]    = useState(0);   // 0 | 90 | 180 | 270

  const dragRef   = useRef(null);
  const imgRef    = useRef(null);
  const canvasRef = useRef(null);

  // ── Load file ─────────────────────────────────────────────────
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // ── Measure image after render ────────────────────────────────
  const onImgLoad = () => {
    const img = imgRef.current;
    const dw = img.offsetWidth, dh = img.offsetHeight;
    setNat({ w: img.naturalWidth, h: img.naturalHeight });
    setDisp({ w: dw, h: dh });
    setCrop({ x: 0, y: 0, w: dw, h: dh });
  };

  // Re-measure when rotation changes (90°/270° swaps displayed width/height)
  useEffect(() => {
    if (!imgRef.current || !disp.w) return;
    const img = imgRef.current;
    const dw = img.offsetWidth, dh = img.offsetHeight;
    setDisp({ w: dw, h: dh });
    setCrop({ x: 0, y: 0, w: dw, h: dh });
  }, [rot]);

  // ── CSS transform string for the preview image ────────────────
  const transform = [
    rot  ? `rotate(${rot}deg)` : '',
    flipH ? 'scaleX(-1)' : '',
    flipV ? 'scaleY(-1)' : '',
  ].filter(Boolean).join(' ') || 'none';

  // For 90°/270° rotations the image's visual width/height are swapped;
  // we need to constrain the *other* axis so it still fits in the box.
  const swapped = rot === 90 || rot === 270;

  // ── Draw overlay ──────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !disp.w || !disp.h) return;
    canvas.width  = disp.w;
    canvas.height = disp.h;
    canvas.style.width  = `${disp.w}px`;
    canvas.style.height = `${disp.h}px`;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, disp.w, disp.h);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, disp.w, disp.h);

    if (crop && crop.w > 2 && crop.h > 2) {
      const { x, y, w, h } = crop;
      ctx.clearRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5);
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 0.5;
      for (let i = 1; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(x + w * i / 3, y); ctx.lineTo(x + w * i / 3, y + h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, y + h * i / 3); ctx.lineTo(x + w, y + h * i / 3); ctx.stroke();
      }
      const hs = 8;
      ctx.fillStyle = 'white';
      [[x,y],[x+w,y],[x,y+h],[x+w,y+h]].forEach(([hx,hy]) =>
        ctx.fillRect(hx - hs/2, hy - hs/2, hs, hs));
    }
  }, [crop, disp]);

  // ── Coordinate helper (relative to <img> element) ─────────────
  const getRelXY = useCallback((e) => {
    const rect = imgRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(disp.w, e.clientX - rect.left)),
      y: Math.max(0, Math.min(disp.h, e.clientY - rect.top)),
    };
  }, [disp]);

  const inCrop = useCallback((px, py) =>
    !!crop && px >= crop.x && px <= crop.x + crop.w &&
              py >= crop.y && py <= crop.y + crop.h
  , [crop]);

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
      const nx = Math.min(d.ox, x), ny = Math.min(d.oy, y);
      setCrop({ x: nx, y: ny,
        w: Math.min(Math.abs(x - d.ox), disp.w - nx),
        h: Math.min(Math.abs(y - d.oy), disp.h - ny) });
    } else {
      setCrop((prev) => {
        if (!prev) return prev;
        return { ...prev,
          x: Math.max(0, Math.min(disp.w - prev.w, d.cx + (x - d.ox))),
          y: Math.max(0, Math.min(disp.h - prev.h, d.cy + (y - d.oy))) };
      });
    }
  }, [getRelXY, disp]);

  const onPointerUp = useCallback(() => { dragRef.current = null; }, []);

  // ── Transform buttons ─────────────────────────────────────────
  const rotateCW  = () => { setRot((r) => (r + 90)  % 360); };
  const rotateCCW = () => { setRot((r) => (r + 270) % 360); };

  // ── Export ────────────────────────────────────────────────────
  // We draw the original image onto an offscreen canvas applying all
  // transforms, then crop the requested region from that result.
  const handleConfirm = () => {
    if (!crop || crop.w < 5 || crop.h < 5) { onCancel(); return; }

    const img = imgRef.current;
    const nw = img.naturalWidth, nh = img.naturalHeight;

    // 1. Build a "transformed" canvas of the full image
    const swapped90 = rot === 90 || rot === 270;
    const tW = swapped90 ? nh : nw;
    const tH = swapped90 ? nw : nh;
    const tCanvas = document.createElement('canvas');
    tCanvas.width  = tW;
    tCanvas.height = tH;
    const tCtx = tCanvas.getContext('2d');
    tCtx.save();
    tCtx.translate(tW / 2, tH / 2);
    if (rot)   tCtx.rotate(rot * Math.PI / 180);
    if (flipH) tCtx.scale(-1, 1);
    if (flipV) tCtx.scale(1, -1);
    tCtx.drawImage(img, -nw / 2, -nh / 2, nw, nh);
    tCtx.restore();

    // 2. Map crop rect (in disp-space) to tCanvas-space
    const scaleX = tW / disp.w;
    const scaleY = tH / disp.h;
    const sx = Math.round(crop.x * scaleX);
    const sy = Math.round(crop.y * scaleY);
    const sw = Math.round(crop.w * scaleX);
    const sh = Math.round(crop.h * scaleY);

    // 3. Write final cropped + resized output
    const MAX_PX = 1920;
    const ratio  = Math.min(1, MAX_PX / Math.max(sw, sh));
    const out    = document.createElement('canvas');
    out.width  = Math.round(sw * ratio);
    out.height = Math.round(sh * ratio);
    out.getContext('2d').drawImage(tCanvas, sx, sy, sw, sh, 0, 0, out.width, out.height);
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

        // ── Transform toolbar ─────────────────────────────────
        jsxs('div', { className: s.toolbar, children: [
          jsx('button', { className: s.toolBtn, onClick: () => setFlipH((v) => !v), title: '左右反転',       children: '↔' }),
          jsx('button', { className: s.toolBtn, onClick: () => setFlipV((v) => !v), title: '上下反転',       children: '↕' }),
          jsx('button', { className: s.toolBtn, onClick: rotateCCW,                 title: '反時計回りに回転', children: '↺' }),
          jsx('button', { className: s.toolBtn, onClick: rotateCW,                  title: '時計回りに回転',  children: '↻' }),
        ]}),

        // ── Image + canvas overlay ────────────────────────────
        jsxs('div', {
          className: s.wrap,
          onPointerDown, onPointerMove, onPointerUp,
          children: [
            jsx('img', {
              ref: imgRef, src: imageSrc,
              className: s.img,
              onLoad: onImgLoad,
              draggable: false,
              style: {
                transform,
                // For 90°/270° the rotated image overflows its box unless we
                // constrain the short axis. We swap maxWidth/maxHeight so the
                // browser re-lays out and offsetWidth/Height reflect the visual size.
                maxWidth:  swapped ? 'min(55vh, 700px)' : 'min(88vw, 700px)',
                maxHeight: swapped ? 'min(88vw, 700px)' : '55vh',
              },
            }),
            disp.w > 0 && jsx('canvas', { ref: canvasRef, className: s.canvas }),
          ],
        }),

        // ── Action buttons ────────────────────────────────────
        jsxs('div', { className: s.actions, children: [
          jsx('button', { onClick: handleConfirm, className: cx(ss.btn, ss.btnConfirm), children: '✓ 確定' }),
          jsx('button', { onClick: onCancel,      className: ss.btn,                    children: 'キャンセル' }),
        ]}),
      ],
    }),
  });
}
