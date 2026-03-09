import { useState, useRef, useEffect, useCallback } from 'react';
import { useDragSort, useScopedDragSort } from '../util/useDragSort';
import { motion, AnimatePresence } from 'motion/react';
import { t } from '../util/i18n';
import { uid, utcToLocalHHMM, localToUtcHHMM, DAILY_TYPES, PERIOD_TYPES, EVENT_TYPES } from '../constants';
import { imgGet, imgSet, imgDelete } from '../util/imageStorage';
import { Modal, TaskSection } from './UI';
import { CropModal } from './CropModal';
import { DailyAddForm, PeriodicAddForm, EventAddForm } from './InlineAddForm';
import s from './Settings.module.css';
import shared from './shared.module.css';

const DAILY_TYPE_OPTS    = [...DAILY_TYPES];
const PERIODIC_TYPE_OPTS = [...PERIOD_TYPES];
const DragHandle = <span className={s.dragHandle}>⠿</span>;

// Shared item variants for game/task rows
const itemVariants = {
  initial: { opacity: 0, height: 0, marginBottom: 0 },
  animate: { opacity: 1, height: 'auto', marginBottom: 10, transition: { duration: 0.18 } },
  exit:    { opacity: 0, height: 0, marginBottom: 0,       transition: { duration: 0.16 } },
};
const taskItemVariants = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto', transition: { duration: 0.15 } },
  exit:    { opacity: 0, height: 0,      transition: { duration: 0.13 } },
};

function TypeSelect({ value, onChange, typeOpts }) {
  return (
    <select value={value} onChange={onChange} className={`${shared.inputCls} ${s.typeSelect}`}>
      {typeOpts.map((ty) => <option key={ty} value={ty}>{t(`types.${ty}`)}</option>)}
    </select>
  );
}

// ── Per-variant row components ────────────────────────────────────

/** Row for daily / webdaily tasks. Renders a time input only for webdaily. */
function DailyTaskRow({ item, dndProps, dndStyle, onUpdate, onDelete }) {
  return (
    <div {...dndProps} className={s.taskFormRow} style={dndStyle}>
      {DragHandle}
      <TypeSelect value={item.type} onChange={(e) => onUpdate(item.id, 'type', e.target.value)} typeOpts={DAILY_TYPE_OPTS} />
      <input value={item.name} onChange={(e) => onUpdate(item.id, 'name', e.target.value)} className={`${shared.inputCls} ${shared.flexInput}`} placeholder={t(`types.${item.type}`)} />
      {item.type === 'webdaily' && (
        <>
          <span className={s.extraLbl}>{t('resetLbl')}</span>
          <input type="time" value={utcToLocalHHMM(item.webResetTime ?? '00:00')} onChange={(e) => onUpdate(item.id, 'webResetTime', localToUtcHHMM(e.target.value))} className={`${shared.inputCls} ${s.inputTime}`} />
        </>
      )}
      <button onClick={() => onDelete(item.id)} className={`${shared.btn} ${shared.btnDanger}`}>✕</button>
    </div>
  );
}

/** Row for periodic tasks (weekly / halfmonthly / monthly). Renders a reset-day input only for monthly. */
function PeriodicTaskRow({ item, dndProps, dndStyle, onUpdate, onDelete }) {
  return (
    <div {...dndProps} className={s.taskFormRow} style={dndStyle}>
      {DragHandle}
      <TypeSelect value={item.type} onChange={(e) => onUpdate(item.id, 'type', e.target.value)} typeOpts={PERIODIC_TYPE_OPTS} />
      <input value={item.name} onChange={(e) => onUpdate(item.id, 'name', e.target.value)} className={`${shared.inputCls} ${shared.flexInput}`} placeholder={t(`types.${item.type}`)} />
      {item.type === 'monthly' && (
        <>
          <span className={s.extraLbl}>{t('resetDay')}</span>
          <input type="number" min="1" max="28" value={item.monthlyResetDay ?? 1} onChange={(e) => onUpdate(item.id, 'monthlyResetDay', Math.max(1, Math.min(28, parseInt(e.target.value) || 1)))} className={`${shared.inputCls} ${s.inputNumber}`} />
          <span className={s.extraLbl}>{t('dayUnit')}</span>
        </>
      )}
      <button onClick={() => onDelete(item.id)} className={`${shared.btn} ${shared.btnDanger}`}>✕</button>
    </div>
  );
}

