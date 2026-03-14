import { useState, useRef, useEffect, useCallback } from 'react';
import { useDragSort, useScopedDragSort } from '../util/useDragSort';
import { motion, AnimatePresence } from 'motion/react';
import { t } from '../util/i18n';
import {uid, utcToLocalHHMM, localToUtcHHMM} from '../util/helpers';
import { imgGet, imgSet, imgDelete } from '../util/imageStorage';
import { useAppUpdate } from '../util/useAppUpdate';
import { Modal, TaskSection, BADGE_MAP, Row } from './UI';
import { ContextMenu } from './ContextMenu';
import { CropModal } from './CropModal';
import { InlineAddForm } from './InlineAddForm';
import s from './Settings.module.css';
import shared from './shared.module.css';

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

// All available item types for the unified type selector
const ALL_TYPE_OPTS = ['daily', 'weekly', 'monthly', 'halfmonthly', 'event'];

/** Unified settings row for all item types. Branches internally on item.type. */
/** Unified settings row for all item types. Uses Row component matching main-screen slot structure:
 *   barSlot=DragHandle | badgeSlot=badge | content=nameInput | meta=resetControls | deleteSlot=✕
 */
function ItemTaskRow({ item, dndProps, dndStyle, onUpdate, onDelete }) {
  const resetMeta =
    item.type === 'daily' ? (
      <div className={s.resetGroup}>
        <span className={s.resetLbl}>{t('resetLbl')}</span>
        <div className={s.resetInputWrap}>
          <input type="time" value={utcToLocalHHMM(item.resetTime ?? '00:00')} onChange={(e) => onUpdate(item.id, 'resetTime', localToUtcHHMM(e.target.value))} className={`${shared.inputCls} ${s.inputTime}`} />
        </div>
      </div>
    ) : item.type === 'weekly' ? (
      <div className={s.resetGroup}>
        <span className={s.resetLbl}>{t('resetLbl')}</span>
        <div className={s.resetInputWrap}>
          <select value={item.weeklyResetDay ?? 1} onChange={(e) => onUpdate(item.id, 'weeklyResetDay', Number(e.target.value))} className={`${shared.inputCls} ${s.inputDow}`}>
            {[0,1,2,3,4,5,6].map((d) => <option key={d} value={d}>{t('dayNamesFull.' + d)}</option>)}
          </select>
        </div>
      </div>
    ) : item.type === 'monthly' ? (
      <div className={s.resetGroup}>
        <span className={s.resetLbl}>{t('resetLbl')}</span>
        <div className={s.resetInputWrap}>
          <input type="number" min="1" max="28" value={item.monthlyResetDay ?? 1} onChange={(e) => onUpdate(item.id, 'monthlyResetDay', Math.max(1, Math.min(28, parseInt(e.target.value) || 1)))} className={`${shared.inputCls} ${s.inputNumber}`} />
          <span className={s.resetLbl}>{t('dayUnit')}</span>
        </div>
      </div>
    ) : item.type === 'halfmonthly' ? (
      <div className={s.resetGroup}>
        <span className={s.resetLbl}>{t('resetLbl')}</span>
        <div className={s.resetInputWrap}>
          <input type="number" min="1" max="15" value={item.halfMonthlyStartDay ?? 1} onChange={(e) => onUpdate(item.id, 'halfMonthlyStartDay', Math.max(1, Math.min(15, parseInt(e.target.value) || 1)))} className={`${shared.inputCls} ${s.inputNumber}`} />
          <span className={s.resetLbl}>{t('halfMonthSuffix', { b: (item.halfMonthlyStartDay ?? 1) + 15 })}</span>
        </div>
      </div>
    ) : item.type === 'event' ? (
      <div className={s.resetGroup}>
        <span className={s.resetLbl}>{t('resetLbl')}</span>
        <input type="date" value={item.deadline ?? ''} onChange={(e) => onUpdate(item.id, 'deadline', e.target.value || null)} className={`${shared.inputCls} ${s.inputDate}`} />
        <input type="time" value={item.deadlineTime ? utcToLocalHHMM(item.deadlineTime) : ''} onChange={(e) => onUpdate(item.id, 'deadlineTime', e.target.value ? localToUtcHHMM(e.target.value) : null)} disabled={!item.deadline} className={`${shared.inputCls} ${s.inputTime}`} style={{ opacity: item.deadline ? 1 : 0.35 }} />
      </div>
    ) : null;

  return (
    <Row
      rootProps={dndProps}
      className={s.taskRow}
      style={dndStyle}
      barSlot={<span className={s.dragHandle}>⠿</span>}
      badgeSlot={
        <span className={`${shared.taskBadge} ${BADGE_MAP[item.type]}`}>
          <span className={shared.badgeText}>{t(`types.${item.type}`)}</span>
        </span>
      }
      content={
        <input
          value={item.name}
          onChange={(e) => onUpdate(item.id, 'name', e.target.value)}
          className={`${shared.inputCls} ${s.taskName}`}
          placeholder={t(`types.${item.type}`)}
        />
      }
      meta={resetMeta}
      deleteSlot={
        <button onClick={() => onDelete(item.id)} className={`${shared.btn} ${shared.btnDanger}`}>✕</button>
      }
    />
  );
}

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


