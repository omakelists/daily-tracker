import { useState, useEffect, useRef, useCallback } from 'react';
import { css, cx } from '@emotion/css';
import { sharedStyles as ss } from './UI';
import { t } from '../util/i18n';

const s = {
  overlay: css({
    position: 'fixed', inset: 0, zIndex: 600,
    background: 'rgba(0,0,0,0.92)',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: 20, gap: 10, overflowY: 'auto',
  }),
  heading: css({ color: 'white', fontSize: 14, fontWeight: 700, textAlign: 'center' }),
  hint:    css({ color: 'rgba(255,255,255,0.45)', fontSize: 11, textAlign: 'center' }),
  toolbar: css({ display: 'flex', gap: 6 }),
  toolBtn: css({
    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 6, color: 'white', padding: '5px 12px', fontSize: 16,
    cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1,
    transition: 'background 0.12s',
    '&:hover': { background: 'rgba(255,255,255,0.22)' },
  }),
  cropCanvas: css({
    display: 'block', cursor: 'crosshair', touchAction: 'none',
    maxWidth: 'min(88vw, 700px)', maxHeight: '55vh',
  }),
  actions:     css({ display: 'flex', gap: 12 }),
  sliderWrap:  css({ display: 'flex', alignItems: 'center', gap: 10, width: '100%', maxWidth: 'min(88vw, 700px)' }),
  sliderLabel: css({ color: 'rgba(255,255,255,0.6)', fontSize: 11, whiteSpace: 'nowrap' }),
  sliderValue: css({ color: 'white', fontSize: 11, fontFamily: 'monospace', width: 30, textAlign: 'right', flexShrink: 0 }),
  slider:      css({ flex: 1, cursor: 'pointer', accentColor: 'var(--link)' }),
};

const MAX_DISPLAY = 700;

