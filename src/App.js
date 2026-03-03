import { jsx, jsxs } from 'react/jsx-runtime';
import { useState, useEffect, useCallback } from 'react';
import { t } from './i18n.js';
import { DEFAULT_GAMES, DAILY_TYPES, L } from './constants.js';
import { loadGames, saveGames, loadChecks, saveChecks } from './storage.js';
import { getPeriodKey, checkKey, playCheckSound, playAllDoneSound } from './helpers.js';
import { btnStyle, ConfirmDialog } from './UI.js';
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

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

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

  const sorted = (games ?? []).slice().sort((a, b) => {
    const aD = isAllDone(a), bD = isAllDone(b);
    return aD === bD ? 0 : aD ? 1 : -1;
  });

  const toggle = useCallback((taskId, game, isMaster = false) => {
    setChecks((prev) => {
      const next       = { ...prev };
      const dailyTasks = getDailyTasks(game);
      const allTasks   = game.tasks.length ? game.tasks : [{ id: soloId(game), type: 'daily' }];
      if (isMaster) {
        const allDone = dailyTasks.every((tk) => !!prev[checkKey(tk.id, getPeriodKey(tk, game, now))]);
        dailyTasks.forEach((tk) => { next[checkKey(tk.id, getPeriodKey(tk, game, now))] = !allDone; });
        if (!allDone) playAllDoneSound(); else playCheckSound();
      } else {
        const task = allTasks.find((tk) => tk.id === taskId);
        if (!task) return prev;
        const k   = checkKey(task.id, getPeriodKey(task, game, now));
        const was = !!prev[k];
        next[k]   = !was;
        if (!was) {
          const fanfare = DAILY_TYPES.has(task.type) &&
            dailyTasks.every((tk) => { const k2 = checkKey(tk.id, getPeriodKey(tk, game, now)); return k2 === k ? true : !!prev[k2]; });
          if (fanfare) playAllDoneSound(); else playCheckSound();
        }
      }
      saveChecks(next);
      return next;
    });
  }, [now, getDailyTasks]);

  const showConfirm = (msg, fn) => setConfirm({ message: msg, onConfirm: fn });

  if (!games) {
    return jsx('div', {
      style: { background: '#0d1117', color: '#8b949e', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
      children: t('loading'),
    });
  }

  return jsxs('div', {
    style: { minHeight: '100vh', background: 'linear-gradient(135deg, #0d1117 0%, #161b22 50%, #0d1117 100%)', color: '#e6edf3' },
    children: [
      // Header
      jsxs('header', {
        style: { background: 'rgba(22,27,34,0.95)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '13px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 },
        children: [
          jsxs('div', {
            style: { display: 'flex', alignItems: 'center', gap: 10 },
            children: [
              jsx('span', { style: { fontSize: 17, fontWeight: 800, background: 'linear-gradient(90deg, #58a6ff, #bc8cff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }, children: t('appTitle') }),
              jsx('span', { style: { fontSize: 11, color: '#8b949e', fontFamily: 'monospace' }, children: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }),
            ],
          }),
          jsxs('div', {
            style: { display: 'flex', gap: 8 },
            children: [
              jsx('button', { onClick: () => setShowCalendar(true), style: btnStyle('#21262d', '#58a6ff'), children: `📅 ${t('record')}` }),
              jsx('button', { onClick: () => setShowSettings(true), style: btnStyle('#21262d', '#bc8cff'), children: `⚙️ ${t('settings')}` }),
            ],
          }),
        ],
      }),

      // Main
      jsxs('main', {
        style: { padding: `12px ${L.PAGE_M}px 24px`, maxWidth: 740, margin: '0 auto' },
        children: [
          sorted.map((game) => jsx(GameCard, { game, checks, now, onToggle: toggle, allDone: isAllDone(game), dailyTasks: getDailyTasks(game), cd }, game.id)),
          games.length === 0 && jsx('div', { style: { textAlign: 'center', padding: '60px 20px', color: '#8b949e' }, children: t('noGames') }),
        ],
      }),

      // Modals
      showSettings && jsx(SettingsModal, { games, setGames, onClose: () => setShowSettings(false), showConfirm }),
      showCalendar && jsx(CalendarModal, { games, checks, now, onClose: () => setShowCalendar(false) }),
      confirm && jsx(ConfirmDialog, { message: confirm.message, onConfirm: () => { confirm.onConfirm(); setConfirm(null); }, onCancel: () => setConfirm(null) }),
    ],
  });
}
