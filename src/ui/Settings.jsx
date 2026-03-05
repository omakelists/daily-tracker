import { useState, useRef } from 'react';
import { cx } from '../util/cx';
import { t } from '../util/i18n';
import { uid, utcToLocalHHMM, localToUtcHHMM } from '../constants';
import { imgGet, imgSet, imgDelete } from '../util/imageStorage';
import { inputCls, Modal, sharedStyles as ss } from './UI';
import { CropModal } from './CropModal';
import s from './Settings.module.css';

const TYPE_OPTS = ['daily', 'weekly', 'webdaily', 'monthly', 'halfmonthly'];
const DragHandle = <span className={s.dragHandle}>⠿</span>;

function TypeSelect({ value, onChange, style }) {
  return (
    <select value={value} onChange={onChange} className={inputCls} style={style}>
      {TYPE_OPTS.map((ty) => <option key={ty} value={ty}>{t(`types.${ty}`)}</option>)}
    </select>
  );
}

function TaskExtraFields({ task, onChange }) {
  return (
    <>
      {task.type === 'webdaily' && (
        <>
          <span className={s.extraLbl}>{t('resetLbl')}</span>
          <input type="time" value={utcToLocalHHMM(task.webResetTime ?? '00:00')} onChange={(e) => onChange('webResetTime', localToUtcHHMM(e.target.value))} className={inputCls} style={{ width: 84, fontFamily: 'monospace' }} />
        </>
      )}
      {task.type === 'monthly' && (
        <>
          <span className={s.extraLbl}>{t('resetDay')}</span>
          <input type="number" min="1" max="28" value={task.monthlyResetDay ?? 1} onChange={(e) => onChange('monthlyResetDay', Math.max(1, Math.min(28, parseInt(e.target.value) || 1)))} className={inputCls} style={{ width: 52, fontFamily: 'monospace', textAlign: 'center' }} />
          <span className={s.extraLbl}>{t('dayUnit')}</span>
        </>
      )}
    </>
  );
}