export function CropModal({ file, onConfirm, onCancel }) {
  const [transformedBitmap, setTransformedBitmap] = useState(null);
  const [dispSize, setDispSize] = useState({ w: 0, h: 0 });
  const [crop,    setCrop]    = useState(null);
  const [flipH,   setFlipH]   = useState(false);
  const [flipV,   setFlipV]   = useState(false);
  const [rot,     setRot]     = useState(0);
  const [opacity, setOpacity] = useState(0.5);

  const rawImgRef     = useRef(null);
  const cropCanvasRef = useRef(null);
  const dragRef       = useRef(null);

  // ── 1. Load file ──────────────────────────────────────────────
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      rawImgRef.current = img;
      URL.revokeObjectURL(url);
      rebuildBitmap(img, false, false, 0);
    };
    img.src = url;
  }, [file]);

  // ── 2. Rebuild transformed bitmap ────────────────────────────
  const rebuildBitmap = useCallback((imgEl, fH, fV, r) => {
    const nw = imgEl.naturalWidth, nh = imgEl.naturalHeight;
    const swapped = r === 90 || r === 270;
    const bw = swapped ? nh : nw;
    const bh = swapped ? nw : nh;

    const tmp = document.createElement('canvas');
    tmp.width = bw; tmp.height = bh;
    const ctx = tmp.getContext('2d');
    ctx.save();
    ctx.translate(bw / 2, bh / 2);
    if (r)  ctx.rotate(r * Math.PI / 180);
    if (fH) ctx.scale(-1, 1);
    if (fV) ctx.scale(1, -1);
    ctx.drawImage(imgEl, -nw / 2, -nh / 2, nw, nh);
    ctx.restore();

    createImageBitmap(tmp).then((bmp) => {
      setTransformedBitmap(bmp);
      const maxW  = Math.min(MAX_DISPLAY, window.innerWidth * 0.88);
      const maxH  = window.innerHeight * 0.55;
      const scale = Math.min(1, maxW / bw, maxH / bh);
      const dw    = Math.floor(bw * scale);
      const dh    = Math.floor(bh * scale);
      setDispSize({ w: dw, h: dh });
      setCrop({ x: 0, y: 0, w: dw, h: dh });
    });
  }, []);

  useEffect(() => {
    if (rawImgRef.current) rebuildBitmap(rawImgRef.current, flipH, flipV, rot);
  }, [flipH, flipV, rot, rebuildBitmap]);

  // ── 3. Paint canvas ───────────────────────────────────────────
  useEffect(() => {
    const canvas = cropCanvasRef.current;
    if (!canvas || !transformedBitmap || !dispSize.w) return;

    canvas.width  = dispSize.w;
    canvas.height = dispSize.h;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(transformedBitmap, 0, 0, dispSize.w, dispSize.h);
    ctx.fillStyle = 'rgba(0,0,0,0.52)';
    ctx.fillRect(0, 0, dispSize.w, dispSize.h);

    if (crop && crop.w > 2 && crop.h > 2) {
      const { x, y, w, h } = crop;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillRect(x, y, w, h);
      ctx.restore();
      ctx.save();
      ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      ctx.drawImage(transformedBitmap, 0, 0, dispSize.w, dispSize.h);
      ctx.restore();

      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5);

      ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 0.5;
      for (let i = 1; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(x + w*i/3, y); ctx.lineTo(x + w*i/3, y+h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, y + h*i/3); ctx.lineTo(x+w, y + h*i/3); ctx.stroke();
      }

      const hs = 8;
      ctx.fillStyle = 'white';
      [[x,y],[x+w,y],[x,y+h],[x+w,y+h]].forEach(([hx,hy]) => ctx.fillRect(hx - hs/2, hy - hs/2, hs, hs));

      const cx2 = x + w/2, cy2 = y + h/2;
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.beginPath(); ctx.arc(cx2, cy2, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('✥', cx2, cy2);
    }
  }, [transformedBitmap, dispSize, crop]);

  // ── 4. Pointer helpers ────────────────────────────────────────
  const getRelXY = useCallback((e) => {
    const canvas = cropCanvasRef.current;
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: Math.max(0, Math.min(dispSize.w, (e.clientX - rect.left) * scaleX)),
      y: Math.max(0, Math.min(dispSize.h, (e.clientY - rect.top)  * scaleY)),
    };
  }, [dispSize]);

  const inMoveHandle = useCallback((px, py) => {
    if (!crop || crop.w < 10 || crop.h < 10) return false;
    const cx2 = crop.x + crop.w / 2, cy2 = crop.y + crop.h / 2;
    return Math.hypot(px - cx2, py - cy2) <= 14;
  }, [crop]);

  // ── 5. Pointer handlers ───────────────────────────────────────
  const onPointerDown = useCallback((e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = getRelXY(e);
    if (inMoveHandle(x, y)) {
      dragRef.current = { mode: 'move', ox: x, oy: y, cx: crop.x, cy: crop.y };
    } else {
      dragRef.current = { mode: 'draw', ox: x, oy: y };
      setCrop({ x, y, w: 0, h: 0 });
    }
  }, [getRelXY, inMoveHandle, crop]);

  const onPointerMove = useCallback((e) => {
    if (!dragRef.current) return;
    const d = dragRef.current;
    const { x, y } = getRelXY(e);
    if (d.mode === 'draw') {
      const nx = Math.min(d.ox, x), ny = Math.min(d.oy, y);
      setCrop({ x: nx, y: ny, w: Math.min(Math.abs(x - d.ox), dispSize.w - nx), h: Math.min(Math.abs(y - d.oy), dispSize.h - ny) });
    } else {
      setCrop((prev) => {
        if (!prev) return prev;
        return { ...prev, x: Math.max(0, Math.min(dispSize.w - prev.w, d.cx + (x - d.ox))), y: Math.max(0, Math.min(dispSize.h - prev.h, d.cy + (y - d.oy))) };
      });
    }
  }, [getRelXY, dispSize]);

  const onPointerUp = useCallback(() => { dragRef.current = null; }, []);

  const onPointerMoveForCursor = useCallback((e) => {
    const canvas = cropCanvasRef.current;
    if (!canvas) return;
    const { x, y } = getRelXY(e);
    canvas.style.cursor = inMoveHandle(x, y) ? 'move' : 'crosshair';
    onPointerMove(e);
  }, [getRelXY, inMoveHandle, onPointerMove]);

  // ── 6. Export ─────────────────────────────────────────────────
  const handleConfirm = () => {
    if (!crop || crop.w < 5 || crop.h < 5 || !transformedBitmap) { onCancel(); return; }
    const scaleX = transformedBitmap.width  / dispSize.w;
    const scaleY = transformedBitmap.height / dispSize.h;
    const sx = Math.round(crop.x * scaleX), sy = Math.round(crop.y * scaleY);
    const sw = Math.round(crop.w * scaleX), sh = Math.round(crop.h * scaleY);
    const MAX_PX = 1920;
    const ratio  = Math.min(1, MAX_PX / Math.max(sw, sh));
    const out    = document.createElement('canvas');
    out.width  = Math.round(sw * ratio);
    out.height = Math.round(sh * ratio);
    out.getContext('2d').drawImage(transformedBitmap, sx, sy, sw, sh, 0, 0, out.width, out.height);
    onConfirm(out.toDataURL('image/jpeg', 0.85), opacity);
  };

  const loading = !transformedBitmap || !dispSize.w;

  return (
    <div className={s.overlay}>
      <div className={s.heading}>{t('crop.title')}</div>
      <div className={s.hint}>{t('crop.hint')}</div>

      <div className={s.toolbar}>
        <button className={s.toolBtn} onClick={() => setFlipH((v) => !v)} title={t('crop.flipH')}>↔</button>
        <button className={s.toolBtn} onClick={() => setFlipV((v) => !v)} title={t('crop.flipV')}>↕</button>
        <button className={s.toolBtn} onClick={() => setRot((r) => (r + 270) % 360)} title={t('crop.rotateCCW')}>↺</button>
        <button className={s.toolBtn} onClick={() => setRot((r) => (r + 90)  % 360)} title={t('crop.rotateCW')}>↻</button>
      </div>

      {loading
        ? <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{t('crop.loading')}</div>
        : <canvas ref={cropCanvasRef} className={s.cropCanvas} onPointerDown={onPointerDown} onPointerMove={onPointerMoveForCursor} onPointerUp={onPointerUp} />
      }

      {dispSize.w > 0 && (
        <div className={s.sliderWrap}>
          <span className={s.sliderLabel}>{t('crop.opacity')}</span>
          <input type="range" min={0} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(parseFloat(e.target.value))} className={s.slider} />
          <span className={s.sliderValue}>{opacity.toFixed(2)}</span>
        </div>
      )}

      <div className={s.actions}>
        <button onClick={handleConfirm} className={cx(ss.btn, ss.btnConfirm)}>{t('crop.confirm')}</button>
        <button onClick={onCancel}      className={ss.btn}>{t('cancel')}</button>
      </div>
    </div>
  );
}
