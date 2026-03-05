import { j as jsxRuntimeExports } from "../_virtual/jsx-runtime.js";
import { useState, useCallback } from "react";
import { cx } from "../util/cx.js";
import { t } from "../util/i18n.js";
import { PERIOD_TYPES, ensureContrast, utcToLocalHHMM } from "../constants.js";
import { checkKey, getPeriodKey, getPrevPeriodKey, msUntilReset, formatCountdown } from "../util/helpers.js";
import { Row, PrevBar } from "./UI.js";
import { TaskRow } from "./TaskRow.js";
import s from "./GameCard.module.css.js";
import shared from "./shared.module.css.js";
const EXIT_MS = 220;
const OPEN_MS = 280;
const CLOSE_MS = 240;
function GameCard({ game, checks, now, onToggle, allDone, dailyTasks, cd, collapsed, onToggleCollapse, bgDataUrl, bgOpacity = 0.5 }) {
  const [masterPop, setMasterPop] = useState(false);
  const [exitingIds, setExitingIds] = useState(/* @__PURE__ */ new Set());
  const [enteringIds, setEnteringIds] = useState(/* @__PURE__ */ new Set());
  const [animDir, setAnimDir] = useState(null);
  const fireMasterPop = () => {
    setMasterPop(true);
    setTimeout(() => setMasterPop(false), 260);
  };
  const dailyGroup = game.tasks.filter((tk) => !PERIOD_TYPES.has(tk.type));
  const periodGroup = game.tasks.filter((tk) => PERIOD_TYPES.has(tk.type));
  const hasDailyTasks = dailyGroup.length > 0;
  const isChecked = (tk) => !!checks[checkKey(tk.id, getPeriodKey(tk, game, now))];
  const handleToggleCollapse = useCallback(() => {
    const doToggle = () => {
      if (document.startViewTransition) document.startViewTransition(() => onToggleCollapse(game.id));
      else onToggleCollapse(game.id);
    };
    if (!collapsed) {
      setAnimDir("close");
      const toExit = [...dailyGroup.filter(isChecked), ...periodGroup.filter(isChecked)];
      if (toExit.length > 0) {
        setExitingIds(new Set(toExit.map((tk) => tk.id)));
        doToggle();
        setTimeout(() => setExitingIds(/* @__PURE__ */ new Set()), CLOSE_MS);
      } else {
        doToggle();
      }
    } else {
      setAnimDir("open");
      setTimeout(() => setAnimDir(null), OPEN_MS);
      const toEnter = [...dailyGroup.filter(isChecked), ...periodGroup.filter(isChecked)];
      if (toEnter.length > 0) {
        setEnteringIds(new Set(toEnter.map((tk) => tk.id)));
        onToggleCollapse(game.id);
        setTimeout(() => setEnteringIds(/* @__PURE__ */ new Set()), EXIT_MS);
      } else {
        onToggleCollapse(game.id);
      }
    }
  }, [collapsed, dailyGroup, periodGroup, game.id, onToggleCollapse, checks, now]);
  const visibleDaily = collapsed ? dailyGroup.filter((tk) => !isChecked(tk) || exitingIds.has(tk.id)) : dailyGroup;
  const visiblePeriod = collapsed ? periodGroup.filter((tk) => !isChecked(tk) || exitingIds.has(tk.id)) : periodGroup;
  const hasVisible = visibleDaily.length > 0 || visiblePeriod.length > 0;
  const allTodayDone = dailyTasks.length > 0 && dailyTasks.every((tk) => !!checks[checkKey(tk.id, getPeriodKey(tk, game, now))]);
  const prevCount = dailyTasks.filter((tk) => !!checks[checkKey(tk.id, getPrevPeriodKey(tk, game, now))]).length;
  const prevAll = dailyTasks.length > 0 && prevCount === dailyTasks.length;
  const prevPartial = prevCount > 0 && prevCount < dailyTasks.length;
  const ms = msUntilReset(now, game.resetTime);
  const h = ms / 36e5;
  const cdColor = h < 3 ? "var(--cd-urgent)" : h < 6 ? "var(--cd-warn)" : "var(--muted)";
  const visColor = ensureContrast(game.color);
  const localReset = utcToLocalHHMM(game.resetTime);
  const headerBg = bgDataUrl ? `linear-gradient(90deg, ${game.color}40 0%, ${game.color}18 40%, rgba(13,17,23,0.60) 100%)` : `linear-gradient(90deg, ${game.color}28 0%, ${game.color}10 40%, rgba(22,27,34,0.92) 100%)`;
  const wrapTask = (tk) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cx(s.taskRow, exitingIds.has(tk.id) ? s.taskRowExit : enteringIds.has(tk.id) ? s.taskRowEnter : null), children: /* @__PURE__ */ jsxRuntimeExports.jsx(TaskRow, { task: tk, game, checks, now, onToggle, cd }) }, tk.id);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: cx(s.card, allDone && s.cardDone),
      style: { border: `var(--card-border) solid ${game.color}60`, viewTransitionName: `game-${game.id}` },
      children: [
        bgDataUrl && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: s.bgLayer, style: { backgroundImage: `url(${bgDataUrl})` } }),
        bgDataUrl && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: s.bgOverlay, style: { opacity: 1 - bgOpacity } }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: s.content, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Row,
            {
              bg: headerBg,
              borderBottom: hasVisible ? "1px solid rgba(255,255,255,0.055)" : "none",
              onClick: hasDailyTasks ? handleToggleCollapse : void 0,
              style: hasDailyTasks ? { cursor: "pointer" } : void 0,
              preSlot: hasDailyTasks ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  className: cx(s.accordionBtn, animDir === "open" && s.chevronOpen, animDir === "close" && s.chevronClose),
                  style: { pointerEvents: "none" },
                  children: "▼"
                }
              ) : null,
              barSlot: /* @__PURE__ */ jsxRuntimeExports.jsx(PrevBar, { show: dailyTasks.length > 0, checked: prevAll, partial: prevPartial }),
              checkbox: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  onClick: (e) => {
                    e.stopPropagation();
                    fireMasterPop();
                    onToggle(null, game, true);
                  },
                  className: cx(shared.cb, shared.cbGame, allTodayDone && shared.cbChecked, masterPop && shared.cbPop),
                  children: allTodayDone ? "✓" : ""
                }
              ),
              content: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: {
                fontWeight: 700,
                fontSize: 14,
                flex: 1,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                color: allDone ? "var(--dim)" : visColor,
                textDecoration: allDone ? "line-through" : "none",
                WebkitTextStroke: "0.6px rgba(0,0,0,0.85)",
                paintOrder: "stroke fill",
                transition: "all 0.3s"
              }, children: game.name }),
              meta: /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                !allTodayDone && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: s.countdown, style: { color: cdColor }, children: [
                  "⏱",
                  formatCountdown(ms, cd)
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: s.resetTime, children: localReset })
              ] }),
              rightSlot: null
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cx(s.bodyWrap, hasVisible && s.bodyWrapOpen), style: !hasDailyTasks ? { display: "none" } : void 0, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cx(s.body, bgDataUrl && s.bodyWithBg), children: [
            visibleDaily.map(wrapTask),
            visibleDaily.length > 0 && visiblePeriod.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: s.divider, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: s.sepLabel, children: [
              "— ",
              t("periodic"),
              " —"
            ] }) }),
            visiblePeriod.map(wrapTask)
          ] }) })
        ] })
      ]
    }
  );
}
export {
  GameCard
};
