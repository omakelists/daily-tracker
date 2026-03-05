import { jsx, jsxs } from 'react/jsx-runtime';
import { useState, useEffect, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import { css, cx, keyframes } from '@emotion/css';
import { t } from './util/i18n.js';
import { DEFAULT_GAMES, DAILY_TYPES } from './constants.js';
import { loadGames, saveGames, loadChecks, saveChecks } from './util/storage.js';
import { getPeriodKey, checkKey, playCheckSound, playAllDoneSound,
         msUntilTaskReset } from './util/helpers.js';
import { imgGet, imgPurgeOrphans } from './util/imageStorage.js';
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
  root:    css({ minHeight: '100vh', color: 'var(--text)', position: 'relative' }),
  rootNoBg: css({ background: 'linear-gradient(135deg, var(--bg-app) 0%, var(--bg-surface) 50%, var(--bg-app) 100%)' }),

  // App background image layers (position: fixed, behind content via negative z-index)
  appBgImg: css({
    position: 'fixed', inset: 0, zIndex: -2,
    backgroundSize: 'cover', backgroundPosition: 'center',
  }),
  appBgOverlay: css({
    position: 'fixed', inset: 0, zIndex: -1,
    // Dark top-left, image revealed only at bottom-right
    background: 'linear-gradient(135deg, var(--bg-app) 0%, var(--bg-app) 35%, rgba(13,17,23,0.82) 58%, rgba(13,17,23,0.28) 82%, rgba(13,17,23,0.05) 100%)',
  }),

  // ── Non-WCO header (sticky, normal layout) ────────────────────
  header:  css({ background: 'var(--bg-header)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '13px 18px', position: 'sticky', top: 0, zIndex: 100 }),
  headerInner: css({ maxWidth: 740, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }),
  headerLeft:  css({ display: 'flex', alignItems: 'center', gap: 10 }),
  title: css({ fontSize: 17, fontWeight: 800, background: 'linear-gradient(90deg, var(--link), var(--purple))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }),

  // ── WCO titlebar (fixed, fills titlebar-area env vars) ────────
  wcoBar: css({
    position: 'fixed',
    // Positioned exactly inside the titlebar area defined by the OS
    top:    'env(titlebar-area-y,    0px)',
    left:   'env(titlebar-area-x,    0px)',
    width:  'env(titlebar-area-width,  100%)',
    height: 'env(titlebar-area-height, 40px)',
    zIndex: 200,
    display: 'flex', alignItems: 'center',
    background: 'var(--bg-header)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    // Whole bar is draggable by default; buttons override with no-drag
    WebkitAppRegion: 'drag',
    gap: 8, padding: '0 10px',
    userSelect: 'none',
    overflow: 'hidden',
  }),
  wcoIcon: css({ width: 18, height: 18, borderRadius: 4, flexShrink: 0, WebkitAppRegion: 'no-drag' }),
  wcoTitle: css({
    fontSize: 13, fontWeight: 700,
    background: 'linear-gradient(90deg, var(--link), var(--purple))',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    flexShrink: 0,
  }),
  wcoClock: css({ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace', flexShrink: 0 }),
  wcoSpacer: css({ flex: 1, minWidth: 0 }),
  wcoBtn: css({
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 16, padding: '4px 6px', borderRadius: 6, lineHeight: 1,
    color: 'var(--text)', fontFamily: 'inherit',
    WebkitAppRegion: 'no-drag',
    transition: 'background 0.12s',
    '&:hover': { background: 'rgba(255,255,255,0.1)' },
  }),
  // Spacer that pushes main content below the WCO bar
  wcoOffset: css({
    height: 'env(titlebar-area-height, 40px)',
    paddingTop: 'env(titlebar-area-y, 0px)',
  }),
  clock: css({ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }),
  actions: css({ display: 'flex', gap: 8 }),
  main:    css({ padding: '12px var(--page-m) 24px', maxWidth: 740, margin: '0 auto', position: 'relative' }),
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

  // ── WCO (Window Controls Overlay) ────────────────────────────
  const [wcoVisible, setWcoVisible] = useState(
    () => !!(navigator.windowControlsOverlay?.visible)
  );
  useEffect(() => {
    const wco = navigator.windowControlsOverlay;
    if (!wco) return;
    const handler = () => setWcoVisible(wco.visible);
    wco.addEventListener('geometrychange', handler);
    return () => wco.removeEventListener('geometrychange', handler);
  }, []);

  // ── Image states ──────────────────────────────────────────────
  const [appBg,   setAppBg]   = useState(null);       // dataUrl | null
  const [gameBgs, setGameBgs] = useState({});          // { [gameId]: dataUrl }
  const [imgVer,  setImgVer]  = useState(0);           // increment to force re-load

  const refreshImages = useCallback(() => setImgVer((v) => v + 1), []);

  useEffect(() => {
    if (!games) return;
    let cancelled = false;
    (async () => {
      const ab = await imgGet('app-bg');
      if (cancelled) return;
      setAppBg(ab ? ab.dataUrl : null);
      const bgs = {};
      await Promise.all(games.map(async (g) => {
        const entry = await imgGet(`game-${g.id}`);
        if (entry) bgs[g.id] = entry;  // {dataUrl, opacity}
      }));
      if (!cancelled) setGameBgs(bgs);
    })();
    return () => { cancelled = true; };
  }, [imgVer, games]);

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

  // Purge orphaned images whenever the games list changes
  useEffect(() => {
    if (games) imgPurgeOrphans(games.map((g) => g.id));
  }, [games]);

  // ── SW update detection ────────────────────────────────────────
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

  const showConfirm = (msg, fn, lbl) => setConfirm({ message: msg, onConfirm: fn, confirmLabel: lbl });

  if (!games) return jsx('div', { className: s.loading, children: t('loading') });

  return jsxs('div', {
    className: cx(s.root, !appBg && s.rootNoBg),
    children: [
      // ── App background image layers ──────────────────────────
      appBg && jsx('div', { className: s.appBgImg, style: { backgroundImage: `url(${appBg})` } }),
      appBg && jsx('div', { className: s.appBgOverlay }),

      // ── Header ───────────────────────────────────────────────
      wcoVisible
        // WCO titlebar: fixed, fills OS titlebar-area
        ? jsxs('div', { className: s.wcoBar, children: [
            jsx('img', { src: './icon-192.png', className: s.wcoIcon, alt: '' }),
            jsx('span', { className: s.wcoTitle, children: t('appTitle') }),
            jsx('span', { className: s.wcoClock, children: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }),
            jsx('div', { className: s.wcoSpacer }),
            updateInfo && jsx('button', {
              onClick: () => showConfirm(t('updateMsg', { current: updateInfo.current, next: updateInfo.next }), handleUpdate, t('updateBtn')),
              className: s.wcoBtn, title: t('updateAvail'), children: '⬆️',
            }),
            jsx('button', { onClick: () => setShowCalendar(true), className: s.wcoBtn, title: t('record'),   children: '📅' }),
            jsx('button', { onClick: () => setShowSettings(true), className: s.wcoBtn, title: t('settings'), children: '⚙️' }),
          ]})
        // Normal sticky header (non-PWA or WCO not supported)
        : jsxs('header', {
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
                    onClick: () => showConfirm(t('updateMsg', { current: updateInfo.current, next: updateInfo.next }), handleUpdate, t('updateBtn')),
                    className: s.btnUpdate, title: t('updateAvail'), children: '⬆️',
                  }),
                  jsx('button', { onClick: () => setShowCalendar(true), className: s.btnRecord,   title: t('record'),   children: '📅' }),
                  jsx('button', { onClick: () => setShowSettings(true), className: s.btnSettings, title: t('settings'), children: '⚙️' }),
                ]}),
              ],
            })],
          }),
      // WCO offset: push content below the titlebar area
      wcoVisible && jsx('div', { className: s.wcoOffset }),

      // ── Main content ─────────────────────────────────────────
      jsxs('main', {
        className: s.main,
        children: [
          sorted.map((game) => jsx(GameCard, {
            game, checks, now, onToggle: toggle,
            allDone: isAllDone(game), dailyTasks: getDailyTasks(game), cd,
            collapsed: collapsed.has(game.id), onToggleCollapse: toggleCollapse,
            bgDataUrl: gameBgs[game.id]?.dataUrl || null,
            bgOpacity: gameBgs[game.id]?.opacity ?? 0.5,
          }, game.id)),
          games.length === 0 && jsx('div', { className: s.noGames, children: t('noGames') }),
        ],
      }),

      showSettings && jsx(SettingsModal, { games, setGames, onClose: () => setShowSettings(false), showConfirm, refreshImages }),
      showCalendar && jsx(CalendarModal, { games, checks, now, onClose: () => setShowCalendar(false) }),
      confirm && jsx(ConfirmDialog, {
        message: confirm.message, confirmLabel: confirm.confirmLabel,
        onConfirm: () => { confirm.onConfirm(); setConfirm(null); },
        onCancel:  () => setConfirm(null),
      }),
    ],
  });
}
