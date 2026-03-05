import { useState, useEffect, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import { css, cx, keyframes } from '@emotion/css';
import { t } from './util/i18n';
import { DEFAULT_GAMES, DAILY_TYPES } from './constants';
import { loadGames, saveGames, loadChecks, saveChecks } from './util/storage';
import { getPeriodKey, checkKey, playCheckSound, playAllDoneSound,
         msUntilTaskReset } from './util/helpers';
import { imgGet, imgPurgeOrphans } from './util/imageStorage';
import { ConfirmDialog } from './ui/UI';
import { GameCard } from './ui/GameCard';
import { SettingsModal } from './ui/Settings';
import { CalendarModal } from './ui/Calendar';

// ── Styles ────────────────────────────────────────────────────────
const pulseUpdate = keyframes({
  '0%, 100%': { boxShadow: '0 0 0 0 rgba(227,179,65,0)' },
  '50%':      { boxShadow: '0 0 0 4px rgba(227,179,65,0.25)' },
});

const s = {
  loading: css({ background: 'var(--bg-app)', color: 'var(--muted)', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }),
  root:    css({ minHeight: '100vh', color: 'var(--text)', position: 'relative' }),
  rootNoBg: css({ background: 'linear-gradient(135deg, var(--bg-app) 0%, var(--bg-surface) 50%, var(--bg-app) 100%)' }),

  appBgImg: css({
    position: 'fixed', inset: 0, zIndex: -2,
    backgroundSize: 'cover', backgroundPosition: 'center',
  }),
  appBgOverlay: css({
    position: 'fixed', inset: 0, zIndex: -1,
    background: 'linear-gradient(135deg, var(--bg-app) 0%, var(--bg-app) 35%, rgba(13,17,23,0.82) 58%, rgba(13,17,23,0.28) 82%, rgba(13,17,23,0.05) 100%)',
  }),

  header:  css({ background: 'var(--bg-header)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '13px 18px', position: 'sticky', top: 0, zIndex: 100 }),
  headerInner: css({ maxWidth: 740, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }),
  headerLeft:  css({ display: 'flex', alignItems: 'center', gap: 10 }),
  title: css({ fontSize: 17, fontWeight: 800, background: 'linear-gradient(90deg, var(--link), var(--purple))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }),

  wcoBar: css({
    position: 'fixed',
    top:    'env(titlebar-area-y,    0px)',
    left:   'env(titlebar-area-x,    0px)',
    width:  'env(titlebar-area-width,  100%)',
    height: 'env(titlebar-area-height, 40px)',
    zIndex: 200,
    display: 'flex', alignItems: 'center',
    background: 'var(--bg-header)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    WebkitAppRegion: 'drag',
    gap: 8, padding: '0 10px',
    userSelect: 'none',
    overflow: 'hidden',
  }),
  wcoIcon:  css({ width: 18, height: 18, borderRadius: 4, flexShrink: 0, WebkitAppRegion: 'no-drag' }),
  wcoTitle: css({
    fontSize: 13, fontWeight: 700,
    background: 'linear-gradient(90deg, var(--link), var(--purple))',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    flex: '1 1 0', minWidth: 0,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  }),
  wcoClock: css({ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace', flexShrink: 0, whiteSpace: 'nowrap' }),
  wcoBtn: css({
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 16, padding: '4px 6px', borderRadius: 6, lineHeight: 1,
    color: 'var(--text)', fontFamily: 'inherit',
    flexShrink: 0,
    WebkitAppRegion: 'no-drag',
    transition: 'background 0.12s',
    '&:hover': { background: 'rgba(255,255,255,0.1)' },
  }),
  wcoOffset: css({
    height: 'env(titlebar-area-height, 40px)',
    paddingTop: 'env(titlebar-area-y, 0px)',
  }),
  clock:   css({ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }),
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
  const [collapsed,    setCollapsed]    = useState(() => {
    try {
      const v = localStorage.getItem('dt:collapsed');
      return v ? new Set(JSON.parse(v)) : new Set();
    } catch { return new Set(); }
  });
  const [updateInfo,   setUpdateInfo]   = useState(null);

  // ── WCO (Window Controls Overlay) ────────────────────────────
  const isPwa = !!(navigator.windowControlsOverlay);
  const [wcoEnabled, setWcoEnabledState] = useState(() => {
    try { const v = localStorage.getItem('dt:wcoEnabled'); return v === null ? true : v === '1'; }
    catch { return true; }
  });
  const setWcoEnabled = (val) => {
    setWcoEnabledState(val);
    try { localStorage.setItem('dt:wcoEnabled', val ? '1' : '0'); } catch {}
  };
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

  useEffect(() => {
    try { localStorage.setItem('dt:collapsed', JSON.stringify([...collapsed])); } catch {}
  }, [collapsed]);

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

  if (!games) return <div className={s.loading}>{t('loading')}</div>;

  return (
    <div className={cx(s.root, !appBg && s.rootNoBg)}>
      {appBg && <div className={s.appBgImg} style={{ backgroundImage: `url(${appBg})` }} />}
      {appBg && <div className={s.appBgOverlay} />}

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
        {sorted.map((game) => (
          <GameCard
            key={game.id}
            game={game} checks={checks} now={now} onToggle={toggle}
            allDone={isAllDone(game)} dailyTasks={getDailyTasks(game)} cd={cd}
            collapsed={collapsed.has(game.id)} onToggleCollapse={toggleCollapse}
            bgDataUrl={gameBgs[game.id]?.dataUrl || null}
            bgOpacity={gameBgs[game.id]?.opacity ?? 0.5}
          />
        ))}
        {games.length === 0 && <div className={s.noGames}>{t('noGames')}</div>}
      </main>

      {showSettings && <SettingsModal games={games} setGames={setGames} onClose={() => setShowSettings(false)} showConfirm={showConfirm} refreshImages={refreshImages} />}
      {showCalendar && <CalendarModal games={games} checks={checks} now={now} onClose={() => setShowCalendar(false)} />}
      {confirm && (
        <ConfirmDialog
          message={confirm.message} confirmLabel={confirm.confirmLabel}
          onConfirm={() => { confirm.onConfirm(); setConfirm(null); }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