/** Card for events / todos. Renders a deadline date + optional time. */
function EventTaskRow({ item, dndProps, dndStyle, onUpdate, onDelete }) {
  return (
    <div {...dndProps} className={s.taskFormCard} style={dndStyle}>
      <div className={s.taskFormRow1}>
        {DragHandle}
        <input value={item.name} onChange={(e) => onUpdate(item.id, 'name', e.target.value)} className={`${shared.inputCls} ${shared.flexInput}`} placeholder={t('scheduleLabel')} />
        <button onClick={() => onDelete(item.id)} className={`${shared.btn} ${shared.btnDanger}`}>✕</button>
      </div>
      <div className={s.taskFormRow2}>
        <span className={s.extraLbl}>{t('resetLbl')}</span>
        <input type="date" value={item.deadline ?? ''} onChange={(e) => onUpdate(item.id, 'deadline', e.target.value || null)} className={`${shared.inputCls} ${s.inputDate}`} />
        <input type="time" value={item.deadlineTime ? utcToLocalHHMM(item.deadlineTime) : ''} onChange={(e) => onUpdate(item.id, 'deadlineTime', e.target.value ? localToUtcHHMM(e.target.value) : null)} disabled={!item.deadline} className={`${shared.inputCls} ${s.inputTime}`} style={{ opacity: item.deadline ? 1 : 0.35 }} />
      </div>
    </div>
  );
}

/** Maps each variant name to its dedicated row component. */
const ITEM_ROW = {
  daily:    DailyTaskRow,
  periodic: PeriodicTaskRow,
  event:    EventTaskRow,
};

/** Maps each variant name to its dedicated add form component. */
const ADD_FORM = {
  daily:    ({ game, typeOpts, onAdd, onCancel }) => <DailyAddForm    typeOpts={typeOpts} gameResetTime={game.resetTime} onAdd={onAdd} onCancel={onCancel} />,
  periodic: ({ game, typeOpts, onAdd, onCancel }) => <PeriodicAddForm typeOpts={typeOpts} onAdd={onAdd} onCancel={onCancel} />,
  event:    ({ game, onAdd, onCancel })            => <EventAddForm    defaultTime={game.resetTime} onAdd={onAdd} onCancel={onCancel} />,
};

