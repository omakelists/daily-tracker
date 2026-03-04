import { jsx, jsxs } from 'react/jsx-runtime';
import { useState, useEffect, useCallback, useRef } from 'react';
import { t } from './util/i18n.js';
import { DEFAULT_GAMES, DAILY_TYPES } from './constants.js';
import { loadGames, saveGames, loadChecks, saveChecks } from './util/storage.js';
import { getPeriodKey, checkKey, playCheckSound, playAllDoneSound,
         msUntilTaskReset } from './util/helpers.js';
import { ConfirmDialog } from './ui/UI.js';
import { GameCard } from './ui/GameCard.js';
import { SettingsModal } from './ui/Settings.js';
import { CalendarModal } from './ui/Calendar.js';

export function App() {
  const [games,        setGames]        = useState(null);
  const [checks,       setChecks]       = useState({});
  const [now,          setNow]          = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [confirm,      setConfirm]      = useState(null);
  const [collapsed,    setCollapsed]    = useState(new Set());
  const [updateInfo,   setUpdateInfo]   = useState(null); // {current, next} when update available

  // Track per-game all-done state across renders so we can detect reset transitions
  const prevAllDoneRef = useRef({});

  // 30-second heartbeat (fallback)
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Precise wakeup: fire setNow exactly when the next task/game reset boundary is crossed
  useEffect(() => {
    if (!games) return;
    let minMs = Infinity;
    games.forEach((game) => {
      const tasks = game.tasks.length
        ? game.tasks
        : [{ id: game.id + '_solo', type: 'daily' }];
      tasks.forEach((task) => {
        const ms = msUntilTaskReset(task, game, now);
        if (ms > 0 && ms < minMs) minMs = ms;
      });
    });
    if (!isFinite(minMs)) return;
    // +200 ms buffer so the clock has clearly passed the boundary
    const id = setTimeout(() => setNow(new Date()), minMs + 200);
    return () => clearTimeout(id);
  }, [now, games]);

  useEffect(() => {
    setGames(loadGames() ?? DEFAULT_GAMES);
    setChecks(loadChecks());
  }, []);

  useEffect(() => { if (games !== null) saveGames(games); }, [games]);

  // ── SW update detection ────────────────────────────────────────────
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Fetch the cached (current) version and the network (new) version,
    // then compare. version.json?check=1 bypasses the SW cache (see sw.js).
    const checkVersions = async () => {
      try {
        const [cachedRes, netRes] = await Promise.all([
          fetch('./version.json'),
          fetch('./version.json?check=1'),
        ]);
        if (!cachedRes.ok || !netRes.ok) return;
        const [cached, net] = await Promise.all([cachedRes.json(), netRes.json()]);
        if (net.version && net.version !== cached.version) {
          setUpdateInfo({ current: cached.version, next: net.version });
        }
      } catch {}
    };

    navigator.serviceWorker.ready.then((reg) => {
      // Trigger a background check for a new SW
      reg.update();

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          // new SW is installed and waiting — a controller exists = this is an update
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            checkVersions();
          }
        });
      });

      // Also show if a waiting SW already existed (e.g. tab was opened later)
      if (reg.waiting && navigator.serviceWorker.controller) checkVersions();
    });
  }, []);

  const cd     = { d: t('cd.d'), h: t('cd.h'), m: t('cd.m') };
  const soloId = (game) => `${game.id}_solo`;

  const getDailyTasks = useCallback((game) => {
    const tasks = game.tasks.length ? game.tasks : [{ id: soloId(game), type: 'daily' }];
    return tasks.filter((tk) => DAILY_TYPES.has(tk.type));
  }, []);

  const isAllDone = useCallback((game) => {
    const dt = getDailyTasks(game);
    return dt.length > 0 && dt.every((tk) => !!checks[checkKey(tk.id, getPeriodKey(tk, game, now))]);
  }, [checks, now, getDailyTasks]);

  // When now advances past a reset boundary, isAllDone flips true→false for that game.
  // Detect that transition and auto-expand the card so pending tasks become visible.
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
    // shouldCollapse is set synchronously inside the setChecks updater,
    // then read immediately after — safe because React calls updaters synchronously.
    let shouldCollapse = false;

    setChecks((prev) => {
      const next       = { ...prev };
      const dailyTasks = getDailyTasks(game);
      const allTasks   = game.tasks.length ? game.tasks : [{ id: soloId(game), type: 'daily' }];
      if (isMaster) {
        const allDone = dailyTasks.every((tk) => !!prev[checkKey(tk.id, getPeriodKey(tk, game, now))]);
        dailyTasks.forEach((tk) => { next[checkKey(tk.id, getPeriodKey(tk, game, now))] = !allDone; });
        if (!allDone) { playAllDoneSound(); shouldCollapse = true; }
        else playCheckSound();
      } else {
        const task = allTasks.find((tk) => tk.id === taskId);
        if (!task) return prev;
        const k   = checkKey(task.id, getPeriodKey(task, game, now));
        const was = !!prev[k];
        next[k]   = !was;
        if (!was) {
          const fanfare = DAILY_TYPES.has(task.type) &&
            dailyTasks.every((tk) => { const k2 = checkKey(tk.id, getPeriodKey(tk, game, now)); return k2 === k ? true : !!prev[k2]; });
          if (fanfare) { playAllDoneSound(); shouldCollapse = true; }
          else playCheckSound();
        }
      }
      saveChecks(next);
      return next;
    });

    // Auto-collapse only at the moment a game transitions to all-done.
    // Wrap in View Transition so the card slides to the bottom smoothly.
    if (shouldCollapse) {
      const doCollapse = () =>
        setCollapsed((prev) => { const next = new Set(prev); next.add(game.id); return next; });
      if (document.startViewTransition) {
        document.startViewTransition(doCollapse);
      } else {
        doCollapse();
      }
    }
  }, [now, getDailyTasks]);

  const toggleCollapse = useCallback((gameId) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(gameId)) next.delete(gameId); else next.add(gameId);
      return next;
    });
  }, []);

  const handleUpdate = useCallback(async () => {
    const reg = await navigator.serviceWorker.ready;
    if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    // Reload as soon as the new SW takes control
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
  }, []);

  const showConfirm = (msg, fn) => setConfirm({ message: msg, onConfirm: fn });

  if (!games) {
    return jsx('div', { className: 'dt-app-loading', children: t('loading') });
  }

  return jsxs('div', {
    className: 'dt-app-root',
    children: [
      jsxs('header', {
        className: 'dt-header',
        children: [
          jsxs('div', {
            className: 'dt-header-left',
            children: [
              jsx('span', { className: 'dt-app-title', children: t('appTitle') }),
              jsx('span', {
                className: 'dt-header-clock',
                children: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              }),
            ],
          }),
          jsxs('div', {
            className: 'dt-header-actions',
            children: [
              updateInfo && jsx('button', {
                onClick: () => setConfirm({
                  message: t('updateMsg', { current: updateInfo.current, next: updateInfo.next }),
                  onConfirm: handleUpdate,
                  confirmLabel: t('updateBtn'),
                }),
                className: 'dt-btn-update',
                title: t('updateAvail'),
                children: '⬆️',
              }),
              jsx('button', { onClick: () => setShowCalendar(true), className: 'dt-btn-record',   title: t('record'),   children: '📅' }),
              jsx('button', { onClick: () => setShowSettings(true), className: 'dt-btn-settings', title: t('settings'), children: '⚙️' }),
            ],
          }),
        ],
      }),
      jsxs('main', {
        className: 'dt-main',
        children: [
          sorted.map((game) => jsx(GameCard, {
            game, checks, now, onToggle: toggle,
            allDone: isAllDone(game),
            dailyTasks: getDailyTasks(game),
            cd,
            collapsed: collapsed.has(game.id),
            onToggleCollapse: toggleCollapse,
          }, game.id)),
          games.length === 0 && jsx('div', { className: 'dt-no-games', children: t('noGames') }),
        ],
      }),
      showSettings && jsx(SettingsModal, { games, setGames, onClose: () => setShowSettings(false), showConfirm }),
      showCalendar && jsx(CalendarModal, { games, checks, now, onClose: () => setShowCalendar(false) }),
      confirm && jsx(ConfirmDialog, {
        message: confirm.message,
        confirmLabel: confirm.confirmLabel,
        onConfirm: () => { confirm.onConfirm(); setConfirm(null); },
        onCancel:  () => setConfirm(null),
      }),
    ],
  });
}
