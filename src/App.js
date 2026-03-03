import { jsx, jsxs } from 'react/jsx-runtime';
import { useState, useEffect, useCallback, useRef } from 'react';
import { t } from './i18n.js';
import { DEFAULT_GAMES, DAILY_TYPES } from './constants.js';
import { loadGames, saveGames, loadChecks, saveChecks } from './storage.js';
import { getPeriodKey, checkKey, playCheckSound, playAllDoneSound,
         msUntilTaskReset } from './helpers.js';
import { ConfirmDialog } from './UI.js';
import { GameCard } from './GameCard.js';
import { SettingsModal } from './Settings.js';
import { CalendarModal } from './Calendar.js';

export function App() {
  const [games,        setGames]        = useState(null);
  const [checks,       setChecks]       = useState({});
  const [now,          setNow]          = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [confirm,      setConfirm]      = useState(null);
  const [collapsed,    setCollapsed]    = useState(new Set());

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
    // Never collapses again after the user manually expands it.
    if (shouldCollapse) {
      setCollapsed((prev) => { const next = new Set(prev); next.add(game.id); return next; });
    }
  }, [now, getDailyTasks]);

  const toggleCollapse = useCallback((gameId) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(gameId)) next.delete(gameId); else next.add(gameId);
      return next;
    });
  }, []);

  const showConfirm = (msg, fn) => setConfirm({ message: msg, onConfirm: fn });

  if (!games) {
    return jsx('div', {
      style: { background: 'var(--bg-app)', color: 'var(--muted)', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
      children: t('loading'),
    });
  }

  return jsxs('div', {
    style: { minHeight: '100vh', background: 'linear-gradient(135deg, var(--bg-app) 0%, var(--bg-surface) 50%, var(--bg-app) 100%)', color: 'var(--text)' },
    children: [
      jsxs('header', {
        style: { background: 'var(--bg-header)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '13px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 },
        children: [
          jsxs('div', {
            style: { display: 'flex', alignItems: 'center', gap: 10 },
            children: [
              jsx('span', {
                style: { fontSize: 17, fontWeight: 800, background: 'linear-gradient(90deg, var(--link), var(--purple))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
                children: t('appTitle'),
              }),
              jsx('span', {
                style: { fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' },
                children: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              }),
            ],
          }),
          jsxs('div', {
            style: { display: 'flex', gap: 8 },
            children: [
              jsx('button', { onClick: () => setShowCalendar(true), className: 'dt-btn-record',   children: `📅 ${t('record')}` }),
              jsx('button', { onClick: () => setShowSettings(true), className: 'dt-btn-settings', children: `⚙️ ${t('settings')}` }),
            ],
          }),
        ],
      }),
      jsxs('main', {
        style: { padding: '12px var(--page-m) 24px', maxWidth: 740, margin: '0 auto' },
        children: [
          sorted.map((game) => jsx(GameCard, {
            game, checks, now, onToggle: toggle,
            allDone: isAllDone(game),
            dailyTasks: getDailyTasks(game),
            cd,
            collapsed: collapsed.has(game.id),
            onToggleCollapse: toggleCollapse,
          }, game.id)),
          games.length === 0 && jsx('div', {
            style: { textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' },
            children: t('noGames'),
          }),
        ],
      }),
      showSettings && jsx(SettingsModal, { games, setGames, onClose: () => setShowSettings(false), showConfirm }),
      showCalendar && jsx(CalendarModal, { games, checks, now, onClose: () => setShowCalendar(false) }),
      confirm && jsx(ConfirmDialog, {
        message: confirm.message,
        onConfirm: () => { confirm.onConfirm(); setConfirm(null); },
        onCancel:  () => setConfirm(null),
      }),
    ],
  });
}
