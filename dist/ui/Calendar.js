import { j as jsxRuntimeExports } from "../_virtual/jsx-runtime.js";
import { useState, useEffect } from "react";
import { ta, t } from "../util/i18n.js";
import { DAILY_TYPES, getDaysInMonth, fmtDate } from "../constants.js";
import { checkKey } from "../util/helpers.js";
import { Modal } from "./UI.js";
import s from "./Calendar.module.css.js";
import shared from "./shared.module.css.js";
function CalendarModal({ games, checks, now, onClose }) {
  var _a;
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth());
  const [selGame, setSelGame] = useState(((_a = games[0]) == null ? void 0 : _a.id) ?? null);
  const [selTask, setSelTask] = useState(null);
  const game = games.find((g) => g.id === selGame);
  const rawTasks = (game == null ? void 0 : game.tasks) ?? [];
  const dailyTasks = rawTasks.length ? rawTasks.filter((tk) => DAILY_TYPES.has(tk.type)) : [{ id: `${game == null ? void 0 : game.id}_solo`, type: "daily", name: "" }];
  useEffect(() => {
    setSelTask(null);
  }, [selGame]);
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const today = fmtDate(now);
  const getStatus = (dk) => {
    if (!game) return "none";
    const tt = selTask ? dailyTasks.filter((tk) => tk.id === selTask) : dailyTasks;
    if (!tt.length) return "none";
    const done = tt.filter((tk) => !!checks[checkKey(tk.id, dk)]).length;
    if (done === 0) return "none";
    if (done === tt.length) return "all";
    return "partial";
  };
  const nav = (delta) => {
    const d = new Date(Date.UTC(year, month + delta, 1));
    setYear(d.getUTCFullYear());
    setMonth(d.getUTCMonth());
  };
  const dayNames = ta("dayNames");
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Modal, { title: `📅 ${t("record")}`, onClose, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: s.filters, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: selGame ?? "", onChange: (e) => setSelGame(e.target.value), className: shared.inputCls, style: { flex: 1, minWidth: 120 }, children: games.map((g) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: g.id, children: g.name }, g.id)) }),
      dailyTasks.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: selTask ?? "", onChange: (e) => setSelTask(e.target.value || null), className: shared.inputCls, style: { flex: 1, minWidth: 100 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: t("taskAll") }),
        dailyTasks.map((tk) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: tk.id, children: tk.name.trim() || t(`types.${tk.type}`) }, tk.id))
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: s.header, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => nav(-1), className: shared.btn, children: "‹" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: s.month, children: new Date(Date.UTC(year, month, 1)).toLocaleDateString([], { year: "numeric", month: "long" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => nav(1), className: shared.btn, children: "›" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: s.grid, children: [
      dayNames.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: s.dayName, children: d }, d)),
      Array.from({ length: firstDay }, (_, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", {}, `e${i}`)),
      Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const dk = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const st = getStatus(dk);
        return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: s.day, style: {
          fontWeight: dk === today ? 700 : 400,
          background: st === "all" ? "var(--checked-bg)" : st === "partial" ? "#1f3a27" : "rgba(255,255,255,0.03)",
          border: dk === today ? "2px solid var(--link)" : "1px solid rgba(255,255,255,0.05)",
          color: st === "all" || st === "partial" ? "var(--green)" : "var(--dim)"
        }, children: day }, dk);
      })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: s.legend, children: [["var(--checked-bg)", t("allDone")], ["#1f3a27", t("partial")], ["rgba(255,255,255,0.05)", t("incomplete")]].map(([bg, lbl]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: s.legendDot, style: { background: bg, border: bg.includes("rgba") ? "1px solid rgba(255,255,255,0.1)" : "none" } }),
      lbl
    ] }, lbl)) })
  ] }) });
}
export {
  CalendarModal
};
