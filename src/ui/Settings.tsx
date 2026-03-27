import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, Dispatch, SetStateAction } from 'react'
import { useDragSort, useScopedDragSort } from '../util/useDragSort'
import { AnimatePresence, motion } from 'motion/react'
import { t } from '../util/i18n'
import { localToUtcHHMM, uid, utcToLocalHHMM, asLocal } from '../util/helpers'
import { ALL_TASK_TYPES, EVENT } from '../constants'
import { imgDelete, imgGet, imgSet } from '../util/imageStorage'
import { useAppUpdate } from '../util/useAppUpdate'
import { Modal } from './UI'
import { ContextMenu } from './ContextMenu'
import type { ContextMenuItem } from './ContextMenu'
import { CropModal } from './CropModal'
import { TaskAddForm } from './TaskAddForm'
import { TaskRow } from './TaskRow'
import { TaskEdit } from './TaskEdit'
import type { Game, Task, TaskType, HexColor } from '../types'
import s from './Settings.module.css'
import shared from './shared.module.css'

// Shared item variants for game/task rows
const itemVariants = {
  initial: { opacity: 0, height: 0, marginBottom: 0 },
  animate: {
    opacity: 1,
    height: 'auto',
    marginBottom: 10,
    transition: { duration: 0.18 },
  },
  exit: {
    opacity: 0,
    height: 0,
    marginBottom: 0,
    transition: { duration: 0.16 },
  },
}
const taskItemVariants = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto', transition: { duration: 0.15 } },
  exit: { opacity: 0, height: 0, transition: { duration: 0.13 } },
}

// ── ImageDropZone ─────────────────────────────────────────────────
interface ImageDropZoneProps {
  currentDataUrl: string | null
  onFile: (file: File) => void
  onRemove: () => void
  mode?: 'large' | 'compact'
}

function ImageDropZone({
  currentDataUrl,
  onFile,
  onRemove,
  mode = 'large',
}: ImageDropZoneProps) {
  const [over, setOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f && f.type.startsWith('image/')) onFile(f)
  }

  if (mode === 'compact') {
    return (
      <div className={s.imgBtnCompactWrap}>
        <button
          className={s.imgBtn}
          title={t('imgSetBg')}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setOver(true)
          }}
          onDragLeave={() => setOver(false)}
          onDrop={handleDrop}
          style={over ? { borderColor: 'var(--link)' } : undefined}
        >
          {currentDataUrl ?
            <img
              src={currentDataUrl}
              className={s.imgBtnThumb}
              draggable={false}
            />
          : <span>🖼️</span>}
        </button>
        {currentDataUrl && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            className={s.imgBtnRemove}
          >
            ✕
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className={shared.hidden}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onFile(f)
            e.target.value = ''
          }}
        />
      </div>
    )
  }

  return (
    <div>
      {currentDataUrl ?
        <div className={s.thumbRow}>
          <img src={currentDataUrl} className={s.thumb} draggable={false} />
          <span className={s.thumbInfo}>{t('appBgSet')}</span>
          <button
            onClick={() => fileRef.current?.click()}
            className={`${shared.btn} ${shared.btnAdd}`}
          >
            {t('imgChange')}
          </button>
          <button
            onClick={onRemove}
            className={`${shared.btn} ${shared.btnDanger}`}
          >
            {t('delete')}
          </button>
        </div>
      : <button
          className={`${s.dropZone} ${s.dropZoneLarge}${over ? ` ${s.dropZoneOver}` : ''}`}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setOver(true)
          }}
          onDragLeave={() => setOver(false)}
          onDrop={handleDrop}
        >
          {t('imgDrop')}
        </button>
      }
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className={shared.hidden}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
          e.target.value = ''
        }}
      />
    </div>
  )
}

// ── GameItemList ──────────────────────────────────────────────────
interface GameItemListProps {
  game: Game
  itemDnd: ReturnType<typeof useScopedDragSort>
  onUpdate: (taskId: string, key: string, val: unknown) => void
  onDelete: (iid: string) => void
  onAdd: (item: Task) => void
  showConfirm: (msg: string, fn: () => void, lbl: string) => void
}

