import { useState, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { t } from './util/i18n';
import { DEFAULT_GAMES, DAILY, EVENT } from './constants';
import { loadAll, saveGames, saveChecks } from './util/storage';
import { uid, getPeriodKey, checkKey, playCheckSound, playAllDoneSound,
         msUntilTaskReset, calcAllDone } from './util/helpers';
import { useAppUpdate } from './util/useAppUpdate';
import { useAppSettings } from './util/useAppSettings';
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

  const { updateInfo, flashMsg, doUpdate } = useAppUpdate();

  const {
    sortUncheckedFirst,  setSortUncheckedFirst,
    autoDeleteExpired,   setAutoDeleteExpired,
    autoDeleteDays,      setAutoDeleteDays,
    collapsed, toggleCollapse,
    appBg, gameBgs, refreshImages,
  } = useAppSettings(games, setGames, now);

  // ── WCO (Window Controls Overlay) ────────────────────────────
  const [wcoVisible, setWcoVisible] = useState(() => !!(navigator.windowControlsOverlay?.visible));
  useEffect(() => {
    const wco = navigator.windowControlsOverlay;
    if (!wco) return;
    const handler = () => setWcoVisible(wco.visible);
    wco.addEventListener('geometrychange', handler);
    return () => wco.removeEventListener('geometrychange', handler);
  }, []);

  // Unified clock: fires at whichever comes first — the next task reset or 30s fallback.
  // This replaces a separate setInterval(30s) + setTimeout(nextReset) pair.
  useEffect(() => {
    let minMs = 30_000;
    if (games) {
      games.forEach((game) => {
        // Cover all task types (daily + periodic); fall back to solo when game has no tasks.
        const taskItems = (game.items ?? []).filter((it) => it.type !== EVENT);
        const tasks = taskItems.length ? taskItems : [{ id: soloId(game), type: DAILY }];
        tasks.forEach((task) => {
          const ms = msUntilTaskReset(task, game, now);
          if (ms > 0 && ms < minMs) minMs = ms;
        });
      });
    }
    const id = setTimeout(() => setNow(new Date()), minMs + 200);
    return () => clearTimeout(id);
  }, [now, games]);

  useEffect(() => {
    const { games: loaded, checks: loadedChecks } = loadAll();
    setGames(loaded ?? DEFAULT_GAMES);
    setChecks(loadedChecks);
  }, []);

  useEffect(() => { if (games !== null) saveGames(games); }, [games]);

  const soloId = (game) => `${game.id}_solo`;

  const getDailyTasks = useCallback((game) => {
    const dailyItems = (game.items ?? []).filter((it) => it.type === DAILY);
    // If no daily items exist, use a virtual solo task so the master checkbox is functional.
    return dailyItems.length ? dailyItems : [{ id: soloId(game), type: DAILY }];
  }, []);

  const isAllDone = useCallback((game) => calcAllDone(game, checks, now, soloId(game)), [checks, now]);


  const toggle = useCallback((taskId, game, isMaster = false) => {
    let sound = null;
    const applyUpdates = () => {
      flushSync(() => {
        setChecks((prev) => {
          const next       = { ...prev };
          const dailyTasks = getDailyTasks(game);
          const allItems   = game.items ?? [];
          const allTasks   = allItems.length ? allItems : [{ id: soloId(game), type: DAILY }];
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
              // Fanfare when the master checkbox transitions to done after this check.
              const fanfare = calcAllDone(game, next, now, soloId(game));
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

  const showConfirm = (msg, fn, lbl) => setConfirm({ message: msg, onConfirm: fn, confirmLabel: lbl });

  // ── Unified item operations ──────────────────────────────────
  const addItem = useCallback((gameId, item) => {
    setGames((prev) => prev.map((g) => g.id === gameId ? { ...g, items: [...(g.items ?? []), { id: uid(), ...item }] } : g));
  }, []);

  const deleteItem = useCallback((gameId, itemId) => {
    setGames((prev) => prev.map((g) => g.id === gameId ? { ...g, items: (g.items ?? []).filter((it) => it.id !== itemId) } : g));
  }, []);

const editItem = useCallback((gameId, itemId, updates) => {
    setGames((prev) => prev.map((g) => g.id === gameId
      ? { ...g, items: (g.items ?? []).map((it) => it.id === itemId ? { ...it, ...updates } : it) }
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
            <button onClick={() => showConfirm(t('updateMsg', { current: updateInfo.current, next: updateInfo.next }), doUpdate, t('updateBtn'))} className={s.wcoBtn} title={t('updateAvail')}>⬆️</button>
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
                <button onClick={() => showConfirm(t('updateMsg', { current: updateInfo.current, next: updateInfo.next }), doUpdate, t('updateBtn'))} className={s.btnUpdate} title={t('updateAvail')}>⬆️</button>
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
              allDone={isAllDone(game)} dailyTasks={getDailyTasks(game)}
              collapsed={collapsed.has(game.id)} onToggleCollapse={toggleCollapse}
              bgDataUrl={gameBgs[game.id]?.dataUrl || null}
              bgOpacity={gameBgs[game.id]?.opacity ?? 0.5}
              onAddItem={addItem}
              onDeleteItem={deleteItem}
              onEditItem={editItem}
              showConfirm={showConfirm}
            />
          ))}
        </AnimatePresence>
        {(games ?? []).length === 0 && <div className={s.noGames}>{t('noGames')}</div>}
      </main>

      <AnimatePresence>
        {showSettings && <SettingsModal key="settings" games={games} setGames={setGames} onClose={() => setShowSettings(false)} showConfirm={showConfirm} refreshImages={refreshImages}
            prefs={{ sortUncheckedFirst, autoDeleteExpired, autoDeleteDays }}
            onPrefs={(key, val) => ({ sortUncheckedFirst: setSortUncheckedFirst, autoDeleteExpired: setAutoDeleteExpired, autoDeleteDays: setAutoDeleteDays })[key]?.(val)}
          />}
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