// ── TYPE_PICK_OPTS: type picker options ───────────────────────────
const TYPE_PICK_OPTS = ['daily', 'weekly', 'monthly', 'halfmonthly', 'event'];

// ── GameItemList ──────────────────────────────────────────────────
// Renders all items of a game in a unified list with a single "+ Task" button.
// Clicking the button pops a ContextMenu to pick a type; selecting opens InlineAddForm.
function GameItemList({ game, itemDnd, onUpdate, onDelete, onAdd }) {
  const allItems  = game.items ?? [];
  const btnRef    = useRef(null);
  const [addType,    setAddType]    = useState(undefined); // undefined=hidden, string=form open
  const [pickerPos, setPickerPos] = useState(null); // {x, y} when picker is open

  const handleAdd = (item) => { onAdd(item); setAddType(undefined); };

  const openPicker = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPickerPos({ x: r.left, y: r.bottom + 4 });
  };

  const closePicker = () => setPickerPos(null);

  const pickerItems = TYPE_PICK_OPTS.map((ty) => ({
    label: t(`types.${ty}`),
    onClick: () => { closePicker(); setAddType(ty); },
  }));

  return (
    <>
      <TaskSection
        items={allItems}
        wrapItem={(item) => {
          const ti       = allItems.indexOf(item);
          const dndProps = itemDnd.itemProps(game.id, ti);
          const dndStyle = { ...itemDnd.dropStyle(game.id, ti), opacity: itemDnd.isDragging(game.id, ti) ? 0.4 : 1 };
          return (
            <motion.div key={item.id} variants={taskItemVariants} initial="initial" animate="animate" exit="exit" className={shared.clipContents}>
              <ItemTaskRow item={item} dndProps={dndProps} dndStyle={dndStyle} onUpdate={onUpdate} onDelete={onDelete} />
            </motion.div>
          );
        }}
        addSlot={
          addType
            ? <InlineAddForm type={addType} game={game} onAdd={handleAdd} onCancel={() => setAddType(undefined)} />
            : <button ref={btnRef} onClick={openPicker} className={`${shared.btn} ${shared.btnAdd} ${s.addTaskBtn}`}>＋{t('addTask')}</button>
        }
      />
      <AnimatePresence>
        {pickerPos && <ContextMenu key="type-picker" x={pickerPos.x} y={pickerPos.y} items={pickerItems} onClose={closePicker} />}
      </AnimatePresence>
    </>
  );
}