function ImageDropZone({ currentDataUrl, onFile, onRemove, mode = 'large' }) {
  const [over, setOver] = useState(false);
  const fileRef = useRef(null);
  const handleDrop = (e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f && f.type.startsWith('image/')) onFile(f); };

  if (mode === 'compact') {
    return (
      <div className={s.imgBtnCompactWrap}>
        <button className={s.imgBtn} title={t('imgSetBg')} onClick={() => fileRef.current?.click()} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={handleDrop} style={over ? { borderColor: 'var(--link)' } : undefined}>
          {currentDataUrl ? <img src={currentDataUrl} className={s.imgBtnThumb} draggable={false} /> : <span>🖼️</span>}
        </button>
        {currentDataUrl && (
          <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className={s.imgBtnRemove}>✕</button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className={shared.hidden} onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
      </div>
    );
  }

  return (
    <div>
      {currentDataUrl ? (
        <div className={s.thumbRow}>
          <img src={currentDataUrl} className={s.thumb} draggable={false} />
          <span className={s.thumbInfo}>{t('appBgSet')}</span>
          <button onClick={() => fileRef.current?.click()} className={`${shared.btn} ${shared.btnAdd}`}>{t('imgChange')}</button>
          <button onClick={onRemove} className={`${shared.btn} ${shared.btnDanger}`}>{t('delete')}</button>
        </div>
      ) : (
        <button className={`${s.dropZone} ${s.dropZoneLarge}${over ? ` ${s.dropZoneOver}` : ""}`} onClick={() => fileRef.current?.click()} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={handleDrop}>
          {t('imgDrop')}
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" className={shared.hidden} onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
    </div>
  );
}


// ── GameItemSection ───────────────────────────────────────────────
// Renders one editable item group inside a game card.
// `variant` must be one of: 'daily' | 'periodic' | 'event'.
// The corresponding row component is resolved via ITEM_ROW — no if/else needed here.
function GameItemSection({ game, items, variant, typeOpts, headerLabel, addKey, addTo, onAddToChange, itemDnd, onUpdate, onDelete, onAdd }) {
  const TaskRowComponent = ITEM_ROW[variant];

  return (
    <TaskSection
      header={(items.length > 0 || addTo === addKey) && <div className={s.eventSep}>— {headerLabel} —</div>}
      items={items}
      wrapItem={(item) => {
        const ti       = (game.items ?? []).indexOf(item);
        const dndProps = itemDnd.itemProps(game.id, ti);
        const dndStyle = { ...itemDnd.dropStyle(game.id, ti), opacity: itemDnd.isDragging(game.id, ti) ? 0.4 : 1 };
        return (
          <motion.div key={item.id} variants={taskItemVariants} initial="initial" animate="animate" exit="exit" className={shared.clipContents}>
            <TaskRowComponent
              item={item}
              dndProps={dndProps}
              dndStyle={dndStyle}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          </motion.div>
        );
      }}
      addSlot={addTo === addKey ? (
        ADD_FORM[variant]({ game, typeOpts, onAdd: (item) => { onAdd(item); onAddToChange(null); }, onCancel: () => onAddToChange(null) })
      ) : (
        <button onClick={() => onAddToChange(addKey)} className={`${shared.btn} ${shared.btnAdd} ${s.addTaskBtn}`}>＋{headerLabel}</button>
      )}
    />
  );
}

// ── SettingsModal ─────────────────────────────────────────────────
export function SettingsModal({ games, setGames, onClose, showConfirm, refreshImages, onUpdate, sortUncheckedFirst, onSortUncheckedFirst, showSectionHeaders, onShowSectionHeaders, autoDeleteExpired, onAutoDeleteExpired, autoDeleteDays, onAutoDeleteDays }) {
  const [newGame,  setNewGame]  = useState({ name: '', color: '#4a9eff', resetTime: '00:00' });
  const [showNG,   setShowNG]   = useState(false);
  const [addTo,    setAddTo]    = useState(null);
  const importRef = useRef(null);

  // Version panel state
  const [verState, setVerState] = useState(null); // null | 'checking' | { current, latest, hasUpdate } | 'error'

  const [cropFile,     setCropFile]     = useState(null);
  const [cropTarget,   setCropTarget]   = useState(null);
  const [appBgThumb,   setAppBgThumb]   = useState(null);
  const [gameBgThumbs, setGameBgThumbs] = useState({});

  // Load image thumbnails on mount
  useEffect(() => {
    imgGet('app-bg').then((v) => setAppBgThumb(v?.dataUrl ?? null));
    games.forEach((g) => imgGet(`game-${g.id}`).then((v) => {
      if (v) setGameBgThumbs((prev) => ({ ...prev, [g.id]: v.dataUrl }));
    }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openCrop = (target, file) => { setCropTarget(target); setCropFile(file); };

  const handleCheckVersion = async () => {
    setVerState('checking');
    try {
      const [cachedRes, netRes] = await Promise.all([
        fetch('./version.json'),
        fetch('./version.json?check=' + Date.now()),
      ]);
      if (!cachedRes.ok || !netRes.ok) throw new Error('fetch failed');
      const [cached, net] = await Promise.all([cachedRes.json(), netRes.json()]);
      setVerState({ current: cached.version ?? '?', latest: net.version ?? '?', hasUpdate: net.version && net.version !== cached.version });
    } catch {
      setVerState('error');
    }
  };

  const handleDoUpdate = async () => {
    if (!('serviceWorker' in navigator)) return;
    setVerState('updating');

    try {
      const reg = await navigator.serviceWorker.ready;

      // Send SKIP_WAITING to the waiting SW, then reload when the new SW takes control.
      const activateAndReload = () => {
        // Signal App.jsx to show a "update complete" toast after the page reloads.
        try { localStorage.setItem('app-updated', '1'); } catch {}
        setVerState('reloading');
        // Register the controllerchange listener BEFORE posting SKIP_WAITING.
        // If the listener were added after postMessage, a fast-responding SW could
        // fire controllerchange before the listener is in place, causing reload() to
        // never be called.
        navigator.serviceWorker.addEventListener(
          'controllerchange',
          () => window.location.reload(),
          { once: true },
        );
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      };

      // Fast path: new SW is already waiting (App-level detection already ran).
      if (reg.waiting) {
        activateAndReload();
        return;
      }

      // Slow path: version.json showed a new build but the new SW hasn't been
      // downloaded yet. Force a SW update check and wait for it to reach the
      // 'installed' (waiting) state before activating.
      await reg.update();

      let settled = false;

      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        // Timed out — preserve version numbers so the user can retry.
        setVerState((prev) => ({
          ...(typeof prev === 'object' && prev !== null ? prev : {}),
          hasUpdate: true,
          timedOut: true,
        }));
      }, 20_000);

      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && !settled) {
            settled = true;
            clearTimeout(timeout);
            activateAndReload();
          }
        });
      }, { once: true });

      // Race: another tab may have already advanced the SW to waiting.
      if (reg.waiting && !settled) {
        settled = true;
        clearTimeout(timeout);
        activateAndReload();
      }
    } catch {
      setVerState('error');
    }
  };

  const handleCropConfirm = async (dataUrl, opacity) => {
    if (!cropTarget) return;
    await imgSet(cropTarget, dataUrl, opacity);
    if (cropTarget === 'app-bg') {
      setAppBgThumb(dataUrl);
    } else {
      const id = cropTarget.replace('game-', '');
      setGameBgThumbs((prev) => ({ ...prev, [id]: dataUrl }));
    }
    setCropFile(null); setCropTarget(null); refreshImages();
  };

  const handleCropCancel = () => { setCropFile(null); setCropTarget(null); };

  const removeAppBg = async () => { await imgDelete('app-bg'); setAppBgThumb(null); refreshImages(); };
  const removeGameBg = async (gameId) => {
    await imgDelete(`game-${gameId}`);
    setGameBgThumbs((prev) => { const n = { ...prev }; delete n[gameId]; return n; });
    refreshImages();
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify({ games }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = `daily-tracker-settings-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result), imported = parsed.games ?? parsed;
        if (!Array.isArray(imported)) throw new Error('invalid');
        const fresh = imported.map((g) => ({ ...g, id: uid(), items: (g.items ?? []).map((it) => ({ ...it, id: uid() })) }));
        showConfirm(t('importConfirm', { n: fresh.length }), () => setGames(fresh), t('loadBtn'));
      } catch { alert(t('importError')); }
    };
    reader.readAsText(file); e.target.value = '';
  };

  // ── Drag-and-drop: games (flat list) ────────────────────────────
  const gameDnd = useDragSort(useCallback((from, to) =>
    setGames((g) => { const a = [...g]; const [it] = a.splice(from, 1); a.splice(to, 0, it); return a; }),
  []));

  // ── Drag-and-drop: items (tasks and events, scoped by game.id) ───
  const itemDnd = useScopedDragSort(useCallback((gid, from, to) =>
    setGames((g) => g.map((gm) => {
      if (gm.id !== gid) return gm;
      const items = [...(gm.items ?? [])]; const [it] = items.splice(from, 1); items.splice(to, 0, it);
      return { ...gm, items };
    })),
  []));

  const upGame  = (id, f, v) => setGames((g) => g.map((gm) => gm.id === id ? { ...gm, [f]: v } : gm));
  const delGame = (id, name) => showConfirm(t('deleteMsg', { name }), async () => {
    await imgDelete(`game-${id}`);
    setGameBgThumbs((prev) => { const n = { ...prev }; delete n[id]; return n; });
    setGames((g) => g.filter((gm) => gm.id !== id));
    refreshImages();
  });
  const addGame = () => {
    if (!newGame.name.trim()) return;
    setGames((g) => [...g, { id: uid(), ...newGame, resetTime: localToUtcHHMM(newGame.resetTime), items: [] }]);
    setNewGame({ name: '', color: '#4a9eff', resetTime: '00:00' }); setShowNG(false);
  };

  // ── Unified item operations ──────────────────────────────────────
  const upItem  = (gid, iid, f, v) => setGames((g) => g.map((gm) => gm.id === gid ? { ...gm, items: (gm.items ?? []).map((it) => it.id === iid ? { ...it, [f]: v } : it) } : gm));
  const delItem = (gid, iid)       => setGames((g) => g.map((gm) => gm.id === gid ? { ...gm, items: (gm.items ?? []).filter((it) => it.id !== iid) } : gm));

  return (
    <>
      {cropFile && <CropModal file={cropFile} onConfirm={handleCropConfirm} onCancel={handleCropCancel} />}

      <Modal
        title={`⚙️ ${t('settings')}`}
        titleExtra={
          <>
            <button onClick={handleExport}                     className={`${shared.btn} ${shared.btnAdd}`} title={t('exportSettings')}>📤</button>
            <button onClick={() => importRef.current?.click()} className={`${shared.btn} ${shared.btnAdd}`} title={t('importSettings')}>📥</button>
            <input ref={importRef} type="file" accept=".json,application/json" className={shared.hidden} onChange={handleImportFile} />
          </>
        }
        onClose={onClose}
      >
        <div className={s.list}>

          <AnimatePresence initial={false}>
            {games.map((game, gi) => (
              <motion.div
                key={game.id}
                variants={itemVariants}
                initial="initial" animate="animate" exit="exit"
                className={shared.clipContents}
              >
                <div
                  {...gameDnd.itemProps(gi)}
                  className={s.gameItem}
                  style={{ ...gameDnd.dropStyle(gi), border: `1px solid ${game.color}44`, opacity: gameDnd.isDragging(gi) ? 0.4 : 1, transition: 'opacity 0.15s' }}
                >
                  <div className={s.gameHeader}>
                    {DragHandle}
                    <input type="color" value={game.color} onChange={(e) => upGame(game.id, 'color', e.target.value)} className={s.colorInput} />
                    <input value={game.name} onChange={(e) => upGame(game.id, 'name', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} className={`${s.nameInput} ${shared.inputCls}`} placeholder={t('gameName')} />
                    <span className={s.resetLbl}>{t('resetLbl')}</span>
                    <input type="time" value={utcToLocalHHMM(game.resetTime)} onChange={(e) => upGame(game.id, 'resetTime', localToUtcHHMM(e.target.value))} className={`${shared.inputCls} ${s.inputTimeGame}`} />
                    <ImageDropZone currentDataUrl={gameBgThumbs[game.id] || null} onFile={(file) => openCrop(`game-${game.id}`, file)} onRemove={() => removeGameBg(game.id)} mode="compact" />
                    <button onClick={() => delGame(game.id, game.name)} className={`${shared.btn} ${shared.btnDanger}`}>✕</button>
                  </div>

                  <div className={s.gameBody}>
                    {/* ── Section 1: Daily / Web-daily ── */}
                    <GameItemSection
                      game={game}
                      variant="daily"
                      items={(game.items ?? []).filter((it) => it.type === 'daily' || it.type === 'webdaily')}
                      typeOpts={DAILY_TYPE_OPTS}
                      headerLabel={t('types.daily')}
                      addKey={`daily-${game.id}`}
                      addTo={addTo}
                      onAddToChange={setAddTo}
                      itemDnd={itemDnd}
                      onUpdate={(iid, f, v) => upItem(game.id, iid, f, v)}
                      onDelete={(iid) => delItem(game.id, iid)}
                      onAdd={(task) => setGames((g) => g.map((gm) => gm.id === game.id ? { ...gm, items: [...(gm.items ?? []), { id: uid(), ...task }] } : gm))}
                    />

                    {/* ── Section 2: Periodic tasks ── */}
                    <GameItemSection
                      game={game}
                      variant="periodic"
                      items={(game.items ?? []).filter((it) => it.type === 'weekly' || it.type === 'halfmonthly' || it.type === 'monthly')}
                      typeOpts={PERIODIC_TYPE_OPTS}
                      headerLabel={t('periodic')}
                      addKey={`periodic-${game.id}`}
                      addTo={addTo}
                      onAddToChange={setAddTo}
                      itemDnd={itemDnd}
                      onUpdate={(iid, f, v) => upItem(game.id, iid, f, v)}
                      onDelete={(iid) => delItem(game.id, iid)}
                      onAdd={(task) => setGames((g) => g.map((gm) => gm.id === game.id ? { ...gm, items: [...(gm.items ?? []), { id: uid(), ...task }] } : gm))}
                    />

                    {/* ── Section 3: Events ── */}
                    <GameItemSection
                      game={game}
                      variant="event"
                      items={(game.items ?? []).filter((it) => EVENT_TYPES.has(it.type))}
                      headerLabel={t('events')}
                      addKey={`event-${game.id}`}
                      addTo={addTo}
                      onAddToChange={setAddTo}
                      itemDnd={itemDnd}
                      onUpdate={(iid, f, v) => upItem(game.id, iid, f, v)}
                      onDelete={(iid) => delItem(game.id, iid)}
                      onAdd={(item) => setGames((g) => g.map((gm) => gm.id === game.id ? { ...gm, items: [...(gm.items ?? []), { ...item, type: 'event' }] } : gm))}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {showNG ? (
              <motion.div
                key="newgame"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto', transition: { duration: 0.18 } }}
                exit={{    opacity: 0, height: 0,      transition: { duration: 0.14 } }}
                className={shared.clipContents}
              >
                <div className={s.newGameBox}>
                  <div className={s.newGameHeader}>
                    <input type="color" value={newGame.color} onChange={(e) => setNewGame((g) => ({ ...g, color: e.target.value }))} className={s.colorInput} />
                    <input value={newGame.name} onChange={(e) => setNewGame((g) => ({ ...g, name: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && addGame()} className={`${shared.inputCls} ${shared.flexInput}`} placeholder={t('gameName')} autoFocus />
                    <span className={s.resetLbl}>{t('resetLbl')}</span>
                    <input type="time" value={newGame.resetTime} onChange={(e) => setNewGame((g) => ({ ...g, resetTime: e.target.value }))} className={`${shared.inputCls} ${s.inputTimeGame}`} />
                  </div>
                  <div className={s.newGameActions}>
                    <button onClick={addGame}                className={`${shared.btn} ${shared.btnConfirm}`}>{t('add')}</button>
                    <button onClick={() => setShowNG(false)} className={shared.btn}>{t('cancel')}</button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.button
                key="addgamebtn"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.15 } }}
                exit={{    opacity: 0, transition: { duration: 0.1  } }}
                className={s.addGameBtn}
                onClick={() => setShowNG(true)}
              >
                {t('addGame')}
              </motion.button>
            )}
          </AnimatePresence>

          <div className={s.listSeparator} />

          <div className={s.imgSection}>
            <div className={s.imgSectionTitle}>{t('appBgImage')}</div>
            <ImageDropZone currentDataUrl={appBgThumb} onFile={(file) => openCrop('app-bg', file)} onRemove={removeAppBg} mode="large" />
          </div>

          <div className={s.listSeparator} />

          {/* Show section headers */}
          <label className={s.prefRow}>
            <input
              type="checkbox"
              checked={!!showSectionHeaders}
              onChange={(e) => onShowSectionHeaders(e.target.checked)}
              className={s.prefCheck}
            />
            <span className={s.prefLabel}>{t('showSectionHeaders')}</span>
          </label>

          {/* Sort unchecked games first */}
          <label className={s.prefRow}>
            <input
              type="checkbox"
              checked={!!sortUncheckedFirst}
              onChange={(e) => onSortUncheckedFirst(e.target.checked)}
              className={s.prefCheck}
            />
            <span className={s.prefLabel}>{t('sortUncheckedFirst')}</span>
          </label>

          {/* Auto-delete expired events */}
          <label className={s.prefRow}>
            <input
              type="checkbox"
              checked={!!autoDeleteExpired}
              onChange={(e) => onAutoDeleteExpired(e.target.checked)}
              className={s.prefCheck}
            />
            <span className={s.prefLabel}>{t('autoDeleteExpired')}</span>
            <input
              type="number"
              min="0"
              value={autoDeleteDays}
              onChange={(e) => onAutoDeleteDays(e.target.value)}
              disabled={!autoDeleteExpired}
              className={`${shared.inputCls} ${s.prefDayInput}${!autoDeleteExpired ? ` ${s.prefDayDisabled}` : ''}`}
            />
            <span className={`${s.prefLabel}${!autoDeleteExpired ? ` ${s.prefDayDisabled}` : ''}`}>{t('autoDeleteDaysUnit')}</span>
          </label>

          <div className={s.listSeparator} />

          {/* Version panel */}
          <div className={s.verPanel}>
            <div className={s.verPanelHeader}>
              <span className={s.verPanelTitle}>{t('verPanel')}</span>
              <button
                className={`${shared.btn} ${shared.btnAdd}`}
                onClick={handleCheckVersion}
                disabled={verState === 'checking' || verState === 'updating' || verState === 'reloading'}
              >
                {verState === 'checking' ? t('verChecking') : t('verCheck')}
              </button>
            </div>
            {verState && verState !== 'checking' && (
              <div className={s.verPanelBody}>
                {verState === 'error' ? (
                  <span className={s.verError}>{t('verUnavail')}</span>
                ) : verState === 'updating' ? (
                  <span className={s.verChecking}>⏳ {t('verUpdating')}</span>
                ) : verState === 'reloading' ? (
                  <span className={s.verChecking}>🔄 {t('verReloading')}</span>
                ) : (
                  <>
                    <span className={s.verRow}><span className={s.verLbl}>{t('verCurrent')}</span><span className={s.verVal}>{verState.current}</span></span>
                    <span className={s.verRow}><span className={s.verLbl}>{t('verLatest')}</span><span className={s.verVal}>{verState.latest}</span></span>
                    {verState.timedOut ? (
                      <span className={s.verError}>{t('verUpdateFailed')}</span>
                    ) : verState.hasUpdate ? (
                      <button className={`${shared.btn} ${shared.btnConfirm} ${s.verUpdateBtn}`} onClick={handleDoUpdate}>{t('verUpdate')}</button>
                    ) : (
                      <span className={s.verUpToDate}>✓ {t('verUpToDate')}</span>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

        </div>
      </Modal>
    </>
  );
}
