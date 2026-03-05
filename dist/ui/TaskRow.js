import { j as jsxRuntimeExports } from "../_virtual/jsx-runtime.js";
import { useState } from "react";
import { cx } from "../util/cx.js";
import { t } from "../util/i18n.js";
import { DAILY_TYPES, utcToLocalHHMM } from "../constants.js";
import { checkKey, getPeriodKey, getPrevPeriodKey, msUntilTaskReset, formatCountdown } from "../util/helpers.js";
import { Row, PrevBar } from "./UI.js";
import s from "./TaskRow.module.css.js";
import shared from "./shared.module.css.js";
const BADGE_MAP = {
  daily: shared.badgeDaily,
  weekly: shared.badgeWeekly,
  webdaily: shared.badgeWebdaily,
  monthly: shared.badgeMonthly,
  halfmonthly: shared.badgeHalfmonthly
};
function TaskRow({ task, game, checks, now, onToggle, cd }) {
  const [pop, setPop] = useState(false);
  const firePop = () => {
    setPop(true);
    setTimeout(() => setPop(false), 260);
  };
  const isChecked = !!checks[checkKey(task.id, getPeriodKey(task, game, now))];
  const prevChecked = !!checks[checkKey(task.id, getPrevPeriodKey(task, game, now))];
  const showPrev = DAILY_TYPES.has(task.type);
  const ms = msUntilTaskReset(task, game, now);
  const h = ms / 36e5;
  const cdColor = h < 3 ? "var(--cd-urgent)" : h < 6 ? "var(--cd-warn)" : "var(--muted)";
  const showCD = task.type === "monthly" || task.type === "halfmonthly" || task.type === "webdaily" && task.webResetTime && task.webResetTime !== game.resetTime;
  const localWebReset = task.webResetTime ? utcToLocalHHMM(task.webResetTime) : null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Row,
    {
      className: s.row,
      barSlot: /* @__PURE__ */ jsxRuntimeExports.jsx(PrevBar, { show: showPrev, checked: prevChecked }),
      checkbox: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => {
        firePop();
        onToggle(task.id, game);
      }, className: cx(shared.cb, isChecked && shared.cbChecked, pop && shared.cbPop), children: isChecked ? "✓" : "" }),
      content: /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cx(shared.badge, BADGE_MAP[task.type]), children: t(`types.${task.type}`) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: {
          fontSize: 13,
          color: isChecked ? "var(--dim)" : "var(--text)",
          textDecoration: isChecked ? "line-through" : "none",
          WebkitTextStroke: "0.6px rgba(0,0,0,0.85)",
          paintOrder: "stroke fill",
          transition: "color 0.2s",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        }, children: task.name.trim() || t(`types.${task.type}`) })
      ] }),
      meta: /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        showCD && !isChecked && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: s.countdown, style: { color: cdColor }, children: [
          "⏱",
          formatCountdown(ms, cd)
        ] }),
        task.type === "webdaily" && localWebReset && localWebReset !== utcToLocalHHMM(game.resetTime) && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: s.resetLbl, children: localWebReset }),
        task.type === "monthly" && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: s.resetLbl, children: t("everyDay", { day: task.monthlyResetDay ?? 1 }) })
      ] }),
      rightSlot: null
    }
  );
}
export {
  TaskRow
};