// ── SettingsModal ─────────────────────────────────────────────────
export function SettingsModal({ games, setGames, onClose, showConfirm, refreshImages, prefs, onPrefs }) {
  const [newGame,  setNewGame]  = useState({ name: '', color: '#4a9eff', resetTime: '00:00' });
  const [showNG,   setShowNG]   = useState(false);
  const importRef = useRef(null);

  // Version panel state — managed by useAppUpdate
  const { verState, checkVersion, doUpdate } = useAppUpdate();

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
                    <input value={game.name} onChange={(e) => upGame(game.id, 'name', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} className={`${s.gameName} ${shared.inputCls}`} placeholder={t('gameName')} />
                    <span className={s.resetLbl}>{t('resetLbl')}</span>
                    <input type="time" value={utcToLocalHHMM(game.resetTime)} onChange={(e) => upGame(game.id, 'resetTime', localToUtcHHMM(e.target.value))} className={`${shared.inputCls} ${s.resetTime}`} />
                    <ImageDropZone currentDataUrl={gameBgThumbs[game.id] || null} onFile={(file) => openCrop(`game-${game.id}`, file)} onRemove={() => removeGameBg(game.id)} mode="compact" />
                    <button onClick={() => delGame(game.id, game.name)} className={`${shared.btn} ${shared.btnDanger}`}>✕</button>
                  </div>

                  <div className={s.gameBody}>
                    <GameItemList
                      game={game}
                      itemDnd={itemDnd}
                      onUpdate={(iid, f, v) => upItem(game.id, iid, f, v)}
                      onDelete={(iid) => delItem(game.id, iid)}
                      onAdd={(item) => setGames((g) => g.map((gm) => gm.id === game.id ? { ...gm, items: [...(gm.items ?? []), { id: uid(), type: item.type, ...item }] } : gm))}
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
                    <input type="time" value={newGame.resetTime} onChange={(e) => setNewGame((g) => ({ ...g, resetTime: e.target.value }))} className={`${shared.inputCls} ${s.resetTime}`} />
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
              checked={!!prefs.showSectionHeaders}
              onChange={(e) => onPrefs('showSectionHeaders', e.target.checked)}
              className={s.prefCheck}
            />
            <span className={s.prefLabel}>{t('showSectionHeaders')}</span>
          </label>

          {/* Sort unchecked games first */}
          <label className={s.prefRow}>
            <input
              type="checkbox"
              checked={!!prefs.sortUncheckedFirst}
              onChange={(e) => onPrefs('sortUncheckedFirst', e.target.checked)}
              className={s.prefCheck}
            />
            <span className={s.prefLabel}>{t('sortUncheckedFirst')}</span>
          </label>

          {/* Auto-delete expired events */}
          <label className={s.prefRow}>
            <input
              type="checkbox"
              checked={!!prefs.autoDeleteExpired}
              onChange={(e) => onPrefs('autoDeleteExpired', e.target.checked)}
              className={s.prefCheck}
            />
            <span className={s.prefLabel}>{t('autoDeleteExpired')}</span>
            <input
              type="number"
              min="0"
              value={prefs.autoDeleteDays}
              onChange={(e) => onPrefs('autoDeleteDays', e.target.value)}
              disabled={!prefs.autoDeleteExpired}
              className={`${shared.inputCls} ${s.prefDayInput}${!prefs.autoDeleteExpired ? ` ${s.prefDayDisabled}` : ''}`}
            />
            <span className={`${s.prefLabel}${!prefs.autoDeleteExpired ? ` ${s.prefDayDisabled}` : ''}`}>{t('autoDeleteDaysUnit')}</span>
          </label>

          <div className={s.listSeparator} />

          {/* Version panel */}
          <div className={s.verPanel}>
            <div className={s.verPanelHeader}>
              <span className={s.verPanelTitle}>{t('verPanel')}</span>
              <button
                className={`${shared.btn} ${shared.btnAdd}`}
                onClick={checkVersion}
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
                      <button className={`${shared.btn} ${shared.btnConfirm} ${s.verUpdateBtn}`} onClick={doUpdate}>{t('verUpdate')}</button>
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