function GameItemList({
  game,
  itemDnd,
  onUpdate,
  onDelete,
  onAdd,
  showConfirm,
}: GameItemListProps) {
  const allItems = game.items
  const btnRef = useRef<HTMLButtonElement>(null)
  const [addType, setAddType] = useState<TaskType | undefined>(undefined)
  const [pickerPos, setPickerPos] = useState<{ x: number; y: number } | null>(
    null
  )

  const handleAdd = (item: Task) => {
    onAdd(item)
    setAddType(undefined)
  }

  const handleDelete = (iid: string) => {
    const item = allItems.find((it) => it.id === iid)
    if (!item || item.type === EVENT) {
      onDelete(iid)
      return
    }
    const name = item.name?.trim() || t(`types.${item.type}`)
    showConfirm(t('deleteMsg', { name }), () => onDelete(iid), t('deleteBtn'))
  }

  const openPicker = () => {
    const r = btnRef.current?.getBoundingClientRect()
    if (r) setPickerPos({ x: r.left, y: r.bottom + 4 })
  }
  const closePicker = () => setPickerPos(null)

  const pickerItems: ContextMenuItem[] = ALL_TASK_TYPES.map((ty) => ({
    label: t(`types.${ty}`),
    onClick: () => {
      closePicker()
      setAddType(ty)
    },
  }))

  return (
    <>
      <AnimatePresence initial={false}>
        {allItems.map((item) => {
          const ti = allItems.indexOf(item)
          const dndProps = itemDnd.itemProps(game.id, ti)
          const dndStyle = {
            ...itemDnd.dropStyle(game.id, ti),
            opacity: itemDnd.isDragging(game.id, ti) ? 0.4 : 1,
          }
          return (
            <motion.div
              key={item.id}
              variants={taskItemVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className={shared.clipContents}
            >
              <TaskRow
                task={item}
                showDragHandle
                showDelete
                onDelete={handleDelete}
                dndProps={dndProps}
                dndStyle={dndStyle}
              >
                <TaskEdit item={item} onUpdate={onUpdate} />
              </TaskRow>
            </motion.div>
          )
        })}
      </AnimatePresence>
      {addType ?
        <TaskAddForm
          type={addType}
          game={game}
          onAdd={handleAdd}
          onCancel={() => setAddType(undefined)}
        />
      : <button
          ref={btnRef}
          onClick={openPicker}
          className={`${shared.btn} ${shared.btnAdd} ${s.addTaskBtn}`}
        >
          ＋{t('addTask')}
        </button>
      }
      <AnimatePresence>
        {pickerPos && (
          <ContextMenu
            key="type-picker"
            x={pickerPos.x}
            y={pickerPos.y}
            items={pickerItems}
            onClose={closePicker}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// ── SettingsModal ─────────────────────────────────────────────────
interface Prefs {
  sortUncheckedFirst: boolean
  autoDeleteExpired: boolean
  autoDeleteDays: number
}

interface SettingsModalProps {
  games: Game[]
  setGames: Dispatch<SetStateAction<Game[]>>
  onClose: () => void
  showConfirm: (msg: string, fn: () => void, lbl: string) => void
  refreshImages: () => void
  prefs: Prefs
  onPrefs: (key: string, val: unknown) => void
}

export function SettingsModal({
  games,
  setGames,
  onClose,
  showConfirm,
  refreshImages,
  prefs,
  onPrefs,
}: SettingsModalProps) {
  const [newGame, setNewGame] = useState({
    name: '',
    color: '#4a9eff' as HexColor,
    resetTime: localToUtcHHMM(asLocal('00:00')),
  })
  const [showNG, setShowNG] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)

  const { verState, checkVersion, doUpdate } = useAppUpdate()

  const [cropFile, setCropFile] = useState<File | null>(null)
  const [cropTarget, setCropTarget] = useState<string | null>(null)
  const [appBgThumb, setAppBgThumb] = useState<string | null>(null)
  const [gameBgThumbs, setGameBgThumbs] = useState<Record<string, string>>({})

  useEffect(() => {
    imgGet('app-bg').then((v) => setAppBgThumb(v?.dataUrl ?? null))
    games.forEach((g) =>
      imgGet(`game-${g.id}`).then((v) => {
        if (v) setGameBgThumbs((prev) => ({ ...prev, [g.id]: v.dataUrl }))
      })
    )
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const openCrop = (target: string, file: File) => {
    setCropTarget(target)
    setCropFile(file)
  }

  const handleCropConfirm = async (dataUrl: string, opacity: number) => {
    if (!cropTarget) return
    await imgSet(cropTarget, dataUrl, opacity)
    if (cropTarget === 'app-bg') {
      setAppBgThumb(dataUrl)
    } else {
      const id = cropTarget.replace('game-', '')
      setGameBgThumbs((prev) => ({ ...prev, [id]: dataUrl }))
    }
    setCropFile(null)
    setCropTarget(null)
    refreshImages()
  }

  const handleCropCancel = () => {
    setCropFile(null)
    setCropTarget(null)
  }

  const removeAppBg = async () => {
    await imgDelete('app-bg')
    setAppBgThumb(null)
    refreshImages()
  }
  const removeGameBg = async (gameId: string) => {
    await imgDelete(`game-${gameId}`)
    setGameBgThumbs((prev) => {
      const n = { ...prev }
      delete n[gameId]
      return n
    })
    refreshImages()
  }

  const handleExport = () => {
    const blob = new Blob([JSON.stringify({ games }, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob),
      a = document.createElement('a')
    a.href = url
    a.download = `daily-tracker-settings-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string)
        const imported: unknown[] = parsed.games ?? parsed
        if (!Array.isArray(imported)) throw new Error('invalid')
        const fresh = imported.map((g: unknown) => {
          const game = g as Game
          return {
            ...game,
            id: uid(),
            items: game.items.map((it) => ({ ...it, id: uid() })),
          }
        })
        showConfirm(
          t('importConfirm', { n: fresh.length }),
          () => setGames(fresh),
          t('loadBtn')
        )
      } catch {
        alert(t('importError'))
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const gameDnd = useDragSort(
    useCallback(
      (from, to) =>
        setGames((g) => {
          const a = [...g]
          const [it] = a.splice(from, 1)
          a.splice(to, 0, it)
          return a
        }),
      []
    )
  )

  const itemDnd = useScopedDragSort(
    useCallback(
      (gid, from, to) =>
        setGames((g) =>
          g.map((gm) => {
            if (gm.id !== gid) return gm
            const items = [...gm.items]
            const [it] = items.splice(from, 1)
            items.splice(to, 0, it)
            return { ...gm, items }
          })
        ),
      []
    )
  )

  const upGame = (id: string, f: string, v: unknown) =>
    setGames((g) => g.map((gm) => (gm.id === id ? { ...gm, [f]: v } : gm)))
  const delGame = (id: string, name: string) =>
    showConfirm(
      t('deleteMsg', { name }),
      async () => {
        await imgDelete(`game-${id}`)
        setGameBgThumbs((prev) => {
          const n = { ...prev }
          delete n[id]
          return n
        })
        setGames((g) => g.filter((gm) => gm.id !== id))
        refreshImages()
      },
      t('deleteBtn')
    )
  const addGame = () => {
    if (!newGame.name.trim()) return
    setGames((g) => [
      ...g,
      {
        id: uid(),
        name: newGame.name,
        color: newGame.color as HexColor,
        resetTime: newGame.resetTime,
        items: [],
      },
    ])
    setNewGame({
      name: '',
      color: '#4a9eff',
      resetTime: localToUtcHHMM(asLocal('00:00')),
    })
    setShowNG(false)
  }

  const upItem = (gid: string, taskId: string, key: string, val: unknown) =>
    setGames((g) =>
      g.map((gm) =>
        gm.id === gid ?
          {
            ...gm,
            items: gm.items.map((it) =>
              it.id === taskId ? { ...it, [key]: val } : it
            ),
          }
        : gm
      )
    )
  const delItem = (gid: string, iid: string) =>
    setGames((g) =>
      g.map((gm) =>
        gm.id === gid ?
          { ...gm, items: gm.items.filter((it) => it.id !== iid) }
        : gm
      )
    )

  // Narrow verState for template rendering
  const verStateObj =
    typeof verState === 'object' && verState !== null ? verState : null

  return (
    <>
      {cropFile && (
        <CropModal
          file={cropFile}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}

      <Modal
        title={`⚙️ ${t('settings')}`}
        titleExtra={
          <>
            <button
              onClick={handleExport}
              className={`${shared.btn} ${shared.btnAdd}`}
              title={t('exportSettings')}
            >
              📤
            </button>
            <button
              onClick={() => importRef.current?.click()}
              className={`${shared.btn} ${shared.btnAdd}`}
              title={t('importSettings')}
            >
              📥
            </button>
            <input
              ref={importRef}
              type="file"
              accept=".json,application/json"
              className={shared.hidden}
              onChange={handleImportFile}
            />
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
                initial="initial"
                animate="animate"
                exit="exit"
                className={shared.clipContents}
              >
                <div
                  className={s.gameItem}
                  style={{
                    ...gameDnd.dropStyle(gi),
                    border: `1px solid ${game.color}44`,
                  }}
                >
                  <div
                    {...gameDnd.itemProps(gi)}
                    className={s.gameHeaderRow}
                    style={{
                      borderBottom: `1px solid ${game.color}44`,
                      opacity: gameDnd.isDragging(gi) ? 0.4 : 1,
                      transition: 'opacity 0.15s',
                    }}
                  >
                    <div className={shared.handleSlot}>
                      <span className={shared.dragHandle}>⠿</span>
                    </div>
                    <div className={s.colorSlot}>
                      <input
                        type="color"
                        value={game.color}
                        onChange={(e) =>
                          upGame(game.id, 'color', e.target.value)
                        }
                        className={s.colorInput}
                      />
                    </div>
                    <div className={shared.taskWrapSlot}>
                      <div className={shared.taskLabelSlot}>
                        <input
                          value={game.name}
                          onChange={(e) =>
                            upGame(game.id, 'name', e.target.value)
                          }
                          onKeyDown={(e) =>
                            e.key === 'Enter' && e.currentTarget.blur()
                          }
                          className={`${s.gameName} ${shared.inputCls}`}
                          placeholder={t('gameName')}
                        />
                      </div>
                      <div className={shared.meta}>
                        <div className={s.gameResetGroup}>
                          <span className={s.resetLbl}>{t('resetLbl')}</span>
                          <input
                            type="time"
                            value={utcToLocalHHMM(game.resetTime)}
                            onChange={(e) =>
                              upGame(
                                game.id,
                                'resetTime',
                                localToUtcHHMM(asLocal(e.target.value))
                              )
                            }
                            className={`${shared.inputCls} ${s.resetTime}`}
                          />
                          <ImageDropZone
                            currentDataUrl={gameBgThumbs[game.id] || null}
                            onFile={(file) => openCrop(`game-${game.id}`, file)}
                            onRemove={() => removeGameBg(game.id)}
                            mode="compact"
                          />
                        </div>
                      </div>
                    </div>
                    <div className={shared.deleteSlot}>
                      <button
                        onClick={() => delGame(game.id, game.name)}
                        className={`${shared.btn} ${shared.btnDanger} ${shared.deleteBtn}`}
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <div className={s.gameBody}>
                    <GameItemList
                      game={game}
                      itemDnd={itemDnd}
                      onUpdate={(taskId, key, val) =>
                        upItem(game.id, taskId, key, val)
                      }
                      onDelete={(iid) => delItem(game.id, iid)}
                      onAdd={(item) =>
                        setGames((g) =>
                          g.map((gm) =>
                            gm.id === game.id ?
                              {
                                ...gm,
                                items: [
                                  ...gm.items,
                                  { ...item, id: uid() } as Task,
                                ],
                              }
                            : gm
                          )
                        )
                      }
                      showConfirm={showConfirm}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {showNG ?
              <motion.div
                key="newgame"
                initial={{ opacity: 0, height: 0 }}
                animate={{
                  opacity: 1,
                  height: 'auto',
                  transition: { duration: 0.18 },
                }}
                exit={{ opacity: 0, height: 0, transition: { duration: 0.14 } }}
                className={shared.clipContents}
              >
                <div className={s.newGameBox}>
                  <div className={s.newGameHeader}>
                    <input
                      type="color"
                      value={newGame.color}
                      onChange={(e) =>
                        setNewGame((g) => ({
                          ...g,
                          color: e.target.value as HexColor,
                        }))
                      }
                      className={s.colorInput}
                    />
                    <input
                      value={newGame.name}
                      onChange={(e) =>
                        setNewGame((g) => ({ ...g, name: e.target.value }))
                      }
                      onKeyDown={(e) => e.key === 'Enter' && addGame()}
                      className={`${shared.inputCls} ${shared.flexInput}`}
                      placeholder={t('gameName')}
                      autoFocus
                    />
                    <span className={s.resetLbl}>{t('resetLbl')}</span>
                    <input
                      type="time"
                      value={newGame.resetTime}
                      onChange={(e) =>
                        setNewGame((g) => ({
                          ...g,
                          resetTime: localToUtcHHMM(asLocal(e.target.value)),
                        }))
                      }
                      className={`${shared.inputCls} ${s.resetTime}`}
                    />
                  </div>
                  <div className={s.newGameActions}>
                    <button
                      onClick={addGame}
                      className={`${shared.btn} ${shared.btnConfirm}`}
                    >
                      {t('add')}
                    </button>
                    <button
                      onClick={() => setShowNG(false)}
                      className={shared.btn}
                    >
                      {t('cancel')}
                    </button>
                  </div>
                </div>
              </motion.div>
            : <motion.button
                key="addgamebtn"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.15 } }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                className={s.addGameBtn}
                onClick={() => setShowNG(true)}
              >
                {t('addGame')}
              </motion.button>
            }
          </AnimatePresence>

          <div className={s.listSeparator} />

          <div className={s.imgSection}>
            <div className={s.imgSectionTitle}>{t('appBgImage')}</div>
            <ImageDropZone
              currentDataUrl={appBgThumb}
              onFile={(file) => openCrop('app-bg', file)}
              onRemove={removeAppBg}
              mode="large"
            />
          </div>

          <div className={s.listSeparator} />

          <label className={s.prefRow}>
            <input
              type="checkbox"
              checked={prefs.sortUncheckedFirst}
              onChange={(e) => onPrefs('sortUncheckedFirst', e.target.checked)}
              className={s.prefCheck}
            />
            <span className={s.prefLabel}>{t('sortUncheckedFirst')}</span>
          </label>

          <label className={s.prefRow}>
            <input
              type="checkbox"
              checked={prefs.autoDeleteExpired}
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
            <span
              className={`${s.prefLabel}${!prefs.autoDeleteExpired ? ` ${s.prefDayDisabled}` : ''}`}
            >
              {t('autoDeleteDaysUnit')}
            </span>
          </label>

          <div className={s.listSeparator} />

          <div className={s.verPanel}>
            <div className={s.verPanelHeader}>
              <span className={s.verPanelTitle}>{t('verPanel')}</span>
              <button
                className={`${shared.btn} ${shared.btnAdd}`}
                onClick={checkVersion}
                disabled={
                  verState === 'checking'
                  || verState === 'updating'
                  || verState === 'reloading'
                }
              >
                {verState === 'checking' ? t('verChecking') : t('verCheck')}
              </button>
            </div>
            {verState && verState !== 'checking' && (
              <div className={s.verPanelBody}>
                {verState === 'error' ?
                  <span className={s.verError}>{t('verUnavail')}</span>
                : verState === 'updating' ?
                  <span className={s.verChecking}>⏳ {t('verUpdating')}</span>
                : verState === 'reloading' ?
                  <span className={s.verChecking}>🔄 {t('verReloading')}</span>
                : verStateObj ?
                  <>
                    <span className={s.verRow}>
                      <span className={s.verLbl}>{t('verCurrent')}</span>
                      <span className={s.verVal}>{verStateObj.current}</span>
                    </span>
                    <span className={s.verRow}>
                      <span className={s.verLbl}>{t('verLatest')}</span>
                      <span className={s.verVal}>{verStateObj.latest}</span>
                    </span>
                    {verStateObj.timedOut ?
                      <span className={s.verError}>{t('verUpdateFailed')}</span>
                    : verStateObj.hasUpdate ?
                      <button
                        className={`${shared.btn} ${shared.btnConfirm} ${s.verUpdateBtn}`}
                        onClick={doUpdate}
                      >
                        {t('verUpdate')}
                      </button>
                    : <span className={s.verUpToDate}>
                        ✓ {t('verUpToDate')}
                      </span>
                    }
                  </>
                : null}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </>
  )
}