function ImageDropZone({ currentDataUrl, onFile, onRemove, mode = 'large' }) {
  const [over, setOver] = useState(false);
  const fileRef = useRef(null);
  const handleDrop = (e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f && f.type.startsWith('image/')) onFile(f); };

  if (mode === 'compact') {
    return (
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <button className={s.imgBtn} title={t('imgSetBg')} onClick={() => fileRef.current?.click()} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={handleDrop} style={over ? { borderColor: 'var(--link)' } : undefined}>
          {currentDataUrl ? <img src={currentDataUrl} className={s.imgBtnThumb} draggable={false} /> : <span>🖼️</span>}
        </button>
        {currentDataUrl && (
          <button onClick={(e) => { e.stopPropagation(); onRemove(); }} style={{ position: 'absolute', top: -5, right: -5, width: 14, height: 14, borderRadius: '50%', background: 'var(--danger)', border: 'none', color: 'white', fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>✕</button>
        )}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
      </div>
    );
  }

  return (
    <div>
      {currentDataUrl ? (
        <div className={s.thumbRow}>
          <img src={currentDataUrl} className={s.thumb} draggable={false} />
          <span className={s.thumbInfo}>{t('appBgSet')}</span>
          <button onClick={() => fileRef.current?.click()} className={cx(ss.btn, ss.btnAdd)}>{t('imgChange')}</button>
          <button onClick={onRemove} className={cx(ss.btn, ss.btnDanger)}>{t('delete')}</button>
        </div>
      ) : (
        <button className={cx(s.dropZone, s.dropZoneLarge, over && s.dropZoneOver)} onClick={() => fileRef.current?.click()} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={handleDrop}>
          {t('imgDrop')}
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
    </div>
  );
}

// ── SettingsModal ─────────────────────────────────────────────────
export function SettingsModal({ games, setGames, onClose, showConfirm, refreshImages }) {
  const [newGame,     setNewGame]     = useState({ name: '', color: '#4a9eff', resetTime: '00:00' });
  const [showNG,      setShowNG]      = useState(false);
  const [newTask,     setNewTask]     = useState({ name: '', type: 'daily', webResetTime: '00:00', monthlyResetDay: 1 });
  const [addTo,       setAddTo]       = useState(null);
  const [deletingIds, setDeletingIds] = useState(new Set());
  const importRef = useRef(null);

  const [cropFile,   setCropFile]   = useState(null);
  const [cropTarget, setCropTarget] = useState(null);
  const [appBgThumb,   setAppBgThumb]   = useState(null);
  const [gameBgThumbs, setGameBgThumbs] = useState({});

  useState(() => {
    imgGet('app-bg').then((v) => setAppBgThumb(v?.dataUrl ?? null));
    games.forEach((g) => imgGet(`game-${g.id}`).then((v) => {
      if (v) setGameBgThumbs((prev) => ({ ...prev, [g.id]: v.dataUrl }));
    }));
  });

  const openCrop = (target, file) => { setCropTarget(target); setCropFile(file); };

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

  const animateDelete = (id, doDelete) => {
    setDeletingIds((prev) => { const st = new Set(prev); st.add(id); return st; });
    setTimeout(() => { doDelete(); setDeletingIds((prev) => { const st = new Set(prev); st.delete(id); return st; }); }, 190);
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
        const fresh = imported.map((g) => ({ ...g, id: uid(), tasks: (g.tasks ?? []).map((tk) => ({ ...tk, id: uid() })) }));
        showConfirm(t('importConfirm', { n: fresh.length }), () => setGames(fresh));
      } catch { alert(t('importError')); }
    };
    reader.readAsText(file); e.target.value = '';
  };

  const [dgFrom, setDgFrom] = useState(null);
  const [dgOver, setDgOver] = useState(null);
  const [dtDrag, setDtDrag] = useState(null);

  const upGame  = (id, f, v) => setGames((g) => g.map((gm) => gm.id === id ? { ...gm, [f]: v } : gm));
  const delGame = (id, name) => showConfirm(t('deleteMsg', { name }), async () => {
    await imgDelete(`game-${id}`);
    setGameBgThumbs((prev) => { const n = { ...prev }; delete n[id]; return n; });
    animateDelete(id, () => setGames((g) => g.filter((gm) => gm.id !== id)));
    refreshImages();
  });
  const addGame = () => {
    if (!newGame.name.trim()) return;
    setGames((g) => [...g, { id: uid(), ...newGame, resetTime: localToUtcHHMM(newGame.resetTime), tasks: [] }]);
    setNewGame({ name: '', color: '#4a9eff', resetTime: '00:00' }); setShowNG(false);
  };

  const upTask  = (gid, tid, f, v) => setGames((g) => g.map((gm) => gm.id === gid ? { ...gm, tasks: gm.tasks.map((tk) => tk.id === tid ? { ...tk, [f]: v } : tk) } : gm));
  const delTask = (gid, tid) => animateDelete(tid, () => setGames((g) => g.map((gm) => gm.id === gid ? { ...gm, tasks: gm.tasks.filter((tk) => tk.id !== tid) } : gm)));
  const addTask = (gid) => {
    setGames((g) => g.map((gm) => gm.id === gid ? { ...gm, tasks: [...gm.tasks, { id: uid(), ...newTask }] } : gm));
    setNewTask({ name: '', type: 'daily', webResetTime: '00:00', monthlyResetDay: 1 }); setAddTo(null);
  };
  const openAddTask = (gid) => { setAddTo(gid); setNewTask({ name: '', type: 'daily', webResetTime: '00:00', monthlyResetDay: 1 }); };

  const onGameDS  = (i) => (e) => { setDgFrom(i); setDgOver(i); e.dataTransfer.effectAllowed = 'move'; };
  const onGameDO  = (i) => (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dgFrom != null) setDgOver(i); };
  const onGameDrp = (i) => (e) => { e.preventDefault(); if (dgFrom == null || dgFrom === i) { setDgFrom(null); setDgOver(null); return; } setGames((g) => { const a = [...g], [it] = a.splice(dgFrom, 1); a.splice(i, 0, it); return a; }); setDgFrom(null); setDgOver(null); };
  const onGameDE  = () => { setDgFrom(null); setDgOver(null); };

  const onTaskDS  = (gid, i) => (e) => { setDtDrag({ gid, from: i, over: i }); e.dataTransfer.effectAllowed = 'move'; e.stopPropagation(); };
  const onTaskDO  = (gid, i) => (e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move'; if (dtDrag?.gid === gid) setDtDrag((p) => ({ ...p, over: i })); };
  const onTaskDrp = (gid, i) => (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!dtDrag || dtDrag.gid !== gid || dtDrag.from === i) { setDtDrag(null); return; }
    const { from } = dtDrag;
    setGames((g) => g.map((gm) => { if (gm.id !== gid) return gm; const tasks = [...gm.tasks], [it] = tasks.splice(from, 1); tasks.splice(i, 0, it); return { ...gm, tasks }; }));
    setDtDrag(null);
  };
  const onTaskDE = () => setDtDrag(null);

  const gameDrop = (i)      => ({ borderTop: dgFrom != null && dgOver === i && dgFrom !== i ? '2px solid var(--link)' : '2px solid transparent', transition: 'border-color 0.12s' });
  const taskDrop = (gid, i) => ({ borderTop: dtDrag?.gid === gid && dtDrag.over === i && dtDrag.from !== i ? '2px solid var(--link)' : '2px solid transparent', transition: 'border-color 0.12s' });
  const rowStyle = { display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 };

  return (
    <>
      {cropFile && <CropModal file={cropFile} onConfirm={handleCropConfirm} onCancel={handleCropCancel} />}

      <Modal
        title={`⚙️ ${t('settings')}`}
        titleExtra={
          <>
            <button onClick={handleExport}                     className={cx(ss.btn, ss.btnAdd)} title={t('exportSettings')}>📤</button>
            <button onClick={() => importRef.current?.click()} className={cx(ss.btn, ss.btnAdd)} title={t('importSettings')}>📥</button>
            <input ref={importRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={handleImportFile} />
          </>
        }
        onClose={onClose}
      >
        <div className={s.list}>

          <div className={s.imgSection}>
            <div className={s.imgSectionTitle}>{t('appBgImage')}</div>
            <ImageDropZone currentDataUrl={appBgThumb} onFile={(file) => openCrop('app-bg', file)} onRemove={removeAppBg} mode="large" />
          </div>

          {games.map((game, gi) => (
            <div
              key={game.id}
              draggable
              onDragStart={onGameDS(gi)} onDragOver={onGameDO(gi)} onDrop={onGameDrp(gi)} onDragEnd={onGameDE}
              className={cx(s.gameItem, deletingIds.has(game.id) && s.gameItemExit)}
              style={{ ...gameDrop(gi), border: `1px solid ${game.color}44`, opacity: dgFrom === gi ? 0.4 : 1, transition: 'opacity 0.15s' }}
            >
              <div className={s.gameHeader}>
                {DragHandle}
                <input type="color" value={game.color} onChange={(e) => upGame(game.id, 'color', e.target.value)} className={s.colorInput} />
                <input value={game.name} onChange={(e) => upGame(game.id, 'name', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} className={cx(s.nameInput, inputCls)} placeholder={t('gameName')} />
                <span className={s.resetLbl}>{t('resetLbl')}</span>
                <input type="time" value={utcToLocalHHMM(game.resetTime)} onChange={(e) => upGame(game.id, 'resetTime', localToUtcHHMM(e.target.value))} className={inputCls} style={{ width: 86, fontFamily: 'monospace', flexShrink: 0 }} />
                <ImageDropZone currentDataUrl={gameBgThumbs[game.id] || null} onFile={(file) => openCrop(`game-${game.id}`, file)} onRemove={() => removeGameBg(game.id)} mode="compact" />
                <button onClick={() => delGame(game.id, game.name)} className={cx(ss.btn, ss.btnDanger)}>✕</button>
              </div>

              <div className={s.gameBody}>
                {game.tasks.map((task, ti) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={onTaskDS(game.id, ti)} onDragOver={onTaskDO(game.id, ti)} onDrop={onTaskDrp(game.id, ti)} onDragEnd={onTaskDE}
                    className={cx(s.taskItem, deletingIds.has(task.id) && s.taskItemExit)}
                    style={{ ...taskDrop(game.id, ti), ...rowStyle, opacity: dtDrag?.gid === game.id && dtDrag.from === ti ? 0.4 : 1, transition: 'opacity 0.15s' }}
                  >
                    {DragHandle}
                    <TypeSelect value={task.type} onChange={(e) => upTask(game.id, task.id, 'type', e.target.value)} style={{ width: 104 }} />
                    <input value={task.name} onChange={(e) => upTask(game.id, task.id, 'name', e.target.value)} className={inputCls} style={{ flex: 1, minWidth: 0 }} placeholder={t(`types.${task.type}`)} />
                    <TaskExtraFields task={task} onChange={(f, v) => upTask(game.id, task.id, f, v)} />
                    <button onClick={() => delTask(game.id, task.id)} className={cx(ss.btn, ss.btnDanger)}>✕</button>
                  </div>
                ))}

                {addTo === game.id ? (
                  <div style={rowStyle}>
                    <TypeSelect value={newTask.type} onChange={(e) => setNewTask((p) => ({ ...p, type: e.target.value }))} style={{ width: 104 }} />
                    <input value={newTask.name} onChange={(e) => setNewTask((p) => ({ ...p, name: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && addTask(game.id)} className={inputCls} style={{ flex: 1, minWidth: 0 }} placeholder={t(`types.${newTask.type}`)} autoFocus />
                    <TaskExtraFields task={newTask} onChange={(f, v) => setNewTask((p) => ({ ...p, [f]: v }))} />
                    <button onClick={() => addTask(game.id)} className={cx(ss.btn, ss.btnConfirm)}>{t('add')}</button>
                    <button onClick={() => setAddTo(null)}   className={ss.btn}>✕</button>
                  </div>
                ) : (
                  <button onClick={() => openAddTask(game.id)} className={cx(ss.btn, ss.btnAdd, s.addTaskBtn)}>{t('addTask')}</button>
                )}
              </div>
            </div>
          ))}

          {showNG ? (
            <div className={s.newGameBox}>
              <div className={s.newGameHeader}>
                <input type="color" value={newGame.color} onChange={(e) => setNewGame((g) => ({ ...g, color: e.target.value }))} className={s.colorInput} />
                <input value={newGame.name} onChange={(e) => setNewGame((g) => ({ ...g, name: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && addGame()} className={inputCls} style={{ flex: 1, minWidth: 0 }} placeholder={t('gameName')} autoFocus />
                <span className={s.resetLbl}>{t('resetLbl')}</span>
                <input type="time" value={newGame.resetTime} onChange={(e) => setNewGame((g) => ({ ...g, resetTime: e.target.value }))} className={inputCls} style={{ width: 86, fontFamily: 'monospace' }} />
              </div>
              <div className={s.newGameActions}>
                <button onClick={addGame}                className={cx(ss.btn, ss.btnConfirm)}>{t('add')}</button>
                <button onClick={() => setShowNG(false)} className={ss.btn}>{t('cancel')}</button>
              </div>
            </div>
          ) : (
            <button className={s.addGameBtn} onClick={() => setShowNG(true)}>{t('addGame')}</button>
          )}

        </div>
      </Modal>
    </>
  );
}
