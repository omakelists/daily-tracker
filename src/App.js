import { jsx, jsxs } from 'react/jsx-runtime';
import { useState, useEffect, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import { css, cx, keyframes } from '@emotion/css';
import { t } from './util/i18n.js';
import { DEFAULT_GAMES, DAILY_TYPES } from './constants.js';
import { loadGames, saveGames, loadChecks, saveChecks } from './util/storage.js';
import { getPeriodKey, checkKey, playCheckSound, playAllDoneSound,
         msUntilTaskReset } from './util/helpers.js';
import { ConfirmDialog } from './ui/UI.js';
import { GameCard } from './ui/GameCard.js';
import { SettingsModal } from './ui/Settings.js';
import { CalendarModal } from './ui/Calendar.js';

// ── Styles ────────────────────────────────────────────────────────
const pulseUpdate = keyframes({
  '0%, 100%': { boxShadow: '0 0 0 0 rgba(227,179,65,0)' },
  '50%':      { boxShadow: '0 0 0 4px rgba(227,179,65,0.25)' },
});

const s = {
  loading: css({ background: 'var(--bg-app)', color: 'var(--muted)', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }),
  root:    css({ minHeight: '100vh', background: 'linear-gradient(135deg, var(--bg-app) 0%, var(--bg-surface) 50%, var(--bg-app) 100%)', color: 'var(--text)' }),
  header:  css({ background: 'var(--bg-header)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '13px 18px', position: 'sticky', top: 0, zIndex: 100 }),
  headerInner: css({ maxWidth: 740, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }),
  headerLeft:  css({ display: 'flex', alignItems: 'center', gap: 10 }),
  title: css({ fontSize: 17, fontWeight: 800, background: 'linear-gradient(90deg, var(--link), var(--purple))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }),
  clock: css({ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }),
  actions: css({ display: 'flex', gap: 8 }),
  main:    css({ padding: '12px var(--page-m) 24px', maxWidth: 740, margin: '0 auto' }),
  noGames: css({ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' }),

  btnRecord:   css({ background: 'var(--bg-surface)', border: '1px solid rgba(88,166,255,.27)',   borderRadius: 8, color: 'var(--link)',   padding: '7px 13px', fontSize: 13, cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }),
  btnSettings: css({ background: 'var(--bg-surface)', border: '1px solid rgba(188,140,255,.27)', borderRadius: 8, color: 'var(--purple)', padding: '7px 13px', fontSize: 13, cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }),
  btnUpdate:   css({ background: 'var(--bg-surface)', border: '1px solid rgba(227,179,65,.4)',    borderRadius: 8, color: 'var(--warn)',   padding: '7px 10px', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', animation: `${pulseUpdate} 2s ease-in-out infinite` }),
};

export function App() {
  const [games,        setGames]        = useState(null);
  const [checks,       setChecks]       = useState({});
  const [now,          setNow]          = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [confirm,      setConfirm]      = useState(null);
  const [collapsed,    setCollapsed]    = useState(new Set());
  const [updateInfo,   setUpdateInfo]   = useState(null);

  const prevAllDoneRef = useRef({});

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!games) return;
    let minMs = Infinity;
    games.forEach((game) => {
      const tasks = game.tasks.length ? game.tasks : [{ id: game.id + '_solo', type: 'daily' }];
      tasks.forEach((task) => {
        const ms = msUntilTaskReset(task, game, now);
        if (ms > 0 && ms < minMs) minMs = ms;
      });
    });
    if (!isFinite(minMs)) return;
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
    const checkVersions = async () => {
      try {
        const [cachedRes, netRes] = await Promise.all([fetch('./version.json'), fetch('./version.json?check=1')]);
        if (!cachedRes.ok || !netRes.ok) return;
        const [cached, net] = await Promise.all([cachedRes.json(), netRes.json()]);
        if (net.version && net.version !== cached.version) setUpdateInfo({ current: cached.version, next: net.version });
      } catch {}
    };
    navigator.serviceWorker.ready.then((reg) => {
      reg.update();
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) checkVersions();
        });
      });
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

  useEffect(() => {
    if (!games) return;
    const toExpand = [];
    games.forEach((game) => {
      const done = isAllDone(game);
      if (prevAllDoneRef.current[game.id] === true && !done) toExpand.push(game.id);
      prevAllDoneRef.current[game.id] = done;
    });
    if (toExpand.length) {
      setCollapsed((prev) => { const next = new Set(prev); toExpand.forEach((id) => next.delete(id)); return next; });
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
      });
      if (shouldCollapse) flushSync(() => setCollapsed((prev) => { const next = new Set(prev); next.add(game.id); return next; }));
    };

    if (document.startViewTransition) document.startViewTransition(applyUpdates);
    else applyUpdates();
  }, [now, getDailyTasks]);

  const toggleCollapse = useCallback((gameId) => {
    setCollapsed((prev) => { const next = new Set(prev); if (next.has(gameId)) next.delete(gameId); else next.add(gameId); return next; });
  }, []);

  const handleUpdate = useCallback(async () => {
    const reg = await navigator.serviceWorker.ready;
    if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
  }, []);

  const showConfirm = (msg, fn) => setConfirm({ message: msg, onConfirm: fn });

  if (!games) return jsx('div', { className: s.loading, children: t('loading') });

  return jsxs('div', {
    className: s.root,
    children: [
      jsxs('header', {
        className: s.header,
        children: [jsxs('div', {
          className: s.headerInner,
          children: [
            jsxs('div', { className: s.headerLeft, children: [
              jsx('span', { className: s.title, children: t('appTitle') }),
              jsx('span', { className: s.clock, children: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }),
            ]}),
            jsxs('div', { className: s.actions, children: [
              updateInfo && jsx('button', {
                onClick: () => setConfirm({ message: t('updateMsg', { current: updateInfo.current, next: updateInfo.next }), onConfirm: handleUpdate, confirmLabel: t('updateBtn') }),
                className: s.btnUpdate, title: t('updateAvail'), children: '⬆️',
              }),
              jsx('button', { onClick: () => setShowCalendar(true), className: s.btnRecord,   title: t('record'),   children: '📅' }),
              jsx('button', { onClick: () => setShowSettings(true), className: s.btnSettings, title: t('settings'), children: '⚙️' }),
            ]}),
          ],
        })],
      }),
      jsxs('main', {
        className: s.main,
        children: [
          sorted.map((game) => jsx(GameCard, {
            game, checks, now, onToggle: toggle,
            allDone: isAllDone(game), dailyTasks: getDailyTasks(game), cd,
            collapsed: collapsed.has(game.id), onToggleCollapse: toggleCollapse,
          }, game.id)),
          games.length === 0 && jsx('div', { className: s.noGames, children: t('noGames') }),
        ],
      }),
      showSettings && jsx(SettingsModal, { games, setGames, onClose: () => setShowSettings(false), showConfirm }),
      showCalendar && jsx(CalendarModal, { games, checks, now, onClose: () => setShowCalendar(false) }),
      confirm && jsx(ConfirmDialog, {
        message: confirm.message, confirmLabel: confirm.confirmLabel,
        onConfirm: () => { confirm.onConfirm(); setConfirm(null); },
        onCancel:  () => setConfirm(null),
      }),
    ],
  });
}
