import { j as jsxRuntimeExports } from "./_virtual/jsx-runtime.js";
import { useState, useEffect, useCallback, useRef } from "react";
import { flushSync } from "react-dom";
import { cx } from "./util/cx.js";
import { t } from "./util/i18n.js";
import { DEFAULT_GAMES, DAILY_TYPES } from "./constants.js";
import { loadGames, loadChecks, saveGames, saveChecks } from "./util/storage.js";
import { msUntilTaskReset, checkKey, getPeriodKey, playAllDoneSound, playCheckSound } from "./util/helpers.js";
import { imgGet, imgPurgeOrphans } from "./util/imageStorage.js";
import { ConfirmDialog } from "./ui/UI.js";
import { GameCard } from "./ui/GameCard.js";
import { SettingsModal } from "./ui/Settings.js";
import { CalendarModal } from "./ui/Calendar.js";
import s from "./App.module.css.js";
function App() {
  const [games, setGames] = useState(null);
  const [checks, setChecks] = useState({});
  const [now, setNow] = useState(/* @__PURE__ */ new Date());
  const [showSettings, setShowSettings] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const v = localStorage.getItem("dt:collapsed");
      return v ? new Set(JSON.parse(v)) : /* @__PURE__ */ new Set();
    } catch {
      return /* @__PURE__ */ new Set();
    }
  });
  const [updateInfo, setUpdateInfo] = useState(null);
  const [wcoEnabled, setWcoEnabledState] = useState(() => {
    try {
      const v = localStorage.getItem("dt:wcoEnabled");
      return v === null ? true : v === "1";
    } catch {
      return true;
    }
  });
  const [wcoOsVisible, setWcoOsVisible] = useState(() => {
    var _a;
    return !!((_a = navigator.windowControlsOverlay) == null ? void 0 : _a.visible);
  });
  useEffect(() => {
    const wco = navigator.windowControlsOverlay;
    if (!wco) return;
    const handler = () => setWcoOsVisible(wco.visible);
    wco.addEventListener("geometrychange", handler);
    return () => wco.removeEventListener("geometrychange", handler);
  }, []);
  const wcoVisible = wcoEnabled && wcoOsVisible;
  const [appBg, setAppBg] = useState(null);
  const [gameBgs, setGameBgs] = useState({});
  const [imgVer, setImgVer] = useState(0);
  const refreshImages = useCallback(() => setImgVer((v) => v + 1), []);
  useEffect(() => {
    if (!games) return;
    let cancelled = false;
    (async () => {
      const ab = await imgGet("app-bg");
      if (cancelled) return;
      setAppBg(ab ? ab.dataUrl : null);
      const bgs = {};
      await Promise.all(games.map(async (g) => {
        const entry = await imgGet(`game-${g.id}`);
        if (entry) bgs[g.id] = entry;
      }));
      if (!cancelled) setGameBgs(bgs);
    })();
    return () => {
      cancelled = true;
    };
  }, [imgVer, games]);
  const prevAllDoneRef = useRef({});
  useEffect(() => {
    const id = setInterval(() => setNow(/* @__PURE__ */ new Date()), 3e4);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!games) return;
    let minMs = Infinity;
    games.forEach((game) => {
      const tasks = game.tasks.length ? game.tasks : [{ id: game.id + "_solo", type: "daily" }];
      tasks.forEach((task) => {
        const ms = msUntilTaskReset(task, game, now);
        if (ms > 0 && ms < minMs) minMs = ms;
      });
    });
    if (!isFinite(minMs)) return;
    const id = setTimeout(() => setNow(/* @__PURE__ */ new Date()), minMs + 200);
    return () => clearTimeout(id);
  }, [now, games]);
  useEffect(() => {
    setGames(loadGames() ?? DEFAULT_GAMES);
    setChecks(loadChecks());
  }, []);
  useEffect(() => {
    if (games !== null) saveGames(games);
  }, [games]);
  useEffect(() => {
    try {
      localStorage.setItem("dt:collapsed", JSON.stringify([...collapsed]));
    } catch {
    }
  }, [collapsed]);
  useEffect(() => {
    if (games) imgPurgeOrphans(games.map((g) => g.id));
  }, [games]);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const checkVersions = async () => {
      try {
        const [cachedRes, netRes] = await Promise.all([fetch("./version.json"), fetch("./version.json?check=1")]);
        if (!cachedRes.ok || !netRes.ok) return;
        const [cached, net] = await Promise.all([cachedRes.json(), netRes.json()]);
        if (net.version && net.version !== cached.version) setUpdateInfo({ current: cached.version, next: net.version });
      } catch {
      }
    };
    navigator.serviceWorker.ready.then((reg) => {
      reg.update();
      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener("statechange", () => {
          if (nw.state === "installed" && navigator.serviceWorker.controller) checkVersions();
        });
      });
      if (reg.waiting && navigator.serviceWorker.controller) checkVersions();
    });
  }, []);
  const cd = { d: t("cd.d"), h: t("cd.h"), m: t("cd.m") };
  const soloId = (game) => `${game.id}_solo`;
  const getDailyTasks = useCallback((game) => {
    const tasks = game.tasks.length ? game.tasks : [{ id: soloId(game), type: "daily" }];
    return tasks.filter((tk) => DAILY_TYPES.has(tk.type));
  }, []);
  const isAllDone = useCallback((game) => {
    const dt = getDailyTasks(game);
    return dt.length > 0 && dt.every((tk) => !!checks[checkKey(tk.id, getPeriodKey(tk, game, now))]);
  }, [checks, now, getDailyTasks]);
  useEffect(() => {
    if (!games) return;
    const toExpand = [];
    games.forEach((game) => {
      const done = isAllDone(game);
      if (prevAllDoneRef.current[game.id] === true && !done) toExpand.push(game.id);
      prevAllDoneRef.current[game.id] = done;
    });
    if (toExpand.length) {
      setCollapsed((prev) => {
        const next = new Set(prev);
        toExpand.forEach((id) => next.delete(id));
        return next;
      });
    }
  }, [now, games, isAllDone]);
  const sorted = (games ?? []).slice().sort((a, b) => {
    const aD = isAllDone(a), bD = isAllDone(b);
    return aD === bD ? 0 : aD ? 1 : -1;
  });
  const toggle = useCallback((taskId, game, isMaster = false) => {
    let shouldCollapse = false;
    const applyUpdates = () => {
      flushSync(() => {
        setChecks((prev) => {
          const next = { ...prev };
          const dailyTasks = getDailyTasks(game);
          const allTasks = game.tasks.length ? game.tasks : [{ id: soloId(game), type: "daily" }];
          if (isMaster) {
            const allDone = dailyTasks.every((tk) => !!prev[checkKey(tk.id, getPeriodKey(tk, game, now))]);
            dailyTasks.forEach((tk) => {
              next[checkKey(tk.id, getPeriodKey(tk, game, now))] = !allDone;
            });
            if (!allDone) {
              playAllDoneSound();
              shouldCollapse = true;
            } else playCheckSound();
          } else {
            const task = allTasks.find((tk) => tk.id === taskId);
            if (!task) return prev;
            const k = checkKey(task.id, getPeriodKey(task, game, now));
            const was = !!prev[k];
            next[k] = !was;
            if (!was) {
              const fanfare = DAILY_TYPES.has(task.type) && dailyTasks.every((tk) => {
                const k2 = checkKey(tk.id, getPeriodKey(tk, game, now));
                return k2 === k ? true : !!prev[k2];
              });
              if (fanfare) {
                playAllDoneSound();
                shouldCollapse = true;
              } else playCheckSound();
            }
          }
          saveChecks(next);
          return next;
        });
      });
      if (shouldCollapse) flushSync(() => setCollapsed((prev) => {
        const next = new Set(prev);
        next.add(game.id);
        return next;
      }));
    };
    if (document.startViewTransition) document.startViewTransition(applyUpdates);
    else applyUpdates();
  }, [now, getDailyTasks]);
  const toggleCollapse = useCallback((gameId) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(gameId)) next.delete(gameId);
      else next.add(gameId);
      return next;
    });
  }, []);
  const handleUpdate = useCallback(async () => {
    const reg = await navigator.serviceWorker.ready;
    if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
    navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), { once: true });
  }, []);
  const showConfirm = (msg, fn, lbl) => setConfirm({ message: msg, onConfirm: fn, confirmLabel: lbl });
  if (!games) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: s.loading, children: t("loading") });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cx(s.root, !appBg && s.rootNoBg), children: [
    appBg && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: s.appBgImg, style: { backgroundImage: `url(${appBg})` } }),
    appBg && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: s.appBgOverlay }),
    wcoVisible ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: s.wcoBar, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: "./icon-192.png", className: s.wcoIcon, alt: "" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: s.wcoTitle, children: t("appTitle") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: s.wcoClock, children: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }),
      updateInfo && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => showConfirm(t("updateMsg", { current: updateInfo.current, next: updateInfo.next }), handleUpdate, t("updateBtn")), className: s.wcoBtn, title: t("updateAvail"), children: "⬆️" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setShowCalendar(true), className: s.wcoBtn, title: t("record"), children: "📅" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setShowSettings(true), className: s.wcoBtn, title: t("settings"), children: "⚙️" })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("header", { className: s.header, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: s.headerInner, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: s.headerLeft, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: s.title, children: t("appTitle") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: s.clock, children: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: s.actions, children: [
        updateInfo && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => showConfirm(t("updateMsg", { current: updateInfo.current, next: updateInfo.next }), handleUpdate, t("updateBtn")), className: s.btnUpdate, title: t("updateAvail"), children: "⬆️" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setShowCalendar(true), className: s.btnRecord, title: t("record"), children: "📅" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setShowSettings(true), className: s.btnSettings, title: t("settings"), children: "⚙️" })
      ] })
    ] }) }),
    wcoVisible && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: s.wcoOffset }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: s.main, children: [
      sorted.map((game) => {
        var _a, _b;
        return /* @__PURE__ */ jsxRuntimeExports.jsx(
          GameCard,
          {
            game,
            checks,
            now,
            onToggle: toggle,
            allDone: isAllDone(game),
            dailyTasks: getDailyTasks(game),
            cd,
            collapsed: collapsed.has(game.id),
            onToggleCollapse: toggleCollapse,
            bgDataUrl: ((_a = gameBgs[game.id]) == null ? void 0 : _a.dataUrl) || null,
            bgOpacity: ((_b = gameBgs[game.id]) == null ? void 0 : _b.opacity) ?? 0.5
          },
          game.id
        );
      }),
      games.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: s.noGames, children: t("noGames") })
    ] }),
    showSettings && /* @__PURE__ */ jsxRuntimeExports.jsx(SettingsModal, { games, setGames, onClose: () => setShowSettings(false), showConfirm, refreshImages }),
    showCalendar && /* @__PURE__ */ jsxRuntimeExports.jsx(CalendarModal, { games, checks, now, onClose: () => setShowCalendar(false) }),
    confirm && /* @__PURE__ */ jsxRuntimeExports.jsx(
      ConfirmDialog,
      {
        message: confirm.message,
        confirmLabel: confirm.confirmLabel,
        onConfirm: () => {
          confirm.onConfirm();
          setConfirm(null);
        },
        onCancel: () => setConfirm(null)
      }
    )
  ] });
}
export {
  App
};
