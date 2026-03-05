import { j as jsxRuntimeExports } from "../_virtual/jsx-runtime.js";
import { useState, useRef, useEffect, useCallback } from "react";
import { cx } from "../util/cx.js";
import { t } from "../util/i18n.js";
import s from "./CropModal.module.css.js";
import shared from "./shared.module.css.js";
const MAX_DISPLAY = 700;
function CropModal({ file, onConfirm, onCancel }) {
  const [transformedBitmap, setTransformedBitmap] = useState(null);
  const [dispSize, setDispSize] = useState({ w: 0, h: 0 });
  const [crop, setCrop] = useState(null);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [rot, setRot] = useState(0);
  const [opacity, setOpacity] = useState(0.5);
  const rawImgRef = useRef(null);
  const cropCanvasRef = useRef(null);
  const dragRef = useRef(null);
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
  const rebuildBitmap = useCallback((imgEl, fH, fV, r) => {
    const nw = imgEl.naturalWidth, nh = imgEl.naturalHeight;
    const swapped = r === 90 || r === 270;
    const bw = swapped ? nh : nw, bh = swapped ? nw : nh;
    const tmp = document.createElement("canvas");
    tmp.width = bw;
    tmp.height = bh;
    const ctx = tmp.getContext("2d");
    ctx.save();
    ctx.translate(bw / 2, bh / 2);
    if (r) ctx.rotate(r * Math.PI / 180);
    if (fH) ctx.scale(-1, 1);
    if (fV) ctx.scale(1, -1);
    ctx.drawImage(imgEl, -nw / 2, -nh / 2, nw, nh);
    ctx.restore();
    createImageBitmap(tmp).then((bmp) => {
      setTransformedBitmap(bmp);
      const maxW = Math.min(MAX_DISPLAY, window.innerWidth * 0.88);
      const maxH = window.innerHeight * 0.55;
      const scale = Math.min(1, maxW / bw, maxH / bh);
      const dw = Math.floor(bw * scale), dh = Math.floor(bh * scale);
      setDispSize({ w: dw, h: dh });
      setCrop({ x: 0, y: 0, w: dw, h: dh });
    });
  }, []);
  useEffect(() => {
    if (rawImgRef.current) rebuildBitmap(rawImgRef.current, flipH, flipV, rot);
  }, [flipH, flipV, rot, rebuildBitmap]);
  useEffect(() => {
    const canvas = cropCanvasRef.current;
    if (!canvas || !transformedBitmap || !dispSize.w) return;
    canvas.width = dispSize.w;
    canvas.height = dispSize.h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(transformedBitmap, 0, 0, dispSize.w, dispSize.h);
    ctx.fillStyle = "rgba(0,0,0,0.52)";
    ctx.fillRect(0, 0, dispSize.w, dispSize.h);
    if (crop && crop.w > 2 && crop.h > 2) {
      const { x, y, w, h } = crop;
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillRect(x, y, w, h);
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      ctx.drawImage(transformedBitmap, 0, 0, dispSize.w, dispSize.h);
      ctx.restore();
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5);
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.lineWidth = 0.5;
      for (let i = 1; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(x + w * i / 3, y);
        ctx.lineTo(x + w * i / 3, y + h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y + h * i / 3);
        ctx.lineTo(x + w, y + h * i / 3);
        ctx.stroke();
      }
      const hs = 8;
      ctx.fillStyle = "white";
      [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].forEach(([hx, hy]) => ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs));
      const cx2 = x + w / 2, cy2 = y + h / 2;
      ctx.fillStyle = "rgba(255,255,255,0.65)";
      ctx.beginPath();
      ctx.arc(cx2, cy2, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("✥", cx2, cy2);
    }
  }, [transformedBitmap, dispSize, crop]);
  const getRelXY = useCallback((e) => {
    const canvas = cropCanvasRef.current, rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
    return {
      x: Math.max(0, Math.min(dispSize.w, (e.clientX - rect.left) * scaleX)),
      y: Math.max(0, Math.min(dispSize.h, (e.clientY - rect.top) * scaleY))
    };
  }, [dispSize]);
  const inMoveHandle = useCallback((px, py) => {
    if (!crop || crop.w < 10 || crop.h < 10) return false;
    return Math.hypot(px - (crop.x + crop.w / 2), py - (crop.y + crop.h / 2)) <= 14;
  }, [crop]);
  const onPointerDown = useCallback((e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = getRelXY(e);
    if (inMoveHandle(x, y)) {
      dragRef.current = { mode: "move", ox: x, oy: y, cx: crop.x, cy: crop.y };
    } else {
      dragRef.current = { mode: "draw", ox: x, oy: y };
      setCrop({ x, y, w: 0, h: 0 });
    }
  }, [getRelXY, inMoveHandle, crop]);
  const onPointerMove = useCallback((e) => {
    if (!dragRef.current) return;
    const d = dragRef.current, { x, y } = getRelXY(e);
    if (d.mode === "draw") {
      const nx = Math.min(d.ox, x), ny = Math.min(d.oy, y);
      setCrop({ x: nx, y: ny, w: Math.min(Math.abs(x - d.ox), dispSize.w - nx), h: Math.min(Math.abs(y - d.oy), dispSize.h - ny) });
    } else {
      setCrop((prev) => prev ? { ...prev, x: Math.max(0, Math.min(dispSize.w - prev.w, d.cx + (x - d.ox))), y: Math.max(0, Math.min(dispSize.h - prev.h, d.cy + (y - d.oy))) } : prev);
    }
  }, [getRelXY, dispSize]);
  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);
  const onPointerMoveForCursor = useCallback((e) => {
    const canvas = cropCanvasRef.current;
    if (!canvas) return;
    const { x, y } = getRelXY(e);
    canvas.style.cursor = inMoveHandle(x, y) ? "move" : "crosshair";
    onPointerMove(e);
  }, [getRelXY, inMoveHandle, onPointerMove]);
  const handleConfirm = () => {
    if (!crop || crop.w < 5 || crop.h < 5 || !transformedBitmap) {
      onCancel();
      return;
    }
    const scaleX = transformedBitmap.width / dispSize.w, scaleY = transformedBitmap.height / dispSize.h;
    const sx = Math.round(crop.x * scaleX), sy = Math.round(crop.y * scaleY);
    const sw = Math.round(crop.w * scaleX), sh = Math.round(crop.h * scaleY);
    const ratio = Math.min(1, 1920 / Math.max(sw, sh));
    const out = document.createElement("canvas");
    out.width = Math.round(sw * ratio);
    out.height = Math.round(sh * ratio);
    out.getContext("2d").drawImage(transformedBitmap, sx, sy, sw, sh, 0, 0, out.width, out.height);
    onConfirm(out.toDataURL("image/jpeg", 0.85), opacity);
  };
  const loading = !transformedBitmap || !dispSize.w;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: s.overlay, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: s.heading, children: t("crop.title") }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: s.hint, children: t("crop.hint") }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: s.toolbar, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: s.toolBtn, onClick: () => setFlipH((v) => !v), title: t("crop.flipH"), children: "↔" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: s.toolBtn, onClick: () => setFlipV((v) => !v), title: t("crop.flipV"), children: "↕" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: s.toolBtn, onClick: () => setRot((r) => (r + 270) % 360), title: t("crop.rotateCCW"), children: "↺" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: s.toolBtn, onClick: () => setRot((r) => (r + 90) % 360), title: t("crop.rotateCW"), children: "↻" })
    ] }),
    loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { color: "rgba(255,255,255,0.5)", fontSize: 13 }, children: t("crop.loading") }) : /* @__PURE__ */ jsxRuntimeExports.jsx("canvas", { ref: cropCanvasRef, className: s.cropCanvas, onPointerDown, onPointerMove: onPointerMoveForCursor, onPointerUp }),
    dispSize.w > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: s.sliderWrap, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: s.sliderLabel, children: t("crop.opacity") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "range", min: 0, max: 1, step: 0.05, value: opacity, onChange: (e) => setOpacity(parseFloat(e.target.value)), className: s.slider }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: s.sliderValue, children: opacity.toFixed(2) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: s.actions, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: handleConfirm, className: cx(shared.btn, shared.btnConfirm), children: t("crop.confirm") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onCancel, className: shared.btn, children: t("cancel") })
    ] })
  ] });
}
export {
  CropModal
};
