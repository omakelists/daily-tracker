import { j as jsxRuntimeExports } from "../_virtual/jsx-runtime.js";
import { useState } from "react";
import { cx } from "../util/cx.js";
import { t } from "../util/i18n.js";
import s from "./UI.module.css.js";
import shared from "./shared.module.css.js";
function Row({ preSlot, barSlot, checkbox, content, meta, rightSlot, bg, borderBottom, className, style, onClick }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: cx(shared.row, className),
      style: { background: bg ?? "transparent", borderBottom: borderBottom ?? "none", ...style },
      onClick,
      children: [
        preSlot != null && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: shared.preSlot, children: preSlot }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: shared.barSlot, children: barSlot }),
        checkbox != null && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { flexShrink: 0, display: "flex" }, onClick: (e) => e.stopPropagation(), children: checkbox }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: shared.content, children: content }),
        meta && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: shared.meta, children: meta }),
        rightSlot && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: shared.right, children: rightSlot })
      ]
    }
  );
}
function PrevBar({ show, checked, partial }) {
  if (!show) return null;
  const color = checked ? "var(--prev-done)" : partial ? "var(--prev-partial)" : "var(--prev-miss)";
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { title: t("prevTip"), className: s.prevbarWrap, children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: {
    width: "var(--bar-w)",
    height: 18,
    borderRadius: 2,
    background: color,
    boxShadow: checked ? `0 0 0 1.5px rgba(0,0,0,0.85), 0 0 5px ${color}88` : "0 0 0 1.5px rgba(0,0,0,0.85)"
  } }) });
}
function Modal({ title, titleExtra, onClose, children }) {
  const [closing, setClosing] = useState(false);
  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 170);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cx(s.overlay, closing && s.overlayClosing), onClick: (e) => {
    if (e.target === e.currentTarget) handleClose();
  }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cx(s.box, closing && s.boxClosing), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: s.modalHeader, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: s.modalTitleGroup, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: s.modalTitle, children: title }),
        titleExtra
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: handleClose, className: s.modalClose, children: "✕" })
    ] }),
    children
  ] }) });
}
function ConfirmDialog({ message, onConfirm, onCancel, confirmLabel }) {
  const [closing, setClosing] = useState(false);
  const dismiss = (fn) => () => {
    setClosing(true);
    setTimeout(fn, 140);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cx(s.confirmOverlay, closing && s.confirmOverlayClosing), children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cx(s.confirmBox, closing && s.confirmBoxClosing), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: s.confirmIcon, children: "🗑️" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: s.confirmMsg, children: message }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: s.confirmActions, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: dismiss(onCancel), className: shared.btn, children: t("cancel") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: dismiss(onConfirm), className: cx(shared.btn, shared.btnDanger), children: confirmLabel ?? t("deleteBtn") })
    ] })
  ] }) });
}
export {
  ConfirmDialog,
  Modal,
  PrevBar,
  Row
};
