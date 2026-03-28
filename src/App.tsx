import { useState, useEffect, useCallback } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { flushSync } from 'react-dom'
import { AnimatePresence } from 'motion/react'
import { t } from './util/i18n'
import { DEFAULT_GAMES, DAILY, EVENT } from './constants'
import { loadAll, saveGames, saveChecks, utcToLocalGame } from './util/storage'
import {
  getPeriodKey,
  checkKey,
  playCheckSound,
  playAllDoneSound,
  msUntilTaskReset,
  calcAllDone,
} from './util/helpers'
import { useAppUpdate } from './util/useAppUpdate'
import { useAppSettings } from './util/useAppSettings'
import { ConfirmDialog } from './ui/UI'
import { GameCard } from './ui/GameCard'
import { SettingsModal } from './ui/Settings'
import { CalendarModal } from './ui/Calendar'
import type { Game, Task, DailyTask, ChecksMap, ConfirmState } from './types'
import s from './App.module.css'

export function App() {
  const [games, setGames] = useState<Game[] | null>(null)
  const [checks, setChecks] = useState<ChecksMap>({})
  const [now, setNow] = useState(new Date())
  const [showSettings, setShowSettings] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)

  const setSafeGames: Dispatch<SetStateAction<Game[]>> = (param) => {
    setGames((prev) => {
      const next = prev ?? []
      return typeof param === 'function' ? param(next) : param
    })
  }

  const { updateInfo, flashMsg, doUpdate, verState, checkVersion } =
    useAppUpdate()

  const {
    sortUncheckedFirst,
    setSortUncheckedFirst,
    autoDeleteExpired,
    setAutoDeleteExpired,
    autoDeleteDays,
    setAutoDeleteDays,
    collapsed,
    toggleCollapse,
    appBg,
    gameBgs,
    refreshImages,
  } = useAppSettings(games ?? [], setSafeGames, now)

  // Unified clock
  useEffect(() => {
    let minMs = 30_000
    ;(games ?? []).forEach((game) => {
      const taskItems = game.items.filter((it) => it.type !== EVENT)
      const tasks: Task[] =
        taskItems.length ? taskItems : (
          [
            {
              id: soloId(game),
              type: DAILY,
              name: '',
              resetTime: game.resetTime,
            } satisfies DailyTask,
          ]
        )
      tasks.forEach((task) => {
        const ms = msUntilTaskReset(task, game, now)
        if (ms > 0 && ms < minMs) minMs = ms
      })
    })
    const id = setTimeout(() => setNow(new Date()), minMs + 200)
    return () => clearTimeout(id)
  }, [now, games])

  useEffect(() => {
    const { games: loaded, checks: loadedChecks } = loadAll()
    setGames(loaded ?? DEFAULT_GAMES.map(utcToLocalGame))
    setChecks(loadedChecks)
  }, [])

  useEffect(() => {
    if (games !== null) saveGames(games)
  }, [games])

  const soloId = (game: Game): string => `${game.id}_solo`

  const makeSoloTask = (game: Game): DailyTask => ({
    id: soloId(game),
    type: DAILY,
    name: '',
    resetTime: game.resetTime,
  })

  const getDailyTasks = useCallback((game: Game): Task[] => {
    const dailyItems = game.items.filter((it) => it.type === DAILY)
    return dailyItems.length ? dailyItems : [makeSoloTask(game)]
  }, [])

  const isAllDone = useCallback(
    (game: Game) => calcAllDone(game, checks, now, soloId(game)),
    [checks, now]
  )

  const toggle = useCallback(
    (game: Game, taskId: string | null, isMaster = false) => {
      let sound: 'allDone' | 'check' | null = null
      const applyUpdates = () => {
        flushSync(() => {
          setChecks((prev) => {
            const next = { ...prev }
            const dailyTasks = getDailyTasks(game)
            const allItems = game.items
            const allTasks: Task[] =
              allItems.length ? allItems : [makeSoloTask(game)]
            if (isMaster) {
              const allDone = dailyTasks.every(
                (tk) => prev[checkKey(tk.id, getPeriodKey(tk, game, now))]
              )
              dailyTasks.forEach((tk) => {
                next[checkKey(tk.id, getPeriodKey(tk, game, now))] = !allDone
              })
              sound = !allDone ? 'allDone' : 'check'
            } else {
              const task = allTasks.find((tk) => tk.id === taskId)
              if (!task) return prev
              const k = checkKey(task.id, getPeriodKey(task, game, now))
              const was = prev[k]
              next[k] = !was
              if (!was)
                sound =
                  calcAllDone(game, next, now, soloId(game)) ? 'allDone' : (
                    'check'
                  )
            }
            saveChecks(next)
            return next
          })
        })
        if (sound === 'allDone') playAllDoneSound()
        else if (sound === 'check') playCheckSound()
      }
      if (document.startViewTransition)
        document.startViewTransition(applyUpdates)
      else applyUpdates()
    },
    [now, getDailyTasks]
  )

  const showConfirm = (msg: string, fn: () => void, lbl: string) =>
    setConfirm({ message: msg, onConfirm: fn, confirmLabel: lbl })

  const addItem = useCallback((gameId: string, item: Task) => {
    setSafeGames((prev) =>
      prev.map((g) =>
        g.id === gameId ? { ...g, items: [...g.items, item] } : g
      )
    )
  }, [])

  const deleteItem = useCallback((gameId: string, itemId: string) => {
    setSafeGames((prev) =>
      prev.map((g) =>
        g.id === gameId ?
          { ...g, items: g.items.filter((it) => it.id !== itemId) }
        : g
      )
    )
  }, [])

  const editItem = useCallback(
    (gameId: string, itemId: string, updates: Partial<Task>) => {
      setSafeGames((prev) =>
        prev.map((g) =>
          g.id === gameId ?
            {
              ...g,
              items: g.items.map((it) =>
                it.id === itemId ? ({ ...it, ...updates } as Task) : it
              ),
            }
          : g
        )
      )
    },
    []
  )

  if (games === null) return <div className={s.loading}>{t('loading')}</div>

  return (
    <div className={`${s.root}${!appBg ? ` ${s.rootNoBg}` : ''}`}>
      {appBg && (
        <div
          className={s.appBgImg}
          style={{ backgroundImage: `url(${appBg})` }}
        />
      )}
      {appBg && <div className={s.appBgOverlay} />}

      {flashMsg && <div className={s.flashToast}>{flashMsg}</div>}

      {/* WCO (Window Controls Overlay) titlebar.
         Visibility is controlled entirely by CSS @media (display-mode: window-controls-overlay)
         in App.module.css. Both header elements are always rendered; CSS picks which one to show.
         This avoids JS startup timing issues where wco.visible and matchMedia can both return
         a wrong value for several seconds after PWA launch before the browser settles. */}
      <div className={s.wcoBar}>
        <img src="./icon-192.png" className={s.wcoIcon} alt="" />
        <span className={s.wcoTitle}>{t('appTitle')}</span>
        <span className={s.wcoClock}>
          {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        {updateInfo && (
          <button
            onClick={() =>
              showConfirm(
                t('updateMsg', {
                  current: updateInfo.current,
                  next: updateInfo.next,
                }),
                doUpdate,
                t('updateBtn')
              )
            }
            className={s.wcoBtn}
            title={t('updateAvail')}
          >
            ⬆️
          </button>
        )}
        <button
          onClick={() => setShowCalendar(true)}
          className={s.wcoBtn}
          title={t('record')}
        >
          📅
        </button>
        <button
          onClick={() => setShowSettings(true)}
          className={s.wcoBtn}
          title={t('settings')}
        >
          ⚙️
        </button>
      </div>

      {/* Standard header — hidden via CSS when display-mode is window-controls-overlay */}
      <header className={s.header}>
        <div className={s.headerInner}>
          <div className={s.headerLeft}>
            <span className={s.title}>{t('appTitle')}</span>
            <span className={s.clock}>
              {now.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          <div className={s.actions}>
            {updateInfo && (
              <button
                onClick={() =>
                  showConfirm(
                    t('updateMsg', {
                      current: updateInfo.current,
                      next: updateInfo.next,
                    }),
                    doUpdate,
                    t('updateBtn')
                  )
                }
                className={s.btnUpdate}
                title={t('updateAvail')}
              >
                ⬆️
              </button>
            )}
            <button
              onClick={() => setShowCalendar(true)}
              className={s.btnRecord}
              title={t('record')}
            >
              📅
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className={s.btnSettings}
              title={t('settings')}
            >
              ⚙️
            </button>
          </div>
        </div>
      </header>

      {/* Spacer below the WCO bar — hidden via CSS when not in WCO mode */}
      <div className={s.wcoOffset} />

      <main className={s.main}>
        <AnimatePresence mode="popLayout" initial={false}>
          {(sortUncheckedFirst ?
            [...games].sort(
              (a, b) => (isAllDone(a) ? 1 : 0) - (isAllDone(b) ? 1 : 0)
            )
          : games
          ).map((game) => (
            <GameCard
              key={`game-${game.id}`}
              game={game}
              checks={checks}
              now={now}
              onToggle={toggle}
              allDone={isAllDone(game)}
              dailyTasks={getDailyTasks(game)}
              collapsed={collapsed.has(game.id)}
              onToggleCollapse={toggleCollapse}
              bgDataUrl={gameBgs[game.id]?.dataUrl || null}
              bgOpacity={gameBgs[game.id]?.opacity ?? 0.5}
              onAddItem={addItem}
              onDeleteItem={deleteItem}
              onEditItem={editItem}
              showConfirm={showConfirm}
            />
          ))}
        </AnimatePresence>
        {games.length === 0 && <div className={s.noGames}>{t('noGames')}</div>}
      </main>

      <AnimatePresence>
        {showSettings && (
          <SettingsModal
            key="settings"
            games={games}
            setGames={setSafeGames}
            checks={checks}
            setChecks={setChecks}
            onClose={() => setShowSettings(false)}
            showConfirm={showConfirm}
            refreshImages={refreshImages}
            prefs={{ sortUncheckedFirst, autoDeleteExpired, autoDeleteDays }}
            onPrefs={(key, val) =>
              (
                ({
                  sortUncheckedFirst: setSortUncheckedFirst,
                  autoDeleteExpired: setAutoDeleteExpired,
                  autoDeleteDays: setAutoDeleteDays,
                }) as Record<string, (v: unknown) => void>
              )[key]?.(val)
            }
            verState={verState}
            checkVersion={checkVersion}
            doUpdate={doUpdate}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showCalendar && (
          <CalendarModal
            key="calendar"
            games={games}
            checks={checks}
            now={now}
            onClose={() => setShowCalendar(false)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {confirm && (
          <ConfirmDialog
            key="confirm"
            message={confirm.message}
            confirmLabel={confirm.confirmLabel}
            onConfirm={() => {
              confirm.onConfirm()
              setConfirm(null)
            }}
            onCancel={() => setConfirm(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
