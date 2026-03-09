import { useState, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { t } from './util/i18n';
import { DEFAULT_GAMES, DAILY_TYPES, uid } from './constants';
import { loadGames, saveGames, loadChecks, saveChecks } from './util/storage';
import { useLocalStoragePref, BOOL_PREF, INT_PREF } from './util/useLocalStoragePref';
import { getPeriodKey, checkKey, playCheckSound, playAllDoneSound,
         msUntilTaskReset, msUntilDeadline } from './util/helpers';
import { imgGet, imgPurgeOrphans } from './util/imageStorage';
import { ConfirmDialog } from './ui/UI';
import { GameCard } from './ui/GameCard';
import { SettingsModal } from './ui/Settings';
import { CalendarModal } from './ui/Calendar';
import s from './App.module.css';

export function App() {
  const [games,        setGames]        = useState(null);
  const [checks,       setChecks]       = useState({});
  const [now,          setNow]          = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [confirm,      setConfirm]      = useState(null);
  const [collapsed,    setCollapsed]    = useState(() => {
    try {
      const v = localStorage.getItem('dt:collapsed');
      return v ? new Set(JSON.parse(v)) : new Set();
    } catch { return new Set(); }
  });
  const [updateInfo, setUpdateInfo] = useState(null);
  const [flashMsg,   setFlashMsg]   = useState(null); // brief post-update toast
  const [sortUncheckedFirst, setSortUncheckedFirst] = useLocalStoragePref('dt:sortUncheckedFirst', true,  BOOL_PREF);
  const [autoDeleteExpired,  setAutoDeleteExpired]  = useLocalStoragePref('dt:autoDeleteExpired',  false, BOOL_PREF);
  const [autoDeleteDays,     setAutoDeleteDays]     = useLocalStoragePref('dt:autoDeleteDays',     1,     INT_PREF);

  // ── WCO (Window Controls Overlay) ────────────────────────────
  const [wcoEnabled, setWcoEnabled] = useLocalStoragePref('dt:wcoEnabled', true, BOOL_PREF);
  const [wcoOsVisible, setWcoOsVisible] = useState(() => !!(navigator.windowControlsOverlay?.visible));
  useEffect(() => {
    const wco = navigator.windowControlsOverlay;
    if (!wco) return;
    const handler = () => setWcoOsVisible(wco.visible);
    wco.addEventListener('geometrychange', handler);
    return () => wco.removeEventListener('geometrychange', handler);
  }, []);
  const wcoVisible = wcoEnabled && wcoOsVisible;

  // ── Image states ──────────────────────────────────────────────
  const [appBg,   setAppBg]   = useState(null);
  const [gameBgs, setGameBgs] = useState({});
  const [imgVer,  setImgVer]  = useState(0);

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
        if (entry) bgs[g.id] = entry;
      }));
      if (!cancelled) setGameBgs(bgs);
    })();
    return () => { cancelled = true; };
  }, [imgVer, games]);


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

  // ── Auto-delete expired events ────────────────────────────────
  useEffect(() => {
    if (!autoDeleteExpired || !games) return;
    const thresholdMs = autoDeleteDays * 86_400_000;
    setGames((prev) => prev.map((g) => {
      const filtered = (g.events ?? []).filter((ev) => {
        if (!ev.deadline) return true;
        const ms = msUntilDeadline(ev.deadline, now, ev.deadlineTime ?? null);
        return ms > -thresholdMs; // keep if not yet past threshold
      });
      return filtered.length === (g.events ?? []).length ? g : { ...g, events: filtered };
    }));
  }, [now, autoDeleteExpired, autoDeleteDays]);

  useEffect(() => {
    try { localStorage.setItem('dt:collapsed', JSON.stringify([...collapsed])); } catch {}
  }, [collapsed]);

  useEffect(() => {
    if (games) imgPurgeOrphans(games.map((g) => g.id));
  }, [games]);

  // ── Post-update toast ─────────────────────────────────────────
  useEffect(() => {
    try {
      if (!localStorage.getItem('app-updated')) return;
      localStorage.removeItem('app-updated');
      setFlashMsg(t('verUpdated'));
      const timer = setTimeout(() => setFlashMsg(null), 4000);
      return () => clearTimeout(timer);
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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


  const toggle = useCallback((taskId, game, isMaster = false) => {
    let sound = null;
    const applyUpdates = () => {
      flushSync(() => {
        setChecks((prev) => {
          const next       = { ...prev };
          const dailyTasks = getDailyTasks(game);
          const allTasks   = game.tasks.length ? game.tasks : [{ id: soloId(game), type: 'daily' }];
          if (isMaster) {
            const allDone = dailyTasks.every((tk) => !!prev[checkKey(tk.id, getPeriodKey(tk, game, now))]);
            dailyTasks.forEach((tk) => { next[checkKey(tk.id, getPeriodKey(tk, game, now))] = !allDone; });
            // Play sound only; accordion state is not changed automatically
            if (!allDone) sound = 'allDone';
            else sound = 'check';
          } else {
            const task = allTasks.find((tk) => tk.id === taskId);
            if (!task) return prev;
            const k   = checkKey(task.id, getPeriodKey(task, game, now));
            const was = !!prev[k];
            next[k]   = !was;
            if (!was) {
              const fanfare = DAILY_TYPES.has(task.type) &&
                dailyTasks.every((tk) => { const k2 = checkKey(tk.id, getPeriodKey(tk, game, now)); return k2 === k ? true : !!prev[k2]; });
              // Play fanfare sound only; accordion state is not changed automatically
              if (fanfare) sound = 'allDone';
              else sound = 'check';
            }
          }
          saveChecks(next);
          return next;
        });
      });
      if (sound === 'allDone') playAllDoneSound();
      else if (sound === 'check') playCheckSound();
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

  const addEvent = useCallback((gameId, event) => {
    setGames((prev) => prev.map((g) => g.id === gameId ? { ...g, events: [...(g.events ?? []), event] } : g));
  }, []);

  const addTask = useCallback((gameId, task) => {
    setGames((prev) => prev.map((g) => g.id === gameId ? { ...g, tasks: [...g.tasks, { id: uid(), ...task }] } : g));
  }, []);

  const deleteEvent = useCallback((gameId, eventId) => {
    setGames((prev) => prev.map((g) => g.id === gameId ? { ...g, events: (g.events ?? []).filter((e) => e.id !== eventId) } : g));
  }, []);

  const toggleEvent = useCallback((gameId, eventId) => {
    setGames((prev) => prev.map((g) => {
      if (g.id !== gameId) return g;
      return { ...g, events: (g.events ?? []).map((e) => e.id === eventId ? { ...e, done: !e.done } : e) };
    }));
  }, []);

  const editEvent = useCallback((gameId, eventId, updates) => {
    setGames((prev) => prev.map((g) => g.id === gameId
      ? { ...g, events: (g.events ?? []).map((e) => e.id === eventId ? { ...e, ...updates } : e) }
      : g
    ));
  }, []);

  const editTask = useCallback((gameId, taskId, updates) => {
    setGames((prev) => prev.map((g) => g.id === gameId
      ? { ...g, tasks: g.tasks.map((tk) => tk.id === taskId ? { ...tk, ...updates } : tk) }
      : g
    ));
  }, []);

  if (!games) return <div className={s.loading}>{t('loading')}</div>;

  return (
    <div className={`${s.root}${!appBg ? ` ${s.rootNoBg}` : ""}`}>
      {appBg && <div className={s.appBgImg} style={{ backgroundImage: `url(${appBg})` }} />}
      {appBg && <div className={s.appBgOverlay} />}

      {/* Post-update toast */}
      {flashMsg && <div className={s.flashToast}>{flashMsg}</div>}

      {wcoVisible ? (
        <div className={s.wcoBar}>
          <img src="./icon-192.png" className={s.wcoIcon} alt="" />
          <span className={s.wcoTitle}>{t('appTitle')}</span>
          <span className={s.wcoClock}>{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          {updateInfo && (
            <button onClick={() => showConfirm(t('updateMsg', { current: updateInfo.current, next: updateInfo.next }), handleUpdate, t('updateBtn'))} className={s.wcoBtn} title={t('updateAvail')}>⬆️</button>
          )}
          <button onClick={() => setShowCalendar(true)} className={s.wcoBtn} title={t('record')}>📅</button>
          <button onClick={() => setShowSettings(true)} className={s.wcoBtn} title={t('settings')}>⚙️</button>
        </div>
      ) : (
        <header className={s.header}>
          <div className={s.headerInner}>
            <div className={s.headerLeft}>
              <span className={s.title}>{t('appTitle')}</span>
              <span className={s.clock}>{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className={s.actions}>
              {updateInfo && (
                <button onClick={() => showConfirm(t('updateMsg', { current: updateInfo.current, next: updateInfo.next }), handleUpdate, t('updateBtn'))} className={s.btnUpdate} title={t('updateAvail')}>⬆️</button>
              )}
              <button onClick={() => setShowCalendar(true)} className={s.btnRecord}   title={t('record')}>📅</button>
              <button onClick={() => setShowSettings(true)} className={s.btnSettings} title={t('settings')}>⚙️</button>
            </div>
          </div>
        </header>
      )}

      {wcoVisible && <div className={s.wcoOffset} />}

      <main className={s.main}>
        <AnimatePresence mode="popLayout" initial={false}>
          {(sortUncheckedFirst
            ? [...(games ?? [])].sort((a, b) => (isAllDone(a) ? 1 : 0) - (isAllDone(b) ? 1 : 0))
            : (games ?? [])
          ).map((game) => (
            <GameCard
              key={`game-${game.id}`}
              game={game} checks={checks} now={now} onToggle={toggle}
              allDone={isAllDone(game)} dailyTasks={getDailyTasks(game)} cd={cd}
              collapsed={collapsed.has(game.id)} onToggleCollapse={toggleCollapse}
              bgDataUrl={gameBgs[game.id]?.dataUrl || null}
              bgOpacity={gameBgs[game.id]?.opacity ?? 0.5}
              events={game.events ?? []}
              onAddEvent={addEvent}
              onAddTask={addTask}
              onDeleteEvent={deleteEvent}
              onToggleEvent={toggleEvent}
              onEditEvent={editEvent}
              onEditTask={editTask}
            />
          ))}
        </AnimatePresence>
        {(games ?? []).length === 0 && <div className={s.noGames}>{t('noGames')}</div>}
      </main>

      <AnimatePresence>
        {showSettings && <SettingsModal key="settings" games={games} setGames={setGames} onClose={() => setShowSettings(false)} showConfirm={showConfirm} refreshImages={refreshImages} onUpdate={handleUpdate} sortUncheckedFirst={sortUncheckedFirst} onSortUncheckedFirst={setSortUncheckedFirst} autoDeleteExpired={autoDeleteExpired} onAutoDeleteExpired={setAutoDeleteExpired} autoDeleteDays={autoDeleteDays} onAutoDeleteDays={setAutoDeleteDays} />}
      </AnimatePresence>
      <AnimatePresence>
        {showCalendar && <CalendarModal key="calendar" games={games} checks={checks} now={now} onClose={() => setShowCalendar(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {confirm && (
          <ConfirmDialog
            key="confirm"
            message={confirm.message} confirmLabel={confirm.confirmLabel}
            onConfirm={() => { confirm.onConfirm(); setConfirm(null); }}
            onCancel={() => setConfirm(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
